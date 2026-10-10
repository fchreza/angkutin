import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { hashIp } from "@/lib/token";

/**
 * Rate limiting berbasis database (PRD §11 ENHANCED: maks 5 listing/jam/IP).
 *
 * Kenapa di database, bukan di memori: Vercel menjalankan banyak instance
 * serverless yang tidak berbagi memori, jadi penghitung in-memory tidak
 * akan akurat. Tabel `rate_limits` dibagi semua instance.
 *
 * IP TIDAK disimpan mentah — hanya hash SHA-256 (privasi, NFR §11 no.2).
 */

const BATAS = 5;
const JENDELA_JAM = 1;

/**
 * Periksa kuota TANPA memakainya.
 *
 * PENTING — kenapa dipisah dari `catatRateLimit`:
 * Dulu fungsi ini langsung mencatat percobaan. Akibatnya pengguna yang salah
 * mengetik nomor WhatsApp 5 kali akan terkunci 1 jam, padahal tidak satu pun
 * listing-nya tersimpan. Sekarang kuota hanya dipotong setelah listing BENAR
 * tersimpan (lihat catatRateLimit).
 */
export async function cekRateLimit(
  ip: string,
  aksi = "create_listing",
): Promise<{ boleh: boolean; sisa: number }> {
  const ipHash = await hashIp(ip);
  const sejak = new Date(Date.now() - JENDELA_JAM * 3600_000);

  const [{ jumlah }] = await db
    .select({ jumlah: sql<number>`count(*)::int` })
    .from(rateLimits)
    .where(
      and(
        eq(rateLimits.ipHash, ipHash),
        eq(rateLimits.action, aksi),
        gte(rateLimits.createdAt, sejak),
      ),
    );

  if (jumlah >= BATAS) return { boleh: false, sisa: 0 };
  return { boleh: true, sisa: BATAS - jumlah };
}

/** Catat satu percobaan yang BERHASIL. Panggil setelah data tersimpan. */
export async function catatRateLimit(
  ip: string,
  aksi = "create_listing",
): Promise<void> {
  const ipHash = await hashIp(ip);
  await db.insert(rateLimits).values({ ipHash, action: aksi });
}

/** Bersihkan catatan lama (dipanggil dari cron harian). */
export async function bersihkanRateLimit(): Promise<number> {
  const batas = new Date(Date.now() - 24 * 3600_000);
  const hasil = await db
    .delete(rateLimits)
    .where(lt(rateLimits.createdAt, batas))
    .returning({ id: rateLimits.id });
  return hasil.length;
}
