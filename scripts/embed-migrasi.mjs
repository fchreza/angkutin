/**
 * scripts/embed-migrasi.mjs — embed file SQL migrasi ke dalam kode TypeScript.
 *
 * KENAPA FILE INI ADA:
 * `lib/migrasi.ts` perlu isi file `db/migrations/*.sql` saat runtime.
 * Masalahnya: Vercel hanya mem-bundle file yang di-import oleh kode
 * (file tracing). File `.sql` yang dibaca via `readdir`/`readFile` saat
 * runtime TIDAK ikut ter-bundle ke serverless function — akibatnya
 * migrasi gagal diam-diam di produksi walaupun jalan di lokal.
 *
 * Solusinya: saat build, script ini membaca semua `.sql` dan men-generate
 * `lib/migrasi-data.ts` yang berisi kontennya sebagai string. Kode runtime
 * tinggal import — tidak ada akses filesystem, tidak ada yang bisa hilang.
 *
 * Dijalankan otomatis via: package.json -> "build": "node scripts/embed-migrasi.mjs && next build"
 * File hasil generate (`lib/migrasi-data.ts`) juga di-commit supaya
 * `next dev` dan typecheck jalan tanpa perlu build dulu.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "..", "db", "migrations");
const OUTPUT = path.join(__dirname, "..", "lib", "migrasi-data.ts");

const files = (await readdir(MIGRATIONS_DIR))
  .filter((f) => f.endsWith(".sql"))
  .sort();

const entries = [];
for (const file of files) {
  const content = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
  entries.push(`  ${JSON.stringify(file)}: ${JSON.stringify(content)},`);
}

const output = `/**
 * lib/migrasi-data.ts — HASIL GENERATE, jangan edit manual.
 *
 * Dibuat oleh \`scripts/embed-migrasi.mjs\` saat build dari
 * \`db/migrations/*.sql\`. Untuk menambah migrasi baru: tambah file
 * \`.sql\` di \`db/migrations/\`, lalu build ulang (atau jalankan
 * \`node scripts/embed-migrasi.mjs\`).
 */
export const MIGRASI_SQL: Record<string, string> = {
${entries.join("\n")}
};
`;

await writeFile(OUTPUT, output);
console.log(`[embed-migrasi] ${files.length} file -> lib/migrasi-data.ts`);
