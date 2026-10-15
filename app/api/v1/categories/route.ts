import { db } from "@/db";
import { categories } from "@/db/schema";
import { asc } from "drizzle-orm";
import { ok, gagal } from "@/lib/api";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** GET /api/v1/categories — daftar kategori untuk filter pills (FR-2). */
export async function GET() {
  try {
    const data = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(categories)
      .orderBy(asc(categories.displayOrder));

    return ok({ data, total: data.length });
  } catch (e) {
    logger.error("[categories] gagal:", e);
    return gagal("Gagal memuat kategori.", 500);
  }
}
