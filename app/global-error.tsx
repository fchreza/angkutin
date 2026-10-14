"use client";

/**
 * Batas galat tingkat akar.
 *
 * KENAPA INI PERLU, padahal sudah ada `app/error.tsx`:
 * `error.tsx` TIDAK menangkap galat yang terjadi di `app/layout.tsx` sendiri,
 * dan tidak menangkap galat saat React gagal melakukan hidrasi. Kedua kasus
 * itu menghasilkan layar kosong putih. Hanya `global-error.tsx` yang bisa
 * menanganinya, dan ia harus merender <html> serta <body> sendiri karena
 * layoutnya sendiri sedang bermasalah.
 *
 * GAYA DITULIS INLINE, TIDAK MEMAKAI KELAS TAILWIND.
 * KENAPA: berkas ini dipakai justru ketika bagian lain aplikasi gagal. Kalau
 * stylesheet-nya ikut gagal dimuat, halaman ini harus tetap terbaca. Karena itu
 * warnanya ditulis langsung dengan nilai cadangan, dan rupanya sengaja dibuat
 * sesederhana mungkin.
 *
 * TIDAK ADA NAVIGASI di sini: navbar dan footer adalah bagian dari layout yang
 * sedang gagal, jadi menampilkannya bisa memicu galat yang sama lagi. Yang
 * tersedia hanya tombol muat ulang, dan itu memang satu-satunya aksi yang
 * masuk akal ketika seluruh aplikasi gagal dipasang.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
          background: "#F8FAFC",
          color: "#0F172A",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 16 }} aria-hidden>
          ⚠️
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
          Aplikasi gagal dimuat
        </h1>

        <p
          style={{
            fontSize: 15,
            color: "#475569",
            maxWidth: 380,
            lineHeight: 1.6,
            marginTop: 10,
          }}
        >
          Terjadi masalah saat memuat halaman. Coba muat ulang. Kalau tetap
          gagal, tutup tab ini lalu buka lagi.
        </p>

        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 24,
            padding: "12px 28px",
            background: "#047857",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            minHeight: 44,
          }}
        >
          Muat ulang
        </button>

        {error.digest && (
          <p style={{ marginTop: 22, fontSize: 13, color: "#475569" }}>
            Kode kejadian: {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
