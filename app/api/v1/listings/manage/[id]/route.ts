import { db } from "@/db";
import { categories, clusters, listings, listingImages } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { ok, gagal } from "@/lib/api";
import { tokenCocok } from "@/lib/token";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/listings/manage/:id?token= — data kelola listing (FR-4).
 *
 * Keamanan (PRD §FR-4 ENHANCED):
 * - Token dibandingkan dengan waktu tetap (constant-time).
 * - Token salah -> 404, BUKAN 403, supaya penyerang tidak bisa membedakan
 *   antara "listing tidak ada" dan "token salah" (mencegah enumerasi).
 * - Token hanya dibaca dari query param, tidak pernah dari localStorage.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const token = new URL(req.url).searchParams.get("token");

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return gagal("Tautan pengelolaan tidak valid atau sudah kedaluwarsa", 404);
    }

    const [row] = await db
      .select({
        id: listings.id,
        secretToken: listings.secretToken,
        title: listings.title,
        description: listings.description,
        price: listings.price,
        isFree: listings.isFree,
        condition: listings.condition,
        status: listings.status,
        deadlineDate: listings.deadlineDate,
        pickupLandmark: listings.pickupLandmark,
        accessNotes: listings.accessNotes,
        sellerName: listings.sellerName,
        sellerWhatsapp: listings.sellerWhatsapp,
        viewCount: listings.viewCount,
        whatsappClicks: listings.whatsappClicks,
        createdAt: listings.createdAt,
        updatedAt: listings.updatedAt,
        clusterId: listings.clusterId,
        clusterName: clusters.name,
        categoryId: listings.categoryId,
        categoryName: categories.name,
      })
      .from(listings)
      .leftJoin(clusters, eq(listings.clusterId, clusters.id))
      .leftJoin(categories, eq(listings.categoryId, categories.id))
      .where(eq(listings.id, id))
      .limit(1);

    if (!row || !tokenCocok(token, row.secretToken)) {
      return gagal("Tautan pengelolaan tidak valid atau sudah kedaluwarsa", 404);
    }

    const foto = await db
      .select({
        image_url: listingImages.imageUrl,
        display_order: listingImages.displayOrder,
      })
      .from(listingImages)
      .where(eq(listingImages.listingId, id))
      .orderBy(asc(listingImages.displayOrder));

    const { secretToken: _t, ...data } = row;
    void _t;

    return ok({
      ...data,
      created_at: data.createdAt.toISOString(),
      updated_at: data.updatedAt.toISOString(),
      deadline_date: String(data.deadlineDate).slice(0, 10),
      images: foto,
      // Statistik KPI yang wajib tampil di dashboard (PRD §3.2 ENHANCED)
      stat: {
        view: data.viewCount,
        wa_click: data.whatsappClicks,
        ctr:
          data.viewCount > 0
            ? Math.round((data.whatsappClicks / data.viewCount) * 100)
            : 0,
      },
    });
  } catch (e) {
    console.error("[manage GET] gagal:", e);
    return gagal("Gagal memuat data pengelolaan.", 500);
  }
}
