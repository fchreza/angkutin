import { NextResponse } from "next/server";
import { z } from "zod";
import { sudahMasuk, adminSiap } from "@/lib/admin";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/admin/listings/edit — ubah cepat field listing.
 *
 * KENAPA HANYA FIELD TERTENTU: edit admin untuk perbaikan ringan —
 * typo judul, harga salah ketik, info sensitif kelewat di deskripsi,
 * patokan lokasi perlu dikoreksi. Field sensitif (nomor WhatsApp penjual,
 * token rahasia, status) tidak bisa diubah dari sini.
 *
 * KENAPA TIDAK ADA RIWAYAT PERUBAHAN: skala produk ini kecil dan adminnya
 * satu orang. Menambah tabel audit untuk edit sesekali adalah over-engineering.
 */
const skema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(3).max(50),
  description: z.string().trim().min(10).max(2000),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  isFree: z.boolean().optional(),
  pickupLandmark: z.string().trim().min(3).max(150),
});

export async function POST(req: Request) {
  if (!adminSiap()) {
    return NextResponse.json({ error: "Admin belum dikonfigurasi." }, { status: 503 });
  }

  if (!(await sudahMasuk())) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }

  const parsed = skema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid.", detail: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const d = parsed.data;

  try {
    const [diubah] = await db
      .update(listings)
      .set({
        title: d.title,
        description: d.description,
        price: d.isFree ? "0" : (d.price ?? "0"),
        isFree: d.isFree ?? false,
        pickupLandmark: d.pickupLandmark,
        updatedAt: new Date(),
      })
      .where(eq(listings.id, d.id))
      .returning({ id: listings.id });

    if (!diubah) {
      return NextResponse.json({ error: "Barang tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ diubah: true });
  } catch (e) {
    logger.error("[admin edit listing] gagal:", e);
    return NextResponse.json({ error: "Gagal menyimpan. Coba lagi." }, { status: 500 });
  }
}
