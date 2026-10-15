/**
 * scripts/db-migrate.mjs — jalankan migrasi SQL yang belum diaplikasi.
 *
 * KENAPA FILE INI ADA:
 * Dulu migrasi database dijalankan manual dari laptop (via `db:push` yang
 * menunjuk ke script yang bahkan tidak ke-commit). Setiap perubahan skema
 * butuh langkah manual — gampang kelupaan, dan deploy bisa jalan dengan
 * skema basi (itulah yang terjadi pada tabel `reports`: kode sudah deploy,
 * tabelnya belum ada).
 *
 * Sekarang migrasi jalan OTOMATIS sebagai bagian dari build:
 *   package.json -> "build": "npm run db:migrate && next build"
 * Setiap file baru di `db/migrations/` otomatis kepasang saat deploy,
 * tanpa langkah manual. Pola yang sama dipakai Hermes/Cue.
 *
 * CARA KERJA:
 *  1. Ambil advisory lock Postgres — supaya dua build yang kebetulan
 *     berjalan bersamaan tidak menerapkan migrasi yang sama dua kali.
 *  2. Baca daftar file `*.sql` di `db/migrations/` (urut nama file).
 *  3. Lewati yang sudah tercatat di tabel `_migrations`.
 *  4. Setiap file dijalankan dalam SATU transaksi bersama pencatatan
 *     `_migrations`-nya: kalau SQL-nya gagal, catatannya ikut batal.
 *  5. Semua file migrasi ditulis idempoten (IF NOT EXISTS), jadi aman
 *     dijalankan ulang.
 *
 * Pakai: `npm run db:migrate` (butuh DATABASE_URL di environment).
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "..", "db", "migrations");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error(
    "[db-migrate] DATABASE_URL belum diset — migrasi dibatalkan.",
  );
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  // Wajib untuk Neon pooler (PgBouncer transaction mode),
  // sama seperti konfigurasi di db/index.ts.
  prepare: false,
  max: 1,
  connect_timeout: 15,
});

try {
  // Kunci supaya hanya satu proses migrasi dalam satu waktu.
  // pg_advisory_lock menunggu (blocking) sampai kunci bebas.
  await sql`SELECT pg_advisory_lock(hashtext('angkutin_db_migrate'))`;

  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const applied = new Set(
    (await sql`SELECT name FROM _migrations`).map((r) => r.name),
  );

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[db-migrate] lewati (sudah teraplikasi): ${file}`);
      continue;
    }
    console.log(`[db-migrate] menerapkan: ${file}`);
    const content = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    await sql.begin(async (tx) => {
      // unsafe() mengeksekusi string apa adanya — boleh multi-statement.
      // File migrasi adalah SQL tepercaya dari repo ini, bukan input pengguna.
      await tx.unsafe(content);
      await tx`INSERT INTO _migrations (name) VALUES (${file})`;
    });
    ran++;
    console.log(`[db-migrate] ok: ${file}`);
  }

  await sql`SELECT pg_advisory_unlock(hashtext('angkutin_db_migrate'))`;
  console.log(`[db-migrate] selesai — ${ran} migrasi baru diterapkan.`);
} catch (e) {
  console.error("[db-migrate] GAGAL:", e);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
