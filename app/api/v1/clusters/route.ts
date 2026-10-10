import { NextResponse } from "next/server";
import { db } from "@/db";
import { clusters } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { ok, gagal } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/v1/clusters — daftar kluster aktif (FR-1). */
export async function GET() {
  try {
    const data = await db
      .select({
        id: clusters.id,
        name: clusters.name,
        city: clusters.city,
      })
      .from(clusters)
      .where(eq(clusters.isActive, true))
      .orderBy(asc(clusters.name));

    return ok({ data, total: data.length });
  } catch (e) {
    console.error("[clusters] gagal:", e);
    return gagal("Gagal memuat daftar kluster.", 500);
  }
}
