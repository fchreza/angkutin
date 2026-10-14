/**
 * Header keamanan untuk seluruh aplikasi.
 *
 * Tautan kelola lama masih menerima `?token=...` agar bookmark yang telah
 * dibagikan tetap berfungsi. Halaman tersebut menukar token menjadi cookie
 * HttpOnly lalu membersihkan query dari address bar; `no-referrer` khusus
 * route /manage juga mencegah URL awal diteruskan ke situs lain selama proses.
 * Kebijakan global strict-origin-when-cross-origin membatasi referrer lintas
 * origin pada origin saja.
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
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/manage/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
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
