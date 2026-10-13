import { eq } from "drizzle-orm";
import { db } from "@/db";
import { listings, stalls } from "@/db/schema";
import { tokenCocok } from "@/lib/token";

/**
 * Akses kelola: dua tingkat, satu tempat.
 *
 * KENAPA DIPUSATKAN DI SINI:
 * Sebelumnya setiap rute (PATCH ubah, PATCH status, POST foto, halaman kelola)
 * memeriksa token sendiri-sendiri. Begitu ada DUA jenis token yang sah
 * (lapak dan barang), pemeriksaan yang tersebar itu menjadi sumber bug
 * keamanan yang serius — satu rute yang lupa diperbarui bisa membuka akses
 * lintas lapak. Jadi seluruh keputusan otorisasi ada di berkas ini.
 *
 * DUA TINGKAT AKSES:
 *
 *   1. LAPAK  (/manage/<stallId>?token=<token_lapak>)
 *      Mengelola SEMUA barang di lapak itu. Dipakai dashboard baru.
 *
 *   2. BARANG (/manage/<listingId>?token=<token_listing>)
 *      Hanya satu barang. Ini TAUTAN LAMA yang sudah beredar dan mungkin
 *      sudah disimpan penjual — sengaja tetap sah supaya tidak ada tautan
 *      yang mati. Penjual bisa memindahkan barangnya ke lapak dari sini.
 *
 * KENAPA LAPAK DIPERIKSA LEBIH DULU:
 * Lapak adalah kasus utama sekarang. Memeriksanya dulu berarti jalur yang
 * paling sering dipakai hanya perlu satu query.
 *
 * KENAPA TIDAK ADA REDIRECT DARI TAUTAN LAMA KE TAUTAN LAPAK:
 * Redirect akan membocorkan token lapak ke riwayat browser dan header
 * `Referer` saat penjual membuka tautan lama dari halaman lain. Selain itu,
 * tautan lama yang masih berfungsi lebih baik daripada tautan yang tiba-tiba
 * berpindah tujuan.
 */

export type AksesLapak = {
  jenis: "lapak";
  stallId: string;
  token: string;
  nama: string | null;
};

export type AksesBarang = {
  jenis: "barang";
  listingId: string;
  token: string;
  /** Lapak barang ini, kalau sudah dipindahkan. */
  stallId: string | null;
};

export type Akses = AksesLapak | AksesBarang;

/**
 * Periksa sebuah id + token: lapak atau barang?
 *
 * KENAPA URUTANNYA SEPERTI INI — ini sempat salah dan menimbulkan bug nyata:
 *
 * Versi pertama hanya mencoba "id sebagai lapak" lalu "id sebagai barang",
 * dengan asumsi tokennya sejenis dengan idnya. Itu keliru, karena rute kelola
 * SELALU menerima id BARANG — sedangkan tokennya boleh token LAPAK. Akibatnya
 * token lapak tidak pernah dikenali saat dipakai untuk mengelola barang, dan
 * dashboard lapak tidak bisa mengubah apa pun.
 *
 * Urutan yang benar: periksa id sebagai lapak, lalu id sebagai barang — dan
 * untuk barang, periksa DUA token yang sah:
 *   a. token barang itu sendiri (tautan lama yang sudah beredar)
 *   b. token LAPAK pemilik barang itu (dipakai dashboard lapak)
 *
 * Mengembalikan null kalau tidak ada yang cocok. Pemanggil TIDAK boleh
 * membedakan pesan antara "tidak ada" dan "token salah" — perbedaan itu
 * membocorkan id mana yang benar-benar ada.
 */
export async function periksaAkses(id: string, token: string): Promise<Akses | null> {
  if (!id || !token) return null;

  // 1. Id ini sebuah LAPAK?
  const [lapak] = await db
    .select({ id: stalls.id, secretToken: stalls.secretToken, nama: stalls.displayName })
    .from(stalls)
    .where(eq(stalls.id, id))
    .limit(1);

  if (lapak && tokenCocok(token, lapak.secretToken)) {
    return { jenis: "lapak", stallId: lapak.id, token, nama: lapak.nama };
  }

  // 2. Id ini sebuah BARANG?
  const [barang] = await db
    .select({ id: listings.id, secretToken: listings.secretToken, stallId: listings.stallId })
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);

  if (!barang) return null;

  // 2a. Token barang itu sendiri — tautan lama, tetap sah.
  if (tokenCocok(token, barang.secretToken)) {
    return { jenis: "barang", listingId: barang.id, token, stallId: barang.stallId };
  }

  // 2b. Token LAPAK pemilik barang ini — inilah jalur dashboard lapak.
  // Tanpa cabang ini, satu tautan lapak tidak bisa mengelola barangnya.
  if (barang.stallId) {
    const [pemilik] = await db
      .select({ id: stalls.id, secretToken: stalls.secretToken, nama: stalls.displayName })
      .from(stalls)
      .where(eq(stalls.id, barang.stallId))
      .limit(1);

    if (pemilik && tokenCocok(token, pemilik.secretToken)) {
      return { jenis: "lapak", stallId: pemilik.id, token, nama: pemilik.nama };
    }
  }

  return null;
}

/**
 * Boleh tidaknya sebuah akses mengubah satu barang tertentu.
 *
 * Ini penjaga terpenting: token lapak A TIDAK boleh bisa mengubah barang milik
 * lapak B. Tanpa pemeriksaan ini, dashboard lapak cukup mengganti id barang di
 * URL untuk mengubah barang orang lain.
 */
export async function bolehKelolaBarang(
  akses: Akses,
  listingId: string,
): Promise<boolean> {
  const [barang] = await db
    .select({ id: listings.id, stallId: listings.stallId })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);

  if (!barang) return false;

  // Akses lapak: barang harus benar-benar milik lapak itu.
  if (akses.jenis === "lapak") return barang.stallId === akses.stallId;

  // Akses barang: hanya barang itu sendiri.
  return barang.id === akses.listingId;
}

/** Buat lapak baru. Dipakai saat penjual memasang barang pertamanya. */
export async function buatLapak(token: string, nama?: string | null) {
  const [lapak] = await db
    .insert(stalls)
    .values({ secretToken: token, displayName: nama ?? null })
    .returning({ id: stalls.id, secretToken: stalls.secretToken });
  return lapak;
}

/**
 * Bangun URL kelola.
 *
 * `origin` berasal dari request yang sebenarnya, bukan env: kalau memakai env
 * dan nilainya belum diisi, tautan yang ditampilkan ke penjual akan berbunyi
 * "localhost" dan tidak bisa dibuka dari HP.
 */
export function urlLapak(origin: string, stallId: string, token: string) {
  return `${origin}/manage/${stallId}?token=${token}`;
}

export function urlBarang(origin: string, listingId: string, token: string) {
  return `${origin}/manage/${listingId}?token=${token}`;
}
