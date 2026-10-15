import { db } from "@/db";
import { pageviews } from "@/db/schema";
import { ok, gagal } from "@/lib/api";
import { z } from "zod";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/analytics/pageview — catat satu kunjungan halaman.
 *
 * KENAPA TIDAK ADA RATE LIMIT DI SINI, padahal endpoint lain punya:
 * Endpoint ini hanya menulis satu baris kecil dan tidak mengembalikan data
 * apa pun. Membatasinya justru berbahaya bagi keakuratan: satu pengguna yang
 * menelusuri katalog dengan cepat akan menghasilkan banyak kunjungan yang
 * semuanya SAH, dan membatasinya berarti kehilangan data justru dari pengguna
 * yang paling aktif. Penyalahgunaan di sini paling buruk adalah tabel yang
 * membesar, dan itu sudah ditangani pembersihan berkala di cron.
 *
 * Tidak ada data sensitif yang masuk, jadi tidak ada yang bisa dipanen.
 */

/**
 * Skema masukan.
 *
 * `width` dibatasi 0-10000 dan dibulatkan lagi di server, bukan hanya di
 * klien. Klien bisa saja sudah diubah, dan nilai aneh seperti negatif atau
 * angka raksasa akan merusak perhitungan statistik di kemudian hari.
 *
 * `path` dibatasi panjangnya dan TIDAK boleh memuat query string. Pemeriksaan
 * `?` di sini adalah lapisan kedua: kalau ada klien yang mengirim token
 * lapak, permintaannya ditolak alih-alih tokennya tersimpan.
 */
const skema = z.object({
  path: z
    .string()
    .min(1)
    .max(200)
    .refine((p) => !p.includes("?"), "Jalur tidak boleh memuat query string")
    .refine((p) => p.startsWith("/"), "Jalur harus diawali garis miring"),
  referrer: z.enum(["langsung", "internal", "whatsapp", "mesin-cari", "lainnya"]),
  width: z.number().int().min(0).max(10000),
});

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return gagal("Format permintaan tidak valid.", 400);
    }

    const parsed = skema.safeParse(body);
    if (!parsed.success) return gagal("Data kunjungan tidak valid.", 400);

    const { path, referrer, width } = parsed.data;

    /*
     * Halaman kelola dan admin tidak pernah dicatat.
     *
     * Klien sudah menyaringnya, tapi penyaringan di server ini WAJIB ada
     * sebagai lapisan kedua. Kalau suatu saat ada klien lain yang memanggil
     * endpoint ini, satu baris saja yang memuat jalur kelola berarti
     * aktivitas pribadi pemilik barang tercatat di analitik, dan satu baris
     * dari halaman admin berarti kunjungan pemilik situs mengotori angka
     * yang sedang ia baca.
     */
    if (path.startsWith("/manage") || path.startsWith("/admin"))
      return ok({ dicatat: false });

    await db.insert(pageviews).values({
      path,
      referrer,
      // Dibulatkan lagi di server: nilai dari klien tidak dipercaya.
      width: Math.round(width / 50) * 50,
    });

    return ok({ dicatat: true });
  } catch (e) {
    logger.error("[analytics] gagal:", e);
    /*
     * Mengembalikan 500 di sini tidak berguna: klien sengaja mengabaikan
     * kegagalan analytics, jadi statusnya tidak akan pernah dibaca siapa pun.
     * Yang penting kegagalannya tercatat di log server.
     */
    return gagal("Gagal mencatat kunjungan.", 500);
  }
}
