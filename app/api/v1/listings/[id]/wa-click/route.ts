import { db } from "@/db";
import { listings } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { ok, gagal } from "@/lib/api";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { clusters } from "@/db/schema";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/listings/:id/wa-click — bangun link WhatsApp + catat klik.
 *
 * Kenapa lewat server, bukan langsung di klien:
 * 1. Nomor WhatsApp penjual TIDAK PERNAH dikirim ke browser (anti-scraping,
 *    NFR §11 no.2). Klien hanya menerima URL wa.me yang sudah jadi.
 * 2. Klik tercatat untuk KPI "Listing-to-Chat Conversion" (target ≥ 35%),
 *    yang wajib tampil di Seller Dashboard (PRD §3.2 ENHANCED).
 *
 * Mengembalikan { url } — klien melakukan window.open(url).
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return gagal("Barang tidak ditemukan.", 404);

    const [row] = await db
      .select({
        id: listings.id,
        title: listings.title,
        sellerName: listings.sellerName,
        sellerWhatsapp: listings.sellerWhatsapp,
        status: listings.status,
        clusterName: clusters.name,
      })
      .from(listings)
      .leftJoin(clusters, eq(listings.clusterId, clusters.id))
      .where(eq(listings.id, id))
      .limit(1);

    if (!row) return gagal("Barang tidak ditemukan.", 404);
    if (row.status === "DELETED") return gagal("Barang tidak ditemukan.", 404);

    await db
      .update(listings)
      .set({ whatsappClicks: sql`${listings.whatsappClicks} + 1` })
      .where(eq(listings.id, id));

    const url = buildWhatsAppLink({
      sellerName: row.sellerName,
      itemTitle: row.title,
      clusterName: row.clusterName ?? "sekitar",
      sellerWhatsapp: row.sellerWhatsapp,
    });

    return ok({ url });
  } catch (e) {
    console.error("[wa-click] gagal:", e);
    return gagal("Gagal membuka WhatsApp.", 500);
  }
}
