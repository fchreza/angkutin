import { DeleteObjectsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { listings, listingImages } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ok, gagal } from "@/lib/api";
import { BUCKET, keyFoto, s3, s3Siap, urlPublik } from "@/lib/s3";
import { periksaAkses, bolehKelolaBarang } from "@/lib/lapak";
import { kompresDiServer } from "@/lib/compress-image";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/v1/listings/:id/images — unggah 1-3 foto (multipart/form-data).
 *
 * Dipisah dari POST /api/v1/listings supaya listing tetap sah walau salah
 * satu foto gagal diunggah, dan supaya body request tidak melewati batas
 * Vercel (4.5 MB).
 *
 * Alur ukuran:
 *   - Klien sudah mengompresi (< 500 KB, WebP) — jalur normal, server hanya
 *     meneruskan.
 *   - Kalau klien gagal mengompresi atau mengunggah lewat API langsung,
 *     server mengompresi ulang dengan sharp (jaring pengaman).
 */
const MAKS_FOTO = 3;
const MAKS_BYTE = 500 * 1024; // 500 KB — batas setelah kompresi klien
/**
 * Batas berkas mentah. Vercel menolak body request di atas 4,5 MB SEBELUM
 * kode ini dijalankan (respons 413 tanpa pesan), jadi batas di sini dibuat
 * sedikit di bawahnya. Kalau nilainya lebih besar, pengguna hanya melihat
 * "413 Payload Too Large" tanpa penjelasan — bukan pesan Bahasa Indonesia.
 */
const MAKS_BYTE_MENTAH = 4 * 1024 * 1024; // 4 MB
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

    // Otorisasi terpusat (lib/lapak.ts) — menerima token lapak maupun token
    // barang. `bolehKelolaBarang` memastikan token lapak tidak bisa menambah
    // foto ke barang milik lapak lain.
    const akses = await periksaAkses(id, token);
    if (!akses || !(await bolehKelolaBarang(akses, id))) {
      // 404, bukan 403 — mencegah enumerasi (PRD §FR-4 ENHANCED)
      return gagal("Tautan pengelolaan tidak valid atau sudah kedaluwarsa", 404);
    }

    // Kumpulkan file baru
    const berkas = form
      .getAll("images")
      .filter((v): v is File => typeof v !== "string" && v instanceof File);

    /**
     * `keep` = daftar URL foto LAMA yang harus dipertahankan, URUT sesuai
     * keinginan penjual. Dipakai halaman kelola untuk menghapus, menambah,
     * atau mengubah urutan foto tanpa memilih ulang semuanya.
     *
     * Cara kerjanya: daftar final = keep (urutannya dihormati) + berkas baru
     * di belakang. Semua yang tidak ada di daftar final dihapus dari storage.
     *
     * Kalau `keep` tidak dikirim (alur form pasang), semua foto lama dibuang —
     * perilaku lama tetap terjaga.
     */
    const keep = form
      .getAll("keep")
      .filter((v): v is string => typeof v === "string" && v.length > 0);

    if (berkas.length === 0 && keep.length === 0) {
      return gagal("Pilih minimal 1 foto.", 400);
    }
    if (keep.length + berkas.length > MAKS_FOTO) {
      return gagal(`Maksimal ${MAKS_FOTO} foto per listing.`, 400);
    }

    // Baru sekarang cek storage — sudah terautentikasi, jadi aman memberi tahu.
    if (!s3Siap) {
      return gagal("Penyimpanan foto belum dikonfigurasi.", 503);
    }

    // Foto lama yang benar-benar dimiliki listing ini. URL di luar daftar ini
    // ditolak, supaya penjual tidak bisa menyisipkan URL sembarangan ke dalam
    // listingnya (dan supaya tidak ada yang bisa menghapus objek milik orang
    // lain dengan menebak URL-nya).
    const lama = await db
      .select({ imageUrl: listingImages.imageUrl })
      .from(listingImages)
      .where(eq(listingImages.listingId, id));

    const urlSah = new Set(lama.map((f) => f.imageUrl));
    const keepSah = keep.filter((u) => urlSah.has(u));

    if (keep.length !== keepSah.length) {
      return gagal("Ada foto yang tidak dikenal pada listing ini.", 400);
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
      if (f.size > MAKS_BYTE_MENTAH) {
        const mb = (f.size / 1024 / 1024).toFixed(1);
        return gagal(
          `Foto ${i + 1} berukuran ${mb} MB, maksimal 4 MB. ` +
            `Kompresi otomatis di perangkat gagal; coba pilih ulang fotonya.`,
          400,
        );
      }
    }

    // Unggah SEMUA foto baru dulu. Baru setelah semuanya berhasil,
    // tukar baris DB-nya.
    //
    // VERSI BARU untuk setiap unggahan: key lama memakai pola `{urutan}.webp`
    // dengan header `immutable`, sehingga mengganti foto membuat browser terus
    // menampilkan foto LAMA dari cache. Dengan versi, URL-nya berubah setiap
    // kali foto diganti.
    const versi = randomBytes(4).toString("hex");
    const hasil: { image_url: string; display_order: number }[] = [];

    // Foto lama yang dipertahankan lebih dulu (urutannya dihormati penjual),
    // baru berkas baru di belakang.
    keepSah.forEach((url, i) => {
      hasil.push({ image_url: url, display_order: i });
    });

    let adaKompresServer = false;
    const offset = keepSah.length;

    for (let i = 0; i < berkas.length; i++) {
      const f = berkas[i];
      const key = keyFoto(id, offset + i, versi);
      let buf = Buffer.from(await f.arrayBuffer());
      let tipe = f.type;

      // Jalur normal: klien sudah mengompresi di bawah 500 KB.
      // Kalau belum, server mengompresi ulang — supaya storage tidak
      // kemasukan foto besar dan halaman tetap ringan.
      if (buf.length > MAKS_BYTE) {
        const k = await kompresDiServer(buf);
        buf = Buffer.from(k.buf);
        tipe = k.tipe;
        adaKompresServer = true;
      }

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: buf,
          ContentType: tipe,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );

      hasil.push({ image_url: urlPublik(key), display_order: offset + i });
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

    return ok({ id, images: hasil, dikompres_server: adaKompresServer }, 201);
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
