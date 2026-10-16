import sharp from "sharp";
import { db } from "@/db";
import { listingImages } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * GET /listing/:id/og — gambar untuk kartu link (Open Graph).
 *
 * KENAPA HARUS ADA ENDPOINT SENDIRI:
 * Foto listing disimpan sebagai WebP, dan ukurannya boleh sampai 1 MB.
 * WhatsApp menolak gambar di atas ~300 KB, dan WebP termasuk format yang paling
 * sering gagal dirender oleh pengurai link mereka. Akibatnya link listing yang
 * dibagikan ke WhatsApp tampil tanpa gambar sama sekali — padahal WhatsApp
 * justru kanal utama aplikasi ini (FR-5).
 *
 * Endpoint ini menyajikan ulang foto pertama sebagai JPEG ukuran kartu sosial
 * (1200x630) yang sudah dipastikan kecil, jadi pembagian link selalu
 * memunculkan gambar.
 *
 * Kalau foto tidak ada atau pengolahan gagal, kembalikan 404 supaya crawler
 * memakai og:image bawaan situs — lebih baik daripada gambar rusak.
 */

// sharp butuh runtime Node, bukan Edge.
export const runtime = "nodejs";

/**
 * Batas aman. WhatsApp mulai tidak dapat diandalkan di atas ~300 KB, jadi
 * target kita 200 KB dan kualitas diturunkan bertahap sampai masuk.
 */
const BATAS_BYTE = 200 * 1024;
const LEBAR = 1200;
const TINGGI = 630;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return new Response(null, { status: 404 });
    }

    const [foto] = await db
      .select({ imageUrl: listingImages.imageUrl })
      .from(listingImages)
      .where(eq(listingImages.listingId, id))
      .orderBy(asc(listingImages.displayOrder))
      .limit(1);

    if (!foto) return new Response(null, { status: 404 });

    const asal = await fetch(foto.imageUrl, { cache: "no-store" });
    if (!asal.ok) return new Response(null, { status: 404 });
    const buf = Buffer.from(await asal.arrayBuffer());

    // Kartu sosial itu lanskap, sedangkan foto barang persegi. `cover` dengan
    // posisi tengah memotong bagian atas/bawah — bagian tengah foto hampir
    // selalu berisi barangnya, jadi ini pilihan yang paling aman.
    let kualitas = 82;
    let keluaran = await sharp(buf)
      .resize(LEBAR, TINGGI, { fit: "cover", position: "centre" })
      .jpeg({ quality: kualitas, progressive: true, mozjpeg: true })
      .toBuffer();

    // Turunkan kualitas bertahap sampai masuk batas. Maksimal 3 kali supaya
    // tidak memakan waktu permintaan.
    for (let i = 0; i < 3 && keluaran.length > BATAS_BYTE; i++) {
      kualitas -= 14;
      if (kualitas < 40) break;
      keluaran = await sharp(buf)
        .resize(LEBAR, TINGGI, { fit: "cover", position: "centre" })
        .jpeg({ quality: kualitas, progressive: true, mozjpeg: true })
        .toBuffer();
    }

    return new Response(new Uint8Array(keluaran), {
      headers: {
        "content-type": "image/jpeg",
        "content-length": String(keluaran.length),
        // Kartu link di-cache lama oleh crawler; isinya jarang berubah.
        "cache-control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch (e) {
    logger.error("[og image] gagal:", e);
    return new Response(null, { status: 404 });
  }
}
