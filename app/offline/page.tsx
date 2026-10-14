"use client";

/**
 * Halaman cadangan saat offline.
 *
 * Gaya ditulis inline dengan `var(--token, fallback)` — bukan kelas Tailwind —
 * karena halaman ini bisa disajikan dari cache dingin, saat stylesheet belum
 * sempat dimuat. Dengan fallback, tampilannya tetap benar.
 *
 * NILAI FALLBACK DI SINI HARUS SAMA DENGAN TOKEN DI globals.css.
 * Sebelumnya halaman ini memakai palet lama (#F9FAFB, #111827, #059669,
 * #047857) sehingga saat disajikan dari cache dingin, warnanya berbeda dari
 * sisa situs. Sekarang fallback-nya mengikuti palet hangat yang berlaku:
 * kanvas alabaster #F8FAFC, tinta #0F172A, emerald #047857.
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
        background: "rgb(var(--w-bg, 250 248 245))",
        color: "rgb(var(--w-ink, 28 26 23))",
        fontFamily: "var(--font-jakarta, system-ui), sans-serif",
      }}
    >
      {/*
        Emoji di sini adalah SATU-SATUNYA emoji di seluruh situs, dan itu
        disengaja: halaman ini bisa disajikan saat stylesheet belum termuat,
        jadi ikon SVG tidak dijamin tersedia. Emoji dirender oleh font sistem,
        jadi selalu ada. `aria-hidden` karena teks di bawahnya sudah
        menyampaikan hal yang sama.
      */}
      <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 18 }} aria-hidden>
        📴
      </div>

      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          margin: 0,
          letterSpacing: "-0.02em",
        }}
      >
        Tidak ada koneksi
      </h1>

      <p
        style={{
          fontSize: 14.5,
          color: "rgb(var(--w-ink2, 107 101 92))",
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
          background: "rgb(var(--w-primary, 14 122 79))",
          color: "rgb(var(--w-on-primary, 255 255 255))",
          border: "none",
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          minHeight: 44,
        }}
      >
        Coba lagi
      </button>

      {/*
        Tautan bawah: diberi tinggi 44px supaya memenuhi sasaran sentuh
        minimum WCAG 2.5.5, dengan `display:flex` supaya teksnya tetap
        terpusat di dalam area itu.
      */}
      <a
        href="/"
        style={{
          marginTop: 10,
          fontSize: 13.5,
          color: "rgb(var(--w-primary-text, 11 98 66))",
          textDecoration: "none",
          fontWeight: 500,
          display: "inline-flex",
          alignItems: "center",
          minHeight: 44,
        }}
      >
        Kembali ke Katalog
      </a>
    </main>
  );
}
