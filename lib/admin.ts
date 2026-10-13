import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * Akses halaman admin.
 *
 * KENAPA SANDI DI ENV, bukan di database: hanya ada satu orang yang perlu
 * masuk, dan menyimpannya di database berarti menambah tabel, halaman
 * pengaturan, dan alur ubah sandi — semuanya untuk satu pengguna. Variabel
 * lingkungan sudah cukup dan tidak bisa dibaca dari luar.
 *
 * KENAPA GAGAL-TERTUTUP: kalau `ADMIN_PASS` belum diisi, seluruh halaman
 * admin menolak akses. Alternatifnya adalah membuka akses saat sandi belum
 * disetel, dan itu berarti setiap kali ada kesalahan konfigurasi, data
 * kunjungan terbuka untuk umum. Menolak lebih aman daripada membuka.
 */

export const NAMA_COOKIE = "angkutin_admin";

/** Panjang minimum sandi. Sandi pendek bisa ditebak dalam hitungan detik. */
export const MIN_SANDI = 8;

function sandi() {
  return process.env.ADMIN_PASS?.trim() || null;
}

/** Apakah halaman admin sudah dikonfigurasi? */
export function adminSiap(): boolean {
  return (sandi()?.length ?? 0) >= MIN_SANDI;
}

/**
 * Nilai cookie sesi.
 *
 * Dihitung dari sandi, jadi tidak ada state yang perlu disimpan di server.
 * Tanpa mengetahui sandinya, nilai ini tidak bisa dihitung. Mengubah sandi
 * otomatis membatalkan semua sesi lama, dan itu perilaku yang diinginkan.
 */
function nilaiSesi(): string | null {
  const s = sandi();
  if (!s) return null;
  return createHmac("sha256", s).update("angkutin-admin-v1").digest("hex");
}

/** Bandingkan dua teks dengan waktu tetap (tidak bocor lewat durasi). */
function samaAman(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Periksa sandi yang dimasukkan pengguna. */
export function periksaSandi(masukan: string): boolean {
  const s = sandi();
  if (!s || s.length < MIN_SANDI) return false;
  return samaAman(masukan, s);
}

/** Apakah permintaan ini sudah punya sesi admin yang sah? */
export async function sudahMasuk(): Promise<boolean> {
  const harapan = nilaiSesi();
  if (!harapan) return false;
  const jar = await cookies();
  const nilai = jar.get(NAMA_COOKIE)?.value;
  if (!nilai) return false;
  return samaAman(nilai, harapan);
}

/** Nilai cookie yang harus dipasang setelah sandi benar. */
export function cookieSesi(): string | null {
  return nilaiSesi();
}
