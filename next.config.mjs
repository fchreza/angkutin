/**
 * Header keamanan.
 *
 * KENAPA `Referrer-Policy` PENTING DI SINI:
 * Tautan kelola membawa token rahasia di query string (`?token=...`). Kalau
 * penjual membuka tautan itu lalu mengklik tautan keluar, browser normalnya
 * mengirim URL lengkap sebagai header `Referer` — termasuk tokennya. Situs
 * tujuan akan menerima token itu di log servernya.
 *
 * `strict-origin-when-cross-origin` mengirim HANYA asal (domain) saat
 * menyeberang ke situs lain, tanpa path dan tanpa query string. Jadi tokennya
 * tidak pernah bocor lewat referrer, sementara analitik internal tetap
 * berfungsi.
 *
 * `X-Robots-Tag` untuk halaman kelola diatur lewat metadata halaman
 * (robots: noindex), bukan di sini, karena hanya berlaku untuk satu rute.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Cegah halaman ini di-embed di iframe situs lain (clickjacking).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Jangan biarkan browser menebak tipe konten.
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        // Halaman kelola tidak boleh masuk indeks mesin pencari mana pun.
        source: "/manage/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        // Neon Object Storage (bucket public_read) — foto listing
        protocol: "https",
        hostname: "**.storage.c-4.ap-southeast-1.aws.neon.tech",
      },
      {
        protocol: "https",
        hostname: "**.aws.neon.tech",
      },
    ],
  },
};

export default nextConfig;
