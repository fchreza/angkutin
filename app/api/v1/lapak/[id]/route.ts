import { db } from "@/db";
import { listings } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { ok, gagal } from "@/lib/api";
import { periksaAkses } from "@/lib/lapak";
import { tokenCocok } from "@/lib/token";
import { stalls } from "@/db/schema";
import { tokenSesiKelola } from "@/lib/manage-session";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET  /api/v1/lapak/[id]           -> daftar barang + nama lapak
 * PATCH /api/v1/lapak/[id]           -> ubah nama lapak
 *
 * Semua akses diverifikasi lewat `periksaAkses`, jadi aturan otorisasi hanya
 * ada di satu tempat.
 */

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = tokenSesiKelola(req, id);

    const akses = await periksaAkses(id, token);
    // Pesan yang sama untuk "tidak ada" dan "token salah" — bedanya akan
    // membocorkan id mana yang benar-benar ada.
    if (!akses) return gagal("Tautan tidak valid.", 403);

    // Akses lewat token BARANG: hanya boleh melihat barangnya sendiri, dan
    // jawabannya dibungkus sebagai daftar berisi satu barang. Dengan begitu
    // dashboard bisa memakai satu bentuk data untuk kedua jenis tautan.
    if (akses.jenis === "barang") {
      const barang = await db
        .select({ id: listings.id, title: listings.title, status: listings.status })
        .from(listings)
        .where(eq(listings.id, akses.listingId));
      return ok({ jenis: "barang", nama: null, barang });
    }

    const barang = await db
      .select({
        id: listings.id,
        title: listings.title,
        status: listings.status,
        createdAt: listings.createdAt,
      })
      .from(listings)
      .where(eq(listings.stallId, akses.stallId))
      .orderBy(desc(listings.createdAt));

    return ok({ jenis: "lapak", nama: akses.nama, barang });
  } catch (e) {
    logger.error("[lapak GET] gagal:", e);
    return gagal("Gagal memuat lapak.", 500);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return gagal("Format permintaan tidak valid.", 400);
    }

    const b = body as { nama?: unknown; pindahkan_listing_id?: unknown };
    const token = tokenSesiKelola(req, id);

    const akses = await periksaAkses(id, token);
    if (!akses) return gagal("Tautan tidak valid.", 403);

    // --- Pindahkan barang lama (yang belum punya lapak) ke lapak ini ---
    //
    // INI ALUR PEMINDAHAN YANG AMAN, dan sengaja hanya berlaku untuk BARANG
    // YANG BELUM PUNYA LAPAK:
    //   - Pemilik barang membuktikan dirinya dengan token BARANG-nya sendiri
    //     (dikirim sebagai `listing_token`), bukan dengan token lapak.
    //   - Barang yang SUDAH punya lapak tidak boleh dipindahkan lewat sini.
    //     Tanpa aturan itu, pemilik lapak A bisa menarik barang lapak B ke
    //     lapaknya hanya dengan mengetahui id barangnya.
    if (typeof b.pindahkan_listing_id === "string") {
      if (akses.jenis !== "lapak") {
        return gagal("Hanya tautan lapak yang bisa memindahkan barang.", 403);
      }

      const listingToken = typeof (b as { listing_token?: unknown }).listing_token === "string"
        ? (b as { listing_token: string }).listing_token
        : "";

      const [barang] = await db
        .select({ id: listings.id, secretToken: listings.secretToken, stallId: listings.stallId })
        .from(listings)
        .where(eq(listings.id, b.pindahkan_listing_id))
        .limit(1);

      if (!barang) return gagal("Barang tidak ditemukan.", 404);
      if (!tokenCocok(listingToken, barang.secretToken)) {
        return gagal("Token barang tidak cocok.", 403);
      }
      if (barang.stallId) {
        return gagal("Barang ini sudah punya lapak.", 409);
      }

      await db
        .update(listings)
        .set({ stallId: akses.stallId, updatedAt: new Date() })
        .where(and(eq(listings.id, barang.id), isNull(listings.stallId)));

      return ok({ dipindahkan: barang.id });
    }

    // --- Ubah nama lapak ---
    if (typeof b.nama === "string") {
      if (akses.jenis !== "lapak") return gagal("Hanya tautan lapak yang bisa diubah.", 403);
      const nama = b.nama.trim().slice(0, 60) || null;
      await db
        .update(stalls)
        .set({ displayName: nama, updatedAt: new Date() })
        .where(eq(stalls.id, akses.stallId));
      return ok({ nama });
    }

    return gagal("Tidak ada yang diubah.", 400);
  } catch (e) {
    logger.error("[lapak PATCH] gagal:", e);
    return gagal("Gagal memperbarui lapak.", 500);
  }
}
