// Konfigurasi Sentry sisi klien (browser).
//
// DSN Sentry bersifat publik (terbawa di bundle JS klien) — bukan rahasia.
// Bisa dioverride via env NEXT_PUBLIC_SENTRY_DSN bila perlu.
import * as Sentry from "@sentry/nextjs";

const dsn =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://c4b11a67b271d255b78015a03e393b9c@o4511552246644736.ingest.de.sentry.io/4512264783593552";

if (dsn) {
  Sentry.init({
    dsn,
    // Jejak performa dimatikan dulu — yang dibutuhkan sekarang hanya
    // laporan error. Bisa dinyalakan nanti kalau butuh analisis lambat.
    tracesSampleRate: 0,
    // Jangan kirim error dari development agar dashboard tidak kotor.
    enabled: process.env.NODE_ENV === "production",
  });
}
// dsn selalu terisi (ada fallback di atas), jadi init selalu jalan di production.
