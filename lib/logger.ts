/**
 * Logger terpusat untuk error server.
 *
 * KENAPA TIDAK LANGSUNG console.error DI MANA-MANA:
 * Semua error produksi sebelumnya hanya ditulis ke `console.error` yang
 * tersebar di belasan file. Kalau suatu hari dipasang error tracking
 * (mis. Sentry), setiap pemanggilan harus diubah satu per satu — dan yang
 * terlewat tetap hilang tanpa jejak. Dengan satu titik keluar ini, menyambung
 * ke Sentry cukup mengubah SATU fungsi di bawah.
 *
 * CARA MENYAMBUNG KE SENTRY NANTI:
 * Tambahkan `@sentry/nextjs`, lalu di dalam `kirim` panggil
 * `Sentry.captureException(...)` untuk level error. Tidak perlu menyentuh
 * pemanggil mana pun.
 *
 * Pemakaian: `logger.error("[tag] pesan:", err)` — API-nya sengaja dibuat
 * identik dengan console.error supaya migrasinya mekanis.
 */

function kirim(
  level: "error" | "warn" | "info",
  args: unknown[],
): void {
  // TODO(sentry): kirim level "error" ke Sentry setelah dipasang.
  // Contoh: if (level === "error") Sentry.captureException(args[1] ?? args[0]);
  if (level === "error") console.error(...args);
  else if (level === "warn") console.warn(...args);
  else console.info(...args);
}

export const logger = {
  error: (...args: unknown[]) => kirim("error", args),
  warn: (...args: unknown[]) => kirim("warn", args),
  info: (...args: unknown[]) => kirim("info", args),
};
