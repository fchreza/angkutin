import { createHash } from "node:crypto";
import { db } from "@/db";
import { blockedNumbers } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Normalisasi nomor WhatsApp sebelum di-hash.
 *
 * KENAPA: pengguna menulis nomor dengan banyak varian — "0812…", "+62812…",
 * "62812…", pakai spasi atau strip. Tanpa normalisasi, pemblokiran mudah
 * diakali hanya dengan menulis ulang nomornya.
 *
 * Aturan: buang semua non-digit, lalu samakan awalan ke format "62".
 * "081234" → "6281234"; "+6281234" → "6281234"; "6281234" tetap.
 */
export function normalisasiNomor(wa: string): string {
  const digit = wa.replace(/\D/g, "");
  if (digit.startsWith("0")) return `62${digit.slice(1)}`;
  return digit;
}

/** Hash SHA-256 heksadesimal dari nomor yang sudah dinormalisasi. */
export function hashNomor(wa: string): string {
  return createHash("sha256").update(normalisasiNomor(wa)).digest("hex");
}

/** True bila nomor ini diblokir admin. */
export async function nomorDiblokir(wa: string): Promise<boolean> {
  const [baris] = await db
    .select({ id: blockedNumbers.id })
    .from(blockedNumbers)
    .where(eq(blockedNumbers.id, hashNomor(wa)))
    .limit(1);
  return !!baris;
}

/** Blokir nomor. Idempoten — memblokir yang sudah diblokir tidak error. */
export async function blokirNomor(wa: string, alasan?: string): Promise<void> {
  await db
    .insert(blockedNumbers)
    .values({ id: hashNomor(wa), alasan: alasan ?? null })
    .onConflictDoNothing();
}

/** Buka blokir nomor. Mengembalikan true bila ada yang dibuka. */
export async function bukaBlokirNomor(hashId: string): Promise<boolean> {
  const [dihapus] = await db
    .delete(blockedNumbers)
    .where(eq(blockedNumbers.id, hashId))
    .returning({ id: blockedNumbers.id });
  return !!dihapus;
}

/** Daftar semua nomor yang diblokir, terbaru dulu. ID-nya hash, bukan nomor asli. */
export async function daftarBlokir(): Promise<
  { id: string; alasan: string | null; createdAt: Date }[]
> {
  return db
    .select({
      id: blockedNumbers.id,
      alasan: blockedNumbers.alasan,
      createdAt: blockedNumbers.createdAt,
    })
    .from(blockedNumbers)
    .orderBy(blockedNumbers.createdAt);
}
