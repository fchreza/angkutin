"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Pencatat kunjungan halaman (analytics) yang menghormati privasi.
 *
 * KENAPA TIDAK MEMAKAI ANALYTICS PIHAK KETIGA:
 * Produk ini menjanjikan "tanpa daftar akun" dan pengguna tidak pernah
 * menandatangani apa pun. Memasang skrip pelacak pihak ketiga berarti
 * mengirim perilaku pengguna ke perusahaan lain tanpa mereka tahu, dan itu
 * bertentangan dengan janji produknya sendiri. Skrip pelacak juga menambah
 * berat halaman, sementara salah satu target PRD adalah muat di bawah 1,8
 * detik pada koneksi lambat.
 *
 * YANG DIKIRIM: hanya jalur halaman (path), jenis rujukan, dan ukuran layar.
 * YANG TIDAK PERNAH DIKIRIM: alamat IP (di-hash di server lalu langsung
 * dibuang), token pada URL, kata kunci pencarian, isi kolom apa pun, dan
 * tidak ada cookie maupun penyimpanan di perangkat.
 *
 * KENAPA PATH SAJA SUDAH CUKUP: pertanyaan yang ingin dijawab adalah
 * "halaman mana yang dipakai dan dari mana orang datang", bukan "siapa".
 * Pertanyaan tentang orang per orang memang sengaja tidak dijawab, karena
 * menjawabnya berarti melacak.
 */

/** Jenis rujukan, bukan URL lengkapnya. */
type Rujukan = "langsung" | "internal" | "whatsapp" | "mesin-cari" | "lainnya";

function klasifikasiRujukan(): Rujukan {
  if (typeof document === "undefined" || !document.referrer) return "langsung";
  try {
    const u = new URL(document.referrer);
    if (u.origin === window.location.origin) return "internal";
    const h = u.hostname;
    if (/wa\.me$|whatsapp\.com$|api\.whatsapp\.com$/.test(h)) return "whatsapp";
    if (/google\.|bing\.|yahoo\.|duckduckgo\.|yandex\./.test(h)) return "mesin-cari";
    return "lainnya";
  } catch {
    return "lainnya";
  }
}

/**
 * URL jalur TANPA query string.
 *
 * PENTING: parameter query dibuang, bukan sekadar diabaikan. Halaman kelola
 * membawa token rahasia di query string (`?token=...`), dan mengirimkannya
 * ke mana pun, termasuk ke database analitik sendiri, sama saja dengan
 * menyimpan kredensial di tempat yang tidak seharusnya. Ini juga alasan
 * `usePathname()` dipakai, bukan `useSearchParams()`.
 */
function jalurBersih(path: string): string {
  return path.split("?")[0].split("#")[0].slice(0, 200);
}

export function CatatKunjungan() {
  const pathname = usePathname();
  /*
   * Satu kunjungan dicatat sekali per jalur.
   *
   * `useRef` dipakai, bukan state: menandai kunjungan tidak boleh memicu
   * render ulang. Kalau memakai state, setiap kali jalur berubah komponennya
   * render dua kali, dan itu mengirim dua permintaan untuk satu kunjungan.
   */
  const terakhir = useRef<string | null>(null);

  useEffect(() => {
    const jalur = jalurBersih(pathname);
    if (!jalur || jalur === terakhir.current) return;
    terakhir.current = jalur;

    /*
     * Halaman kelola dan halaman admin tidak dicatat sama sekali.
     *
     * Halaman kelola: bukan hanya karena tokennya, tapi karena mengunjungi
     * halaman itu adalah tindakan PRIBADI pemilik barang. Tidak ada gunanya
     * bagi produk untuk tahu kapan seseorang mengelola barangnya sendiri.
     *
     * Halaman admin: kalau dicatat, kunjungan pemilik situs sendiri akan ikut
     * terhitung dan mengotori angka yang justru ingin dibaca di halaman itu.
     */
    if (jalur.startsWith("/manage") || jalur.startsWith("/admin")) return;

    const muatan = {
      path: jalur,
      referrer: klasifikasiRujukan(),
      // Lebar viewport saja, dibulatkan. Cukup untuk tahu ponsel vs desktop,
      // dan tidak cukup untuk menyidik perangkat tertentu.
      width: Math.round(window.innerWidth / 50) * 50,
    };

    /*
     * `keepalive` dipakai supaya permintaan tetap terkirim walaupun pengguna
     * langsung menutup tab atau berpindah halaman. Tanpa itu, kunjungan
     * terakhir sebelum keluar sering hilang, dan justru kunjungan itulah yang
     * paling menarik: halaman terakhir yang dilihat orang sebelum pergi.
     *
     * Kegagalannya sengaja diabaikan: analytics tidak boleh pernah
     * mengganggu pengalaman pengguna. Kalau gagal, ya sudah.
     */
    try {
      void fetch("/api/v1/analytics/pageview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(muatan),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* diabaikan dengan sengaja */
    }
  }, [pathname]);

  // Komponen ini tidak merender apa pun. Ia hanya efek.
  return null;
}
