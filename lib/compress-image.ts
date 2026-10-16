import sharp from "sharp";

/**
 * Normalisasi gambar sisi server.
 *
 * Kompresi klien menghemat kuota, tetapi tidak dipercaya sebagai pemeriksaan
 * keamanan: semua unggahan tetap didekode dan dikodekan ulang menjadi WebP di
 * server. Ini menolak file palsu/rusak, membatasi decompression bomb, dan
 * membuang metadata sensitif seperti koordinat GPS EXIF.
 */
const SISI_MAKS = 1080;
const BYTE_MAKS = 1024 * 1024;
const PIXEL_MAKS = 40_000_000;
const KUALITAS = [82, 74, 66, 58, 50];

export type HasilKompres = {
  buf: Buffer;
  tipe: "image/webp";
  lebar: number;
  tinggi: number;
  byteAsli: number;
};

const opsiBaca = {
  failOn: "error" as const,
  limitInputPixels: PIXEL_MAKS,
  sequentialRead: true,
};

function mimeTerdeteksi(format?: string, compression?: string): string | null {
  if (format === "jpeg") return "image/jpeg";
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  // Sharp melaporkan container AVIF sebagai HEIF dengan codec AV1.
  if (format === "heif" && compression === "av1") return "image/avif";
  return null;
}

/**
 * Kompres satu gambar. `tipeDeklarasi` dibandingkan dengan format yang
 * benar-benar terdeteksi dari bytes; MIME dari browser sendiri tidak dipercaya.
 */
export async function kompresDiServer(
  buf: Buffer,
  tipeDeklarasi: string,
): Promise<HasilKompres> {
  const meta = await sharp(buf, opsiBaca).metadata();
  const tipeAsli = mimeTerdeteksi(meta.format, meta.compression);

  if (!tipeAsli || tipeAsli !== tipeDeklarasi) {
    throw new Error("Format gambar tidak valid atau tidak cocok dengan MIME.");
  }
  if (!meta.width || !meta.height || meta.width * meta.height > PIXEL_MAKS) {
    throw new Error("Dimensi gambar tidak valid atau terlalu besar.");
  }

  const proses = (maksSisi: number, kualitas: number) =>
    sharp(buf, opsiBaca)
      .rotate()
      .resize({
        width: maksSisi,
        height: maksSisi,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: kualitas })
      .toBuffer();

  let out: Buffer | undefined;
  for (const q of KUALITAS) {
    out = await proses(SISI_MAKS, q);
    if (out.length <= BYTE_MAKS) break;
  }

  // Turunkan resolusi hanya bila foto sangat detail masih melewati batas.
  if (!out || out.length > BYTE_MAKS) {
    for (const [sisi, kualitas] of [[800, 48], [640, 42], [480, 36]] as const) {
      out = await proses(sisi, kualitas);
      if (out.length <= BYTE_MAKS) break;
    }
  }

  if (!out || out.length > BYTE_MAKS) {
    throw new Error("Gambar tidak dapat dikompresi ke ukuran yang diizinkan.");
  }

  const hasilMeta = await sharp(out, opsiBaca).metadata();
  return {
    buf: out,
    tipe: "image/webp",
    lebar: hasilMeta.width ?? 0,
    tinggi: hasilMeta.height ?? 0,
    byteAsli: buf.length,
  };
}
