import { db } from "@/db";
import { listings } from "@/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { ok, gagal, ipKlien } from "@/lib/api";
import {
  cekRateLimit,
  lepaskanRateLimit,
  reservasiRateLimit,
} from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { tanggalHariIniID } from "@/lib/format";

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
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  let idReservasi: string | undefined;
  try {
    const { id } = await ctx.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return gagal("Barang tidak ditemukan.", 404);

    /*
     * Rate limit.
     *
     * KENAPA PERLU: tanpa batas, endpoint ini bisa dipanggil berulang untuk
     * memanen nomor WhatsApp penjual satu per satu. Nomor memang tidak pernah
     * dikirim ke browser, tapi URL wa.me yang dikembalikan MEMUAT nomor itu,
     * jadi memanggil endpoint ini berkali-kali sama saja dengan mengambil
     * nomornya. PRD §12 Risiko 2 menyebut proteksi dari "scraping otomatis",
     * dan inilah tempat yang dimaksud.
     *
     * Batasnya 60/jam, jauh lebih longgar dari 5/jam milik pemasangan barang:
     * pembeli wajar menghubungi beberapa penjual sekaligus, dan satu kampus
     * sering berbagi satu alamat IP. Lihat lib/rate-limit.ts.
     *
     * Pemeriksaan dilakukan SEBELUM query database, jadi permintaan yang
     * ditolak tidak membebani database sama sekali.
     */
    const ip = ipKlien(req);
    const rl = await cekRateLimit(ip, "wa_click");
    if (!rl.boleh) {
      return gagal(
        "Terlalu banyak percobaan menghubungi penjual. Coba lagi nanti ya.",
        429,
      );
    }

    const [row] = await db
      .select({
        id: listings.id,
        title: listings.title,
        sellerName: listings.sellerName,
        sellerWhatsapp: listings.sellerWhatsapp,
        status: listings.status,
        deadlineDate: listings.deadlineDate,
        regencyName: listings.regencyName,
        districtName: listings.districtName,
        // Catatan akses dibaca di sini supaya bisa ikut ke pesan WhatsApp.
        // Ia tidak pernah dikirim ke browser sebagai data mentah.
        accessNotes: listings.accessNotes,
      })
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);

    if (!row || row.status === "DELETED") return gagal("Barang tidak ditemukan.", 404);
    if (row.status !== "AVAILABLE" || String(row.deadlineDate).slice(0, 10) < tanggalHariIniID()) {
      return gagal(
        row.status === "TAKEN" ? "Barang ini sudah diambil." : "Batas pengambilan barang ini sudah lewat.",
        409,
      );
    }

    const url = buildWhatsAppLink({
      sellerName: row.sellerName,
      itemTitle: row.title,
      wilayahNama:
        [row.districtName, row.regencyName].filter(Boolean).join(", ") || "sekitar",
      sellerWhatsapp: row.sellerWhatsapp,
      catatanAkses: row.accessNotes,
    });

    // Reservasi final dilakukan setelah validasi listing, namun sebelum
    // membuka kontak. Ini menutup race check-then-insert lintas instance.
    const reservasi = await reservasiRateLimit(ip, "wa_click");
    if (!reservasi.boleh) {
      return gagal(
        "Terlalu banyak percobaan menghubungi penjual. Coba lagi nanti ya.",
        429,
      );
    }
    idReservasi = reservasi.idReservasi;

    // Pemeriksaan diulang secara atomik agar perubahan status/tenggat yang
    // terjadi setelah SELECT tidak sempat membuka kontak listing yang tutup.
    const [bolehKontak] = await db
      .update(listings)
      .set({ whatsappClicks: sql`${listings.whatsappClicks} + 1` })
      .where(and(
        eq(listings.id, id),
        eq(listings.status, "AVAILABLE"),
        gte(listings.deadlineDate, tanggalHariIniID()),
      ))
      .returning({ id: listings.id });

    if (!bolehKontak) {
      await lepaskanRateLimit(idReservasi);
      idReservasi = undefined;
      return gagal("Barang ini sudah tidak tersedia untuk diambil.", 409);
    }

    // Klik sukses; pertahankan catatan rate limit.
    idReservasi = undefined;
    return ok({ url });
  } catch (e) {
    if (idReservasi) {
      try {
        await lepaskanRateLimit(idReservasi);
      } catch (releaseError) {
        logger.error("[wa-click] gagal melepas reservasi rate limit:", releaseError);
      }
    }
    logger.error("[wa-click] gagal:", e);
    return gagal("Gagal membuka WhatsApp.", 500);
  }
}
