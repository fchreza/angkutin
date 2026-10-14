import { db } from "@/db";
import { listings } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { ok, gagal } from "@/lib/api";
import { buatLapak, urlLapak } from "@/lib/lapak";
import { generateSecretToken, tokenCocok } from "@/lib/token";
import { tokenSesiKelola } from "@/lib/manage-session";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/lapak — pindahkan barang LAMA ke lapak baru.
 *
 * KENAPA ENDPOINT INI ADA:
 * Barang yang dibuat sebelum fitur lapak tidak punya lapak, jadi hanya bisa
 * dikelola lewat tautan lamanya. Tanpa jalan pemindahan, penjual itu tidak
 * akan pernah bisa memakai dashboard lapak untuk barang lamanya.
 *
 * ALUR YANG AMAN (dan kenapa tiap langkahnya perlu):
 *
 *   1. Pemilik membuktikan dirinya dengan token BARANG-nya sendiri — bukan
 *      dengan id barang saja. Id barang ada di tautan publik, jadi id saja
 *      tidak membuktikan apa pun.
 *   2. Barang itu harus BELUM punya lapak. Tanpa syarat ini, siapa pun yang
 *      pernah melihat id sebuah barang bisa menariknya ke lapaknya sendiri.
 *   3. Barang dipindahkan, lalu lapak baru dikembalikan BESERTA tokennya.
 *      Token lapak baru hanya muncul di respons ini — tidak ada cara
 *      menemukannya lagi kalau penjual tidak menyimpannya.
 *
 * KENAPA TIDAK MEMAKAI LAPAK YANG SUDAH ADA:
 * Pemilik barang lama mungkin sudah punya lapak lain, tetapi kita TIDAK bisa
 * tahu yang mana tanpa meminta token lapaknya juga. Membuat lapak baru selalu
 * aman; menggabungkan ke lapak yang salah justru mencampur barang orang lain.
 * Kalau penjual ingin menyatukan, ia bisa membuka dashboard lapak tujuannya
 * dan memindahkan dari sana.
 */
export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return gagal("Format permintaan tidak valid.", 400);
    }

    const b = body as { listing_id?: unknown };
    const listingId = typeof b.listing_id === "string" ? b.listing_id : "";
    const listingToken = tokenSesiKelola(req, listingId);

    if (!listingId || !listingToken) {
      return gagal("Barang dan tokennya wajib diisi.", 400);
    }

    // 1. Cari barangnya.
    const [barang] = await db
      .select({
        id: listings.id,
        secretToken: listings.secretToken,
        stallId: listings.stallId,
      })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    // Pesan yang sama untuk "tidak ada" dan "token salah" — bedanya akan
    // membocorkan id mana yang benar-benar ada.
    if (!barang || !tokenCocok(listingToken, barang.secretToken)) {
      return gagal("Barang atau token tidak cocok.", 403);
    }

    // 2. Sudah punya lapak? Jangan pindahkan.
    if (barang.stallId) {
      return gagal("Barang ini sudah punya lapak.", 409);
    }

    // 3. Buat lapak baru, lalu pindahkan.
    const tokenLapakBaru = generateSecretToken();
    const lapak = await buatLapak(tokenLapakBaru);

    // Syarat `isNull(stallId)` diulang di sini supaya dua permintaan yang
    // berjalan bersamaan tidak bisa memindahkan barang yang sama dua kali.
    const dipindah = await db
      .update(listings)
      .set({ stallId: lapak.id, updatedAt: new Date() })
      .where(and(eq(listings.id, barang.id), isNull(listings.stallId)))
      .returning({ id: listings.id });

    if (dipindah.length === 0) {
      return gagal("Barang ini baru saja dipindahkan. Muat ulang halaman.", 409);
    }

    const origin = new URL(req.url).origin;
    return ok(
      {
        stall_id: lapak.id,
        stall_token: lapak.secretToken,
        stall_url: urlLapak(origin, lapak.id, lapak.secretToken),
      },
      201,
    );
  } catch (e) {
    console.error("[lapak POST] gagal:", e);
    return gagal("Gagal membuat lapak. Coba lagi sebentar.", 500);
  }
}
