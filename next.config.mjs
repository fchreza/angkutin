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
 * Content-Security-Policy dijalankan dalam mode REPORT-ONLY (bukan enforcing):
 * kebijakan enforcing berisiko memecahkan skrip inline Next.js bila ada
 * aturan yang terlewat, sementara report-only mencatat pelanggaran ke konsol
 * tanpa memblokir apa pun. Setelah pola pelanggaran dipetakan dan bersih,
 * header ini bisa dinaikkan menjadi enforcing dengan mengganti nama headernya.
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
          // Lapis pertahanan XSS tambahan. Report-only: hanya mencatat,
          // tidak memblokir, supaya tidak ada risiko merusak halaman produksi.
          {
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              // Sentry ingest harus diizinkan, kalau tidak laporan error
              // dari browser tidak akan sampai ke dashboard Sentry.
              "connect-src 'self' https://o4511552246644736.ingest.de.sentry.io",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join("; "),
          },
          // Matikan API browser yang tidak dipakai produk ini.
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
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
