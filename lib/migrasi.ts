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
 * KEAMANAN CONCURRENCY:
 *  - Kunci advisory Postgres (non-blocking + retry) supaya beberapa
 *    instance serverless yang cold-start bersamaan tidak menerapkan
 *    migrasi yang sama dua kali.
 *  - Setiap file dijalankan dalam SATU transaksi bersama pencatatan
 *    `_migrations`-nya: kalau SQL-nya gagal, catatannya ikut batal.
 *  - Semua file migrasi ditulis idempoten (IF NOT EXISTS).
 *  - Error TIDAK PERNAH menggagalkan boot server: migrasi yang gagal
 *    dicatat ke log dan akan dicoba lagi di cold start berikutnya.
 *
 * CATATAN VERCEL:
 *  - File `db/migrations/*.sql` ikut ter-deploy (tidak ada .vercelignore
 *    yang mengecualikannya), jadi `process.cwd()/db/migrations` valid
 *    saat runtime.
 *  - `register()` di instrumentation.ts tidak dipanggil saat `next build`
 *    dan tidak jalan di Edge runtime — hanya di server Node.js yang live.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres, { type Sql } from "postgres";

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");
const LOCK_NAME = "angkutin_db_migrate";
// Batas tunggu kunci: 60 x 500ms = 30 detik. Boot server tidak boleh
// menggantung selamanya menunggu instance lain selesai migrasi.
const KUNCI_PERCOBAAN_MAKS = 60;
const KUNCI_TUNGGU_MS = 500;

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
    const terkunci = await cobaKunci(sql);
    if (!terkunci) {
      console.warn(
        "[migrasi] tidak mendapat advisory lock dalam 30 detik — " +
          "diduga instance lain sedang migrasi. Dilewati, dicoba lagi di cold start berikutnya.",
      );
      return;
    }

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

      const files = (await readdir(MIGRATIONS_DIR))
        .filter((f) => f.endsWith(".sql"))
        .sort();

      let ran = 0;
      for (const file of files) {
        if (applied.has(file)) {
          console.log(`[migrasi] lewati (sudah teraplikasi): ${file}`);
          continue;
        }
        console.log(`[migrasi] menerapkan: ${file}`);
        const content = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
        await sql.begin(async (tx) => {
          // unsafe() mengeksekusi string apa adanya — boleh multi-statement.
          // File migrasi adalah SQL tepercaya dari repo ini, bukan input pengguna.
          await tx.unsafe(content);
          await tx`INSERT INTO _migrations (name) VALUES (${file})`;
        });
        ran++;
        console.log(`[migrasi] ok: ${file}`);
      }
      console.log(`[migrasi] selesai — ${ran} migrasi baru diterapkan.`);
    } finally {
      await sql`SELECT pg_advisory_unlock(hashtext(${LOCK_NAME}))`;
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/** Coba ambil advisory lock tanpa blocking; kembalikan false bila timeout. */
async function cobaKunci(sql: Sql): Promise<boolean> {
  for (let i = 0; i < KUNCI_PERCOBAAN_MAKS; i++) {
    const rows = await sql`
      SELECT pg_try_advisory_lock(hashtext(${LOCK_NAME})) AS terkunci
    `;
    if (rows[0]?.terkunci === true) return true;
    await new Promise((r) => setTimeout(r, KUNCI_TUNGGU_MS));
  }
  return false;
}
