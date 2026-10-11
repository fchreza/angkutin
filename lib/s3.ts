import { S3Client } from "@aws-sdk/client-s3";

/**
 * Klien S3 untuk Neon Object Storage.
 *
 * Catatan penting:
 * - `forcePathStyle: true` WAJIB — Neon Object Storage memakai path-style
 *   (`endpoint/bucket/key`), bukan virtual-host style.
 * - Kredensial hanya dipakai di sisi server (API route). Jangan pernah
 *   mengekspos AWS_SECRET_ACCESS_KEY ke klien.
 * - Bucket `angkutin` bersifat `public_read`, jadi URL objek bisa dibuka
 *   langsung tanpa presigned URL — itu yang dipakai untuk foto listing.
 */

const endpoint = process.env.AWS_ENDPOINT_URL_S3;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION || "ap-southeast-1";

export const BUCKET = process.env.S3_BUCKET || "angkutin";

export const s3Siap = Boolean(endpoint && accessKeyId && secretAccessKey);

export const s3 = new S3Client({
  endpoint,
  region,
  credentials: {
    accessKeyId: accessKeyId ?? "",
    secretAccessKey: secretAccessKey ?? "",
  },
  forcePathStyle: true,
});

/**
 * URL publik sebuah objek. Karena bucket `public_read`, URL ini bisa
 * langsung dipakai di <img src>. Tidak perlu presigned URL.
 */
export function urlPublik(key: string): string {
  return `${endpoint}/${BUCKET}/${key}`;
}

/**
 * Key objek untuk foto listing: `listings/{listingId}/{urutan}-{versi}.webp`
 * Dipisah per listing supaya penghapusan listing bisa menghapus seluruh
 * folder-nya dengan satu prefix.
 *
 * KENAPA ADA VERSI:
 * Key dulu hanya `{urutan}.webp` dan objeknya dikirim dengan header
 * `Cache-Control: immutable` selama 1 tahun. Akibatnya, saat penjual MENGGANTI
 * foto, browser (dan CDN) terus menyajikan foto LAMA dari cache — penjual
 * melihat fotonya "tidak berubah" padahal di server sudah baru.
 *
 * Dengan menyisipkan versi, setiap penggantian menghasilkan URL baru, jadi
 * cache lama tidak pernah terpakai lagi. Objek lama dihapus oleh pemanggil.
 */
export function keyFoto(listingId: string, urutan: number, versi?: string): string {
  const v = versi ? `-${versi}` : "";
  return `listings/${listingId}/${urutan}${v}.webp`;
}
