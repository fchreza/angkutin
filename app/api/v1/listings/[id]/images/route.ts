import { DeleteObjectsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/db";
import { listings, listingImages } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ok, gagal } from "@/lib/api";
import { BUCKET, keyFoto, s3, s3Siap, urlPublik } from "@/lib/s3";
import { tokenCocok } from "@/lib/token";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/v1/listings/:id/images — unggah 1-3 foto (multipart/form-data).
 *
 * Dipisah dari POST /api/v1/listings supaya listing tetap sah walau salah
 * satu foto gagal diunggah, dan supaya body request tidak melewati batas
 * Vercel (4.5 MB).
 *
 * Foto WAJIB sudah dikompresi di klien (< 500 KB, WebP) — server tidak
 * mengompresi lagi, hanya memvalidasi ukuran & tipe.
 */
const MAKS_FOTO = 3;
const MAKS_BYTE = 500 * 1024; // 500 KB
const TIPE_DIIZINKAN = new Set([
  "image/webp",
  "image/jpeg",
  "image/png",
  "image/avif",
]);

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;

    // Token wajib: hanya pembuat listing yang boleh menambah foto.
    // Urutan penting: otorisasi DULU, baru cek konfigurasi storage.
    // Kalau dibalik, orang tanpa token bisa tahu status konfigurasi server.
    const form = await req.formData();
    const token = String(form.get("token") ?? "");

    const [row] = await db
      .select({ id: listings.id, secretToken: listings.secretToken })
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);

    if (!row) return gagal("Tautan pengelolaan tidak valid atau sudah kedaluwarsa", 404);
    if (!tokenCocok(token, row.secretToken)) {
      // 404, bukan 403 — mencegah enumerasi (PRD §FR-4 ENHANCED)
      return gagal("Tautan pengelolaan tidak valid atau sudah kedaluwarsa", 404);
    }

    // Kumpulkan file
    const berkas = form
      .getAll("images")
      .filter((v): v is File => typeof v !== "string" && v instanceof File);

    if (berkas.length === 0) return gagal("Pilih minimal 1 foto.", 400);
    if (berkas.length > MAKS_FOTO)
      return gagal(`Maksimal ${MAKS_FOTO} foto per listing.`, 400);

    // Baru sekarang cek storage — sudah terautentikasi, jadi aman memberi tahu.
    if (!s3Siap) {
      return gagal("Penyimpanan foto belum dikonfigurasi.", 503);
    }

    // Validasi SEMUA berkas dulu, sebelum menyentuh apa pun.
    // Kalau validasi dilakukan sambil mengunggah, foto ke-3 yang ditolak akan
    // membuat foto ke-1 dan ke-2 sudah terunggah sementara baris DB sudah
    // terhapus — hasilnya foto yatim di storage.
    for (let i = 0; i < berkas.length; i++) {
      const f = berkas[i];
      if (!TIPE_DIIZINKAN.has(f.type)) {
        return gagal(`Foto ${i + 1}: format harus WebP atau JPEG.`, 400);
      }
      if (f.size > MAKS_BYTE) {
        const kb = Math.round(f.size / 1024);
        return gagal(
          `Foto ${i + 1} berukuran ${kb} KB — maksimal 500 KB setelah kompresi.`,
          400,
        );
      }
    }

    // Foto lama: ambil daftarnya untuk dibersihkan dari storage.
    const lama = await db
      .select({ imageUrl: listingImages.imageUrl })
      .from(listingImages)
      .where(eq(listingImages.listingId, id));

    // Unggah SEMUA foto baru dulu. Baru setelah semuanya berhasil,
    // tukar baris DB-nya.
    const hasil: { image_url: string; display_order: number }[] = [];

    for (let i = 0; i < berkas.length; i++) {
      const f = berkas[i];
      const key = keyFoto(id, i);
      const buf = Buffer.from(await f.arrayBuffer());

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: buf,
          ContentType: f.type,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );

      hasil.push({ image_url: urlPublik(key), display_order: i });
    }

    // Tukar baris: hapus lama, isi baru.
    await db.delete(listingImages).where(eq(listingImages.listingId, id));
    await db.insert(listingImages).values(
      hasil.map((h) => ({
        listingId: id,
        imageUrl: h.image_url,
        displayOrder: h.display_order,
      })),
    );

    // Bersihkan foto lama yang sudah tidak dipakai dari storage.
    // Contoh: sebelumnya 3 foto, sekarang 2 -> foto ke-3 jadi yatim.
    // Dibuang setelah baris DB aman, dan kegagalannya tidak fatal.
    const dipakai = new Set(hasil.map((h) => h.image_url));
    const sisa = lama
      .map((f) => {
        if (dipakai.has(f.imageUrl)) return null;
        const m = f.imageUrl.split(`/${BUCKET}/`);
        return m.length === 2 ? m[1] : null;
      })
      .filter((k): k is string => Boolean(k));

    if (sisa.length > 0) {
      try {
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: BUCKET,
            Delete: { Objects: sisa.map((Key) => ({ Key })) },
          }),
        );
      } catch (err) {
        console.error("[images] gagal hapus foto lama di storage:", err);
      }
    }

    return ok({ id, images: hasil }, 201);
  } catch (e) {
    console.error("[images POST] gagal:", e);
    return gagal("Gagal mengunggah foto. Coba lagi.", 500);
  }
}

/** GET — daftar foto sebuah listing (dipakai live preview di form). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const foto = await db
      .select({
        image_url: listingImages.imageUrl,
        display_order: listingImages.displayOrder,
      })
      .from(listingImages)
      .where(and(eq(listingImages.listingId, id)));
    return ok({ data: foto });
  } catch (e) {
    console.error("[images GET] gagal:", e);
    return gagal("Gagal memuat foto.", 500);
  }
}
