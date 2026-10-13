"use client";

/**
 * Konteks lapak untuk halaman Pasang.
 *
 * KENAPA TIDAK MEMAKAI localStorage (versi sebelumnya, dan kenapa diubah):
 * Versi pertama menyimpan "lapak aktif" di perangkat. Itu membuat perilakunya
 * tidak terlihat: penjual yang punya dua lapak bisa memasang barang ke lapak
 * yang salah tanpa sadar, karena halaman Pasang tidak memberi tahu lapak mana
 * yang akan dipakai.
 *
 * Sekarang konteksnya datang dari TOMBOL YANG DIKLIK:
 *   - Tombol "Tambah Barang" di dalam dashboard lapak -> membawa konteks lapak
 *     itu, jadi barang baru masuk ke lapak yang sama.
 *   - Tombol "Pasang Barang" di navbar/katalog -> tidak membawa konteks, jadi
 *     lapak BARU yang dibuat.
 *
 * Dengan begitu tidak ada state tersembunyi: apa yang kamu lihat di tautan
 * yang kamu klik, itulah lapak tujuannya. Dan ini bekerja lintas perangkat —
 * tautannya bisa dikirim ke HP lain dan tetap benar.
 *
 * KENAPA DI FRAGMENT (`#`), BUKAN QUERY (`?`):
 * Bagian setelah `#` TIDAK pernah dikirim ke server. Jadi token lapak tidak
 * masuk ke log server, tidak ke analitik, dan tidak ikut sebagai `Referer`
 * saat pengguna mengeklik tautan keluar. Query string akan membocorkan
 * ketiganya.
 */

export type KonteksLapak = {
  stallId: string;
  token: string;
};

const KUNCI_ID = "stall";
const KUNCI_TOKEN = "t";

/**
 * Baca konteks lapak dari fragment URL.
 *
 * Mengembalikan objek BARU setiap panggilan. Untuk dipakai di dalam
 * `useSyncExternalStore`, pakai `bacaKonteksLapakSnapshot()` di bawah — bukan
 * fungsi ini — karena React memerlukan nilai yang referensinya stabil.
 */
export function bacaKonteksLapak(): KonteksLapak | null {
  if (typeof window === "undefined") return null;
  try {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return null;
    const p = new URLSearchParams(hash);
    const stallId = p.get(KUNCI_ID) ?? "";
    const token = p.get(KUNCI_TOKEN) ?? "";
    if (!stallId || !token) return null;
    return { stallId, token };
  } catch {
    return null;
  }
}

/**
 * Snapshot dengan referensi STABIL untuk `useSyncExternalStore`.
 *
 * React membandingkan hasil `getSnapshot` dengan `Object.is` di setiap render.
 * Kalau fungsinya mengembalikan objek baru terus-menerus, React menganggap
 * nilainya selalu berubah dan render tidak pernah berhenti. Karena itu hasil
 * terakhir disimpan di sini dan hanya dibuat ulang saat isinya benar-benar
 * berbeda.
 */
let cacheMentah: string | null = null;
let cacheNilai: KonteksLapak | null = null;

export function bacaKonteksLapakSnapshot(): KonteksLapak | null {
  if (typeof window === "undefined") return null;
  const mentah = window.location.hash;
  if (mentah === cacheMentah) return cacheNilai;
  cacheMentah = mentah;
  cacheNilai = bacaKonteksLapak();
  return cacheNilai;
}

/**
 * Daftar pelanggan + patch riwayat URL.
 *
 * KENAPA PATCH INI PERLU — ini bug kedua yang sempat lolos:
 * Next.js memindahkan halaman dengan `history.pushState`, dan `pushState`
 * TIDAK memicu `hashchange` maupun `popstate` — memang begitu spesifikasinya,
 * bukan bug Next.js. Akibatnya, saat penjual menekan "Tambah Barang Lagi",
 * URL-nya berubah ke `#stall=...` tetapi panel lapak tidak pernah diberi tahu
 * dan tetap menampilkan "akan membuat lapak baru". Penjual dikira akan
 * membuat lapak kedua padahal barangnya masuk ke lapak yang benar.
 *
 * Jadi `pushState`/`replaceState` dibungkus sekali saja per halaman, dan
 * setiap pemanggilannya memberi tahu para pelanggan. Dibungkus sekali, bukan
 * per komponen, supaya tidak menumpuk wrapper kalau panelnya dipasang ulang.
 */
const pelanggan = new Set<() => void>();
let riwayatSudahDipatch = false;

function beritahuPelanggan() {
  pelanggan.forEach((f) => f());
}

function patchRiwayat() {
  if (riwayatSudahDipatch || typeof window === "undefined") return;
  riwayatSudahDipatch = true;

  (["pushState", "replaceState"] as const).forEach((nama) => {
    const asli = window.history[nama].bind(window.history);
    window.history[nama] = ((...args: Parameters<History["pushState"]>) => {
      const hasil = asli(...args);
      beritahuPelanggan();
      return hasil;
    }) as History[typeof nama];
  });
}

/**
 * Berlangganan perubahan fragment.
 *
 * Tiga sumber perubahan yang perlu didengar:
 *   - `pushState`/`replaceState` : navigasi internal Next.js (lihat di atas).
 *   - `hashchange`               : tautan biasa yang mengubah fragment.
 *   - `popstate`                 : tombol maju/mundur browser.
 */
export function langgananHash(onUbah: () => void) {
  patchRiwayat();
  pelanggan.add(onUbah);
  window.addEventListener("hashchange", onUbah);
  window.addEventListener("popstate", onUbah);
  return () => {
    pelanggan.delete(onUbah);
    window.removeEventListener("hashchange", onUbah);
    window.removeEventListener("popstate", onUbah);
  };
}

/**
 * Susun tautan Pasang yang membawa konteks lapak.
 *
 * Dipakai oleh tombol "Tambah Barang" di dashboard lapak dan halaman sukses.
 */
export function urlPasangKeLapak(stallId: string, token: string) {
  const p = new URLSearchParams({ [KUNCI_ID]: stallId, [KUNCI_TOKEN]: token });
  return `/pasang#${p.toString()}`;
}
