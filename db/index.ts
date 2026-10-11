import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Klien database (Neon Postgres, region Singapura).
 *
 * PENTING — kenapa angkanya seperti ini:
 * Server aplikasi dan database berada di benua berbeda, jadi satu round-trip
 * memakan ~250 ms. Setiap pengaturan di bawah dipilih untuk MENEKAN JUMLAH
 * ROUND-TRIP, bukan sekadar rapi:
 *
 *  - `prepare: false`  : wajib untuk Neon pooler (PgBouncer transaction mode).
 *                        Prepared statements tidak didukung di mode itu.
 *  - `idle_timeout`    : 20 detik TERLALU PENDEK. Koneksi ditutup saat katalog
 *                        sepi, lalu pengunjung berikutnya membayar ~1,5 detik
 *                        untuk menyambung ulang + TLS. Dinaikkan ke 5 menit
 *                        supaya koneksi tetap hidup di antara kunjungan.
 *  - `max`             : 10 koneksi cukup untuk lalu lintas saat ini. Terlalu
 *                        besar justru memaksa Neon membuka koneksi baru
 *                        (mahal), terlalu kecil membuat permintaan antre.
 *  - `connect_timeout` : 15 detik, longgar karena jaraknya jauh.
 *  - `max_lifetime`    : didaur ulang tiap 30 menit supaya tidak menahan
 *                        koneksi basi selamanya.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL belum diset. Salin .env.example ke .env.local dan isi nilainya.",
  );
}

const globalForDb = globalThis as unknown as {
  __pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__pgClient ??
  postgres(connectionString, {
    prepare: false,
    max: 10,
    // 5 menit, bukan 20 detik — lihat catatan di atas.
    idle_timeout: 300,
    connect_timeout: 15,
    max_lifetime: 60 * 30,
  });

// Simpan di global SELALU (bukan hanya non-produksi): di Vercel, satu instance
// fungsi dipakai ulang antar-permintaan, jadi koneksi yang sudah terbuka harus
// dipertahankan. Tanpa ini, setiap permintaan membuka koneksi baru.
globalForDb.__pgClient = client;

export const db = drizzle(client, { schema });
export { client };
