import { randomBytes } from "node:crypto";

/**
 * Token rahasia untuk dashboard penjual tanpa akun (FR-4).
 *
 * PRD-Enhanced mensyaratkan: generator acak KRIPTOGRAFIS, min. 32 karakter,
 * entropy tinggi. `randomBytes(32)` -> base64url = 43 karakter.
 *
 * Token ini adalah SATU-SATUNYA kunci akses ke dashboard kelola listing,
 * jadi jangan pernah memakai Math.random() atau UUID yang bisa ditebak.
 */
export function generateSecretToken(): string {
  return randomBytes(32).toString("base64url");
}

/** URL-safe, panjang tepat 43 karakter untuk 32 byte. */
export const PANJANG_TOKEN = 43;

/**
 * Bandingkan token dengan waktu tetap (constant-time) supaya lama proses
 * tidak membocorkan berapa karakter awal yang sudah benar.
 */
export function tokenCocok(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  let beda = 0;
  for (let i = 0; i < a.length; i++) beda |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return beda === 0;
}

/**
 * Hash IP untuk rate limiting tanpa menyimpan IP mentah (privasi).
 * IP asli tidak pernah masuk database.
 */
export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`angkutin:${ip}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
