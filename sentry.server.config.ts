// Konfigurasi Sentry sisi server (Node.js runtime).
//
// Dipakai untuk menangkap error di API routes dan Server Components.
import * as Sentry from "@sentry/nextjs";

const dsn =
  process.env.SENTRY_DSN ??
  "https://c4b11a67b271d255b78015a03e393b9c@o4511552246644736.ingest.de.sentry.io/4512264783593552";

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0,
    enabled: process.env.NODE_ENV === "production",
  });
}
