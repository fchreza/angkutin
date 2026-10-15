/**
 * instrumentation.ts — hook yang dijalankan Next.js sekali saat server
 * Node.js start (bukan saat build, bukan di Edge runtime).
 *
 * Tugasnya di sini satu: menerapkan migrasi database yang tertunda
 * (termasuk `006_reports.sql` untuk tabel `reports`) secara otomatis,
 * supaya tidak ada lagi langkah migrasi manual.
 *
 * `jalankanMigrasi()` tidak pernah melempar error — kalau database tidak
 * terjangkau, server tetap boot normal dan migrasi dicoba lagi di
 * cold start berikutnya. Jadi perubahan ini tidak bisa merusak deploy.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { jalankanMigrasi } = await import("./lib/migrasi");
    await jalankanMigrasi();
  }
}
