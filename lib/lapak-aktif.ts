"use client";

/**
 * Lapak aktif di perangkat ini.
 *
 * KENAPA DISIMPAN DI BROWSER:
 * Produk ini tanpa pendaftaran, jadi tidak ada cara lain mengingat "lapak mana
 * yang sedang dipakai" selain menyimpannya di perangkat. Yang disimpan adalah
 * token lapak itu sendiri — sama seperti penjual menyimpan tautannya di
 * catatan, hanya saja otomatis.
 *
 * RISIKO YANG HARUS DISADARI (dan sudah diperkecil):
 * Token di localStorage bisa dicuri kalau ada celah XSS di halaman ini. Dua hal
 * yang memperkecil risikonya:
 *   1. Token lapak hanya memberi akses ke lapak itu sendiri, bukan ke seluruh
 *      sistem. Kalau bocor, yang terdampak hanya barang milik penjual itu.
 *   2. Aplikasi ini tidak pernah menampilkan HTML dari pengguna. Judul dan
 *      deskripsi barang dirender sebagai teks oleh React, bukan innerHTML,
 *      jadi jalur XSS lewat isi listing tertutup.
 * Penyimpanan ini SELALU bisa dihapus lewat tombol "Ganti lapak" — penjual
 * tidak terjebak memakai satu lapak selamanya.
 */

const KUNCI = "angkutin-lapak-aktif";

export type LapakAktif = {
  stallId: string;
  token: string;
  nama: string | null;
};

export function bacaLapakAktif(): LapakAktif | null {
  if (typeof window === "undefined") return null;
  try {
    const mentah = localStorage.getItem(KUNCI);
    if (!mentah) return null;
    const v = JSON.parse(mentah) as Partial<LapakAktif>;
    // Validasi bentuk: data lama atau yang diubah tangan tidak boleh membuat
    // halaman gagal. Kalau tidak sesuai, anggap saja tidak ada lapak aktif.
    if (typeof v?.stallId !== "string" || typeof v?.token !== "string") return null;
    if (!v.stallId || !v.token) return null;
    return { stallId: v.stallId, token: v.token, nama: v.nama ?? null };
  } catch {
    return null;
  }
}

export function simpanLapakAktif(lapak: LapakAktif) {
  try {
    localStorage.setItem(KUNCI, JSON.stringify(lapak));
  } catch {
    // localStorage bisa dilarang (mode privat). Bukan alasan untuk gagal —
    // barang tetap bisa dipasang, hanya tanpa ingatan lapak.
  }
}

export function hapusLapakAktif() {
  try {
    localStorage.removeItem(KUNCI);
  } catch {
    // sama seperti di atas
  }
}
