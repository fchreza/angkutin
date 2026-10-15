import { db } from "@/db";
import { listings } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { ambilDetail } from "@/lib/listing-query";
import { ok, gagal } from "@/lib/api";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/listings/:id — detail barang publik (FR-2 / Layar 2).
 *
 * PENTING: `seller_whatsapp` sengaja TIDAK dikembalikan ke klien. Nomor
 * penjual hanya dipakai server untuk membangun link wa.me, dan itu dilakukan
 * di endpoint terpisah (POST /wa-click). Ini mencegah scraping nomor
 * (NFR §11 no.2) — nomor tidak pernah ada di payload publik.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;

    // Validasi bentuk UUID supaya tidak query dengan string sampah
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return gagal("Barang tidak ditemukan.", 404);
    }

    const detail = await ambilDetail(id);
    if (!detail) return gagal("Barang tidak ditemukan.", 404);

    // Naikkan penghitung tampilan (untuk KPI view -> CTR)
    await db
      .update(listings)
      .set({ viewCount: sql`${listings.viewCount} + 1` })
      .where(eq(listings.id, id));

    /*
     * Tidak ada lagi yang perlu dibuang di sini.
     *
     * KENAPA: `ambilDetail` sekarang hanya mengambil kolom yang boleh publik.
     * Nomor WhatsApp dan catatan akses tidak pernah masuk ke hasilnya, jadi
     * penyaringan di lapisan ini tidak lagi diperlukan.
     *
     * Mempertahankan penyaringan di sini justru berbahaya: ia menyiratkan
     * bahwa query-nya masih mengambil kolom sensitif, dan orang berikutnya
     * yang membaca akan mengira lapisan inilah yang melindunginya. Satu
     * lapisan yang benar lebih baik daripada dua lapisan yang saling
     * menyalahkan.
     */
    return ok(detail);
  } catch (e) {
    logger.error("[listing detail] gagal:", e);
    return gagal("Gagal memuat detail barang.", 500);
  }
}
