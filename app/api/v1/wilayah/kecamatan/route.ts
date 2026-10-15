import { NextRequest } from "next/server";
import { ok, gagal } from "@/lib/api";
import { kecamatanKabupaten } from "@/lib/wilayah-server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/wilayah/kecamatan?regency=34.04
 *
 * Daftar kecamatan di satu kabupaten/kota, LENGKAP DENGAN KODE ASLI BPS.
 *
 * KENAPA LEWAT SERVER, BUKAN BERKAS DI BROWSER:
 * Kode kecamatan tidak bisa diturunkan dari urutan. 70 dari 514 kabupaten
 * punya kode yang melompat (mis. Aceh Tengah: 11.04.07, 11.04.08, 11.04.10)
 * karena pemekaran wilayah. Kalau browser menebak kode dari posisi, kiriman
 * yang sah akan ditolak server.
 *
 * Dulu dicoba: mengirim seluruh 7.285 kecamatan (111 KB) ke browser. Sekarang
 * diganti permintaan per kabupaten (~0,5 KB) yang hanya terjadi saat pengguna
 * memilih kabupaten di form pasang. Hasilnya: bundel lebih kecil, tidak ada
 * data ganda, dan kode dijamin sama dengan yang dipakai validasi.
 */
export async function GET(req: NextRequest) {
  try {
    const regency = req.nextUrl.searchParams.get("regency");

    if (!regency) {
      return gagal("Parameter regency wajib diisi.", 400);
    }

    const data = kecamatanKabupaten(regency);

    if (data.length === 0) {
      // Kabupaten tidak ada di direktori. Dibalas 200 dengan daftar kosong
      // supaya pemilih di form bisa menampilkan pesan yang tepat, bukan error.
      return ok({ data: [], regency, ditemukan: false });
    }

    return ok({ data, regency, ditemukan: true });
  } catch (e) {
    logger.error("[wilayah/kecamatan] gagal:", e);
    return gagal("Gagal memuat daftar kecamatan.", 500);
  }
}
