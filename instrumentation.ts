/**
 * instrumentation.ts — hook yang dijalankan Next.js sekali saat server
 * Node.js start (bukan saat build, bukan di Edge runtime).
 *
 * Dua tugas:
 * 1. Inisialisasi Sentry sisi server (impor sentry.server.config.ts).
 * 2. Menerapkan migrasi database yang tertunda secara otomatis.
 *
 * `jalankanMigrasi()` tidak pernah melempar error — kalau database tidak
 * terjangkau, server tetap boot normal dan migrasi dicoba lagi di
 * cold start berikutnya. Jadi perubahan ini tidak bisa merusak deploy.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    const { jalankanMigrasi } = await import("./lib/migrasi");
    await jalankanMigrasi();
  }
}
