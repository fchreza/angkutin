import { z } from "zod";
import { db } from "@/db";
import { listings, reports, REPORT_REASON_VALUES } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, gagal, ipKlien } from "@/lib/api";
import { cekRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/reports — laporkan listing yang bermasalah (spam, penipuan,
 * konten tidak pantas, dll).
 *
 * KENAPA TANPA IDENTITAS PELAPOR: produk ini tanpa akun. Meminta identitas
 * akan menambah gesekan dan data pribadi yang harus dijaga, sementara yang
 * dibutuhkan admin hanyalah "listing mana" dan "kenapa".
 *
 * KENAPA HANYA MENYIMPAN, bukan langsung menindak: laporan bisa salah atau
 * jahat (laporan massal ke kompetitor). Keputusan tetap di tangan admin lewat
 * halaman /admin; endpoint ini hanya mencatat ke antrian.
 */

const skema = z.object({
  // Harus UUID barang yang valid — tanpa ini, laporan bisa menunjuk ke
  // id sembarang dan mengotori antrian.
  listing_id: z.string().uuid(),
  reason: z.enum(REPORT_REASON_VALUES),
  // Keterangan tambahan opsional, dibatasi supaya tidak jadi tempat sampah.
  detail: z.string().trim().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    // 1. Rate limit: 10 laporan/jam/IP — cukup untuk beberapa laporan
    // berurutan, terlalu sempit untuk membanjiri antrian moderasi.
    const ip = ipKlien(req);
    const rl = await cekRateLimit(ip, "report_listing");
    if (!rl.boleh) {
      return gagal(
        "Terlalu banyak laporan dari jaringan ini. Coba lagi nanti.",
        429,
      );
    }

    // 2. Validasi body.
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return gagal("Format permintaan tidak valid.", 400);
    }
    const parsed = skema.safeParse(body);
    if (!parsed.success) {
      return gagal("Data laporan tidak valid.", 400);
    }
    const d = parsed.data;

    // 3. Pastikan listing-nya benar-benar ada (dan belum dihapus).
    // Tanpa ini, antrian admin penuh dengan laporan untuk id yang tidak ada.
    const [ada] = await db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.id, d.listing_id))
      .limit(1);
    if (!ada) {
      return gagal("Barang tidak ditemukan.", 404);
    }

    // 4. Simpan laporan. Idempotensi longgar: laporan ganda untuk listing
    // yang sama tetap dicatat — admin yang menilai, bukan endpoint ini.
    await db.insert(reports).values({
      listingId: d.listing_id,
      reason: d.reason,
      detail: d.detail || null,
    });

    return ok({ terkirim: true }, 201);
  } catch (e) {
    logger.error("[reports POST] gagal:", e);
    return gagal("Gagal mengirim laporan. Coba lagi sebentar.", 500);
  }
}
