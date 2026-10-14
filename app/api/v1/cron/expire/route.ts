import { db } from "@/db";
import { listings } from "@/db/schema";
import { and, eq, lt } from "drizzle-orm";
import { tanggalHariIniID } from "@/lib/format";
import { ok, gagal } from "@/lib/api";
import { bersihkanRateLimit } from "@/lib/rate-limit";
import { bersihkanPageview } from "@/lib/analytics";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/v1/cron/expire — tandai listing lewat tenggat jadi EXPIRED (FR-6).
 *
 * Dilindungi CRON_SECRET: Vercel Cron mengirim header
 * `Authorization: Bearer $CRON_SECRET`. Tanpa itu, endpoint ini bisa
 * dipanggil siapa saja untuk mengubah status listing orang.
 *
 * CATATAN PENTING soal Vercel Hobby:
 * Hobby hanya boleh 1 cron/hari dan jamnya TIDAK presisi (bisa meleset
 * beberapa jam dari 00:01 WIB). Karena itu:
 *   - Query feed SUDAH memfilter `deadline_date >= hari ini`, jadi listing
 *     lewat tenggat tidak akan muncul di feed meski cron belum jalan.
 *   - Cron ini hanya MERAPIKAN status di database (supaya dashboard penjual
 *     menampilkan "Kedaluwarsa" dengan benar) dan membersihkan rate limit.
 * Jadi keterlambatan cron tidak berdampak ke pengguna.
 */
export async function GET(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;

    // Kalau CRON_SECRET belum diset, tolak semua (fail-closed).
    if (!secret) {
      return gagal("Cron belum dikonfigurasi.", 503);
    }

    const auth = req.headers.get("authorization") ?? "";
    const sah = auth === `Bearer ${secret}`;

    if (!sah) return gagal("Tidak diizinkan.", 401);

    const hariIni = tanggalHariIniID();

    const kedaluwarsa = await db
      .update(listings)
      .set({ status: "EXPIRED", updatedAt: new Date() })
      .where(
        and(
          eq(listings.status, "AVAILABLE"),
          lt(listings.deadlineDate, hariIni),
        ),
      )
      .returning({ id: listings.id });

    const dibersihkan = await bersihkanRateLimit();

    /*
     * Kunjungan lama juga dibersihkan di sini.
     *
     * KENAPA DI CRON YANG SAMA, bukan cron terpisah: Vercel Hobby hanya
     * mengizinkan satu cron per hari. Menambah cron kedua berarti salah
     * satunya tidak akan pernah jalan di paket ini, dan itu lebih buruk
     * daripada menggabungkannya.
     */
    const kunjunganDibersihkan = await bersihkanPageview();

    return ok({
      ok: true,
      dijadikan_expired: kedaluwarsa.length,
      rate_limit_dibersihkan: dibersihkan,
      kunjungan_dibersihkan: kunjunganDibersihkan,
      dijalankan_pada: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[cron expire] gagal:", e);
    return gagal("Cron gagal dijalankan.", 500);
  }
}
