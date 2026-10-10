import sharp from "sharp";

/**
 * Kompresi foto di sisi SERVER — jaring pengaman.
 *
 * Kompresi utama tetap dilakukan di perangkat pengguna (Canvas API) supaya
 * unggahan hemat kuota. Fungsi ini menangkap kasus:
 *   - browser lama/tidak mendukung WebP,
 *   - pengguna mengunggah lewat API langsung (bukan form),
 *   - Canvas gagal senyap dan mengirim file asli.
 *
 * Tanpa ini, foto 4 MB dari kamera HP bisa masuk ke storage dan membuat
 * halaman detail berat saat dibuka di jaringan lambat.
 *
 * Keluaran SELALU WebP (konsisten dengan key `listings/{id}/{n}.webp`),
 * orientasi EXIF sudah diterapkan supaya foto tidak tampil miring.
 */

const SISI_MAKS = 1080;
const BYTE_MAKS = 500 * 1024; // 500 KB
const KUALITAS = [82, 74, 66, 58, 50];

export type HasilKompres = {
  buf: Buffer;
  tipe: string;
  /** Lebar/tinggi akhir — berguna untuk log & pengujian. */
  lebar: number;
  tinggi: number;
  /** Ukuran sebelum dikompresi. */
  byteAsli: number;
};

/** Bangun pipeline sharp dari buffer. Dipisah supaya bisa dipakai berulang. */
const pipeline = (buf: Buffer) =>
  sharp(buf, { failOn: "none" }).rotate(); // rotate() tanpa argumen = ikuti EXIF

/**
 * Kompres satu gambar. Melempar error kalau berkasnya bukan gambar yang
 * bisa dibaca — pemanggil mengubahnya jadi respons 400.
 */
export async function kompresDiServer(buf: Buffer): Promise<HasilKompres> {
  const meta = await sharp(buf, { failOn: "none" }).metadata();

  if (!meta.width || !meta.height) {
    throw new Error("Dimensi gambar tidak terbaca");
  }

  const perluKecilkan = meta.width > SISI_MAKS || meta.height > SISI_MAKS;

  // Coba turunkan kualitas bertahap pada ukuran maksimal dulu.
  for (const q of KUALITAS) {
    let p = pipeline(buf);
    if (perluKecilkan) {
      p = p.resize({
        width: SISI_MAKS,
        height: SISI_MAKS,
        fit: "inside",
        withoutEnlargement: true,
      });
    }
    const out = await p.webp({ quality: q }).toBuffer();
    if (out.length <= BYTE_MAKS) {
      const m = await sharp(out).metadata();
      return {
        buf: out,
        tipe: "image/webp",
        lebar: m.width ?? 0,
        tinggi: m.height ?? 0,
        byteAsli: buf.length,
      };
    }
  }

  // Masih terlalu besar (mis. foto sangat detail): kecilkan dimensinya.
  const out = await pipeline(buf)
    .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 55 })
    .toBuffer();

  const m = await sharp(out).metadata();
  return {
    buf: out,
    tipe: "image/webp",
    lebar: m.width ?? 0,
    tinggi: m.height ?? 0,
    byteAsli: buf.length,
  };
}
