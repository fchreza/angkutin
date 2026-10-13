import type { MetadataRoute } from "next";

/**
 * robots.txt.
 *
 * KENAPA BERKAS INI PENTING DI PRODUK INI, bukan sekadar formalitas:
 * Halaman kelola (`/manage/[id]?token=...`) memuat TAUTAN RAHASIA. Satu saja
 * halaman itu terindeks, token penjual masuk ke hasil pencarian dan siapa pun
 * bisa menandai barangnya sudah diambil atau menghapusnya.
 *
 * Halaman itu sudah ditandai `noindex` di dua tempat (metadata halaman dan
 * header `X-Robots-Tag`), tapi `Disallow` di sini menambahkan lapisan ketiga
 * yang berbeda jenis: `noindex` bekerja SETELAH crawler mengunduh halamannya,
 * sedangkan `Disallow` mencegah pengunduhan itu terjadi sama sekali. Untuk
 * halaman berisi kredensial, mencegah lebih baik daripada meminta.
 *
 * CATATAN PENTING soal keduanya dipakai bersamaan: kalau sebuah URL dilarang
 * di robots.txt, crawler tidak akan mengunduhnya, sehingga ia juga tidak akan
 * pernah MELIHAT tanda `noindex` di halaman itu. Jadi `Disallow` sendirian
 * bisa membuat URL tetap muncul di hasil pencarian tanpa deskripsi. Itu
 * sebabnya `noindex` di halaman dan `X-Robots-Tag` di next.config.mjs tetap
 * dipertahankan, bukan digantikan oleh berkas ini.
 */
export default function robots(): MetadataRoute.Robots {
  /*
   * Alamat dasar dihitung dengan urutan yang SAMA seperti sitemap dan
   * app/layout.tsx. Kalau berbeda, robots.txt bisa menunjuk sitemap di
   * domain yang salah.
   */
  const dasar = (() => {
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
      return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    const dariEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (dariEnv && !dariEnv.includes("localhost")) return dariEnv;
    return "http://localhost:3000";
  })();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Tautan rahasia. Alasan utamanya ada di komentar atas berkas ini.
          "/manage/",
          // Halaman form: tidak ada isi berguna bagi pencari.
          "/pasang",
          // Halaman cadangan saat offline.
          "/offline",
          // Endpoint API tidak untuk diindeks.
          "/api/",
          // Halaman admin. Sudah ditandai noindex juga di metadatanya.
          "/admin",
        ],
      },
    ],
    sitemap: `${dasar}/sitemap.xml`,
    host: dasar,
  };
}
