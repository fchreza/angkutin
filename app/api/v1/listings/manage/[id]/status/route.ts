import { db } from "@/db";
import { listings, listingImages } from "@/db/schema";
import { DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { ok, gagal, bacaJson } from "@/lib/api";
import { tokenCocok } from "@/lib/token";
import { statusSchema } from "@/lib/validators";
import { BUCKET, s3, s3Siap } from "@/lib/s3";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/v1/listings/manage/:id/status — ubah status listing (FR-4).
 *
 * Status yang diizinkan dari dashboard penjual:
 *   TAKEN     -> barang sudah diambil (kartu jadi abu-abu + badge)
 *   AVAILABLE -> batalkan "sudah diambil"
 *   DELETED   -> hapus permanen; foto ikut dihapus dari Object Storage
 *                supaya kuota tidak terpakai sampah
 *
 * Token salah -> 404 (bukan 403), mencegah enumerasi.
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return gagal("Tautan pengelolaan tidak valid atau sudah kedaluwarsa", 404);
    }

    const body = await bacaJson(req);
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return gagal("Permintaan tidak valid.", 400);
    }

    const [row] = await db
      .select({ id: listings.id, secretToken: listings.secretToken })
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);

    if (!row || !tokenCocok(parsed.data.token, row.secretToken)) {
      return gagal("Tautan pengelolaan tidak valid atau sudah kedaluwarsa", 404);
    }

    const [diubah] = await db
      .update(listings)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(listings.id, id))
      .returning({
        id: listings.id,
        status: listings.status,
        updatedAt: listings.updatedAt,
      });

    // Kalau dihapus: bersihkan foto dari Object Storage juga.
    // Kalau gagal, listing TETAP terhapus dari database — foto yatim
    // lebih baik daripada listing yang tidak bisa dihapus.
    if (parsed.data.status === "DELETED" && s3Siap) {
      try {
        const foto = await db
          .select({ imageUrl: listingImages.imageUrl })
          .from(listingImages)
          .where(eq(listingImages.listingId, id));

        const keys = foto
          .map((f) => {
            const m = f.imageUrl.split(`/${BUCKET}/`);
            return m.length === 2 ? m[1] : null;
          })
          .filter((k): k is string => Boolean(k));

        if (keys.length === 1) {
          await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: keys[0] }));
        } else if (keys.length > 1) {
          await s3.send(
            new DeleteObjectsCommand({
              Bucket: BUCKET,
              Delete: { Objects: keys.map((Key) => ({ Key })) },
            }),
          );
        }
      } catch (err) {
        console.error("[status] gagal hapus foto:", err);
      }
    }

    return ok({
      id: diubah.id,
      status: diubah.status,
      updated_at: diubah.updatedAt.toISOString(),
    });
  } catch (e) {
    console.error("[status PATCH] gagal:", e);
    return gagal("Gagal memperbarui status.", 500);
  }
}
