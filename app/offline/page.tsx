"use client";

/**
 * Halaman cadangan saat offline.
 *
 * Gaya ditulis inline dengan `var(--token, fallback)` — bukan kelas Tailwind —
 * karena halaman ini bisa disajikan dari cache dingin, saat stylesheet belum
 * sempat dimuat. Dengan fallback, tampilannya tetap benar.
 *
 * `use client` wajib: ada onClick.
 */
export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
        background: "#F9FAFB",
        color: "#111827",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 18 }}>📴</div>

      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
        Tidak ada koneksi
      </h1>

      <p
        style={{
          fontSize: 14.5,
          color: "#6B7280",
          maxWidth: 340,
          lineHeight: 1.6,
          marginTop: 10,
        }}
      >
        Halaman ini belum tersimpan di perangkatmu. Periksa koneksi internet,
        lalu coba lagi.
      </p>

      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          marginTop: 26,
          padding: "12px 28px",
          background: "#059669",
          color: "white",
          border: "none",
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          minHeight: 44,
        }}
      >
        Coba lagi
      </button>

      <a
        href="/"
        style={{
          marginTop: 14,
          fontSize: 13.5,
          color: "#047857",
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        Kembali ke Katalog
      </a>
    </main>
  );
}
