/**
 * lib/migrasi.ts — menjalankan migrasi SQL yang belum diaplikasi,
 * dipanggil sekali saat server Node.js start (lihat instrumentation.ts).
 *
 * KENAPA RUNTIME, BUKAN BUILD:
 * Mencoba menjalankan migrasi sebagai bagian dari `next build` membuat
 * deploy bergantung pada konektivitas database saat build. Kalau koneksi
 * gagal (env belum tersedia / DB tidak terjangkau dari build container),
 * SELURUH deploy gagal — padahal kode aplikasinya baik-baik saja.
 * Dengan pola runtime, build tidak pernah menyentuh database; migrasi
 * jalan otomatis saat server start, tetap tanpa langkah manual
 * (pola yang sama seperti Hermes/Cue: otomatis, bukan manual).
 *
 * KEAMANAN CONCURRENCY (tanpa advisory lock):
 * Neon pooler berjalan dalam PgBouncer "transaction mode". Di mode itu,
 * advisory lock (yang bersifat per-sesi) TIDAK bisa diandalkan: tiap
 * query bisa mendarat di backend yang berbeda, sehingga lock yang
 * diambil bisa "nyangkut" di backend pool dan tidak pernah ter-release
 * — semua percobaan migrasi berikutnya akan menggantung sampai timeout.
 * (Ini bug nyata yang terjadi di produksi pada 2026-10-15.)
 *
 * Sebagai gantinya, klaim migrasi memakai PRIMARY KEY tabel `_migrations`:
 *  - Tiap file dijalankan dalam SATU transaksi yang diawali INSERT ke
 *    `_migrations`. Kalau dua instance balapan, satu akan menang;
 *    yang kalah mendapat unique violation → dianggap "sudah dikerjakan
 *    instance lain" dan dilewati.
 *  - Kalau SQL-nya gagal, transaksi rollback dan klaimnya ikut batal,
 *    jadi migrasi akan dicoba lagi di cold start berikutnya.
 *  - Semua file migrasi ditulis idempoten (IF NOT EXISTS) sebagai
 *    pertahanan lapis kedua.
 *  - Error TIDAK PERNAH menggagalkan boot server: migrasi yang gagal
 *    dicatat ke log dan akan dicoba lagi di cold start berikutnya.
 */

import postgres from "postgres";
import { MIGRASI_SQL } from "./migrasi-data";

// Satu instance server cukup menjalankan migrasi sekali; cold start yang
// datang saat migrasi masih jalan ikut menunggu promise yang sama.
let migrasiBerjalan: Promise<void> | null = null;

export function jalankanMigrasi(): Promise<void> {
  if (!migrasiBerjalan) {
    migrasiBerjalan = migrasi().catch((e) => {
      // Menelan error dengan sengaja: server harus tetap bisa boot
      // walaupun database sedang tidak terjangkau. Cold start berikutnya
      // akan mencoba lagi, dan kegagalan tercatat di log Vercel.
      console.error("[migrasi] GAGAL — server tetap berjalan:", e);
    });
  }
  return migrasiBerjalan;
}

async function migrasi(): Promise<void> {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.warn("[migrasi] DATABASE_URL tidak diset — migrasi dilewati.");
    return;
  }

  const sql = postgres(DATABASE_URL, {
    // Wajib untuk Neon pooler (PgBouncer transaction mode),
    // sama seperti konfigurasi di db/index.ts.
    prepare: false,
    max: 1,
    connect_timeout: 15,
  });

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    const applied = new Set(
      (await sql`SELECT name FROM _migrations`).map((r) => r.name as string),
    );

    // BOOTSTRAP untuk database yang sudah dimigrasi manual sebelum
    // sistem otomatis ini ada (kasus produksi pada 2026-10-15):
    // tabel `_migrations` masih kosong, tapi tabel-tabel dari migrasi
    // lama sudah ada. Tanpa bootstrap, runner akan mencoba menerapkan
    // ulang 001 — dan gagal karena 001 menyentuh tabel `clusters`
    // yang sudah di-drop oleh 002.
    //
    // Deteksi level migrasi dari tabel penanda:
    //  - `pageviews` ada  → 001–005 sudah teraplikasi (005 membuatnya).
    //  - `reports` ada    → 006 juga sudah teraplikasi.
    if (applied.size === 0) {
      const [{ pageviewsAda }] = await sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'pageviews'
        ) AS "pageviewsAda"
      `;
      const [{ reportsAda }] = await sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'reports'
        ) AS "reportsAda"
      `;
      const files = Object.keys(MIGRASI_SQL).sort();
      for (const file of files) {
        const nomor = file.slice(0, 3);
        const sudahDiDb =
          (nomor <= "005" && pageviewsAda) || (nomor <= "006" && reportsAda);
        if (sudahDiDb) {
          await sql`INSERT INTO _migrations (name) VALUES (${file}) ON CONFLICT DO NOTHING`;
          applied.add(file);
          console.log(`[migrasi] bootstrap — tandai sudah teraplikasi: ${file}`);
        }
      }
    }

    const files = Object.keys(MIGRASI_SQL).sort();

    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrasi] lewati (sudah teraplikasi): ${file}`);
        continue;
      }
      console.log(`[migrasi] menerapkan: ${file}`);
      const content = MIGRASI_SQL[file];
      try {
        await sql.begin(async (tx) => {
          // Klaim dulu via PRIMARY KEY: kalau instance serverless lain
          // sudah mengklaim file ini, INSERT ini gagal dengan unique
          // violation dan kita lewati — tidak perlu advisory lock.
          await tx`INSERT INTO _migrations (name) VALUES (${file})`;
          // unsafe() mengeksekusi string apa adanya — boleh multi-statement.
          // File migrasi adalah SQL tepercaya dari repo ini, bukan input pengguna.
          await tx.unsafe(content);
        });
      } catch (e) {
        if (isUniqueViolation(e)) {
          console.log(
            `[migrasi] dilewati (sudah dikerjakan instance lain): ${file}`,
          );
          continue;
        }
        throw e;
      }
      ran++;
      console.log(`[migrasi] ok: ${file}`);
    }
    console.log(`[migrasi] selesai — ${ran} migrasi baru diterapkan.`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/** True bila error adalah pelanggaran unique constraint (kode Postgres 23505). */
function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: unknown }).code === "23505"
  );
}
