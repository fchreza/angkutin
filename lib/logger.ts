/**
 * Logger terpusat untuk error server.
 *
 * KENAPA TIDAK LANGSUNG console.error DI MANA-MANA:
 * Semua error produksi sebelumnya hanya ditulis ke `console.error` yang
 * tersebar di belasan file. Dengan satu titik keluar ini, menyambung ke
 * Sentry cukup mengubah SATU fungsi di bawah — tidak perlu menyentuh
 * pemanggil mana pun.
 *
 * Pemakaian: `logger.error("[tag] pesan:", err)` — API-nya sengaja dibuat
 * identik dengan console.error supaya migrasinya mekanis.
 */

import * as Sentry from "@sentry/nextjs";

function kirim(
  level: "error" | "warn" | "info",
  args: unknown[],
): void {
  if (level === "error") {
    console.error(...args);
    // Kirim ke Sentry kalau terpasang. Dibungkus try/catch supaya kegagalan
    // Sentry sendiri tidak pernah merusak alur aplikasi.
    try {
      const err = args.find((a) => a instanceof Error) ?? args[0];
      Sentry.captureException(err, {
        extra: { pesan: args.map(String).join(" ") },
      });
    } catch {
      /* abaikan */
    }
  } else if (level === "warn") console.warn(...args);
  else console.info(...args);
}

export const logger = {
  error: (...args: unknown[]) => kirim("error", args),
  warn: (...args: unknown[]) => kirim("warn", args),
  info: (...args: unknown[]) => kirim("info", args),
};
