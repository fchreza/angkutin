import { NextResponse } from "next/server";
import { z } from "zod";
import { sudahMasuk, adminSiap } from "@/lib/admin";
import { blokirNomor, bukaBlokirNomor, daftarBlokir } from "@/lib/blokir";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/blokir — daftar nomor yang diblokir.
 * POST /api/v1/admin/blokir — blokir satu nomor WhatsApp.
 * DELETE /api/v1/admin/blokir — buka blokir (body: { id: hash }).
 *
 * KENAPA POST MEMAKAI NOMOR ASLI: admin menyalin nomor dari daftar barang
 * (atau mengetiknya). Server yang menormalisasi + meng-hash — nomor asli
 * tidak pernah disimpan.
 */

const skemaBlokir = z.object({
  // Nomor apa adanya, mis. "0812-3456-7890". Normalisasi di server.
  nomor: z.string().min(9).max(20).optional(),
  // Alternatif: blokir via ID listing — server mengambil nomor penjualnya.
  // Dipakai dari daftar barang supaya nomor asli tidak perlu dikirim ke browser.
  listingId: z.string().uuid().optional(),
  alasan: z.string().trim().max(200).optional(),
}).refine((d) => d.nomor || d.listingId, {
  message: "nomor atau listingId wajib diisi",
});

const skemaBuka = z.object({
  // Hash SHA-256 heksadesimal (64 karakter) dari daftar.
  id: z.string().length(64),
});

async function otorisasi(): Promise<NextResponse | null> {
  if (!adminSiap()) {
    return NextResponse.json({ error: "Admin belum dikonfigurasi." }, { status: 503 });
  }
  if (!(await sudahMasuk())) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const tolak = await otorisasi();
  if (tolak) return tolak;
  const daftar = await daftarBlokir();
  return NextResponse.json({
    data: daftar.map((d) => ({
      id: d.id,
      // Tampilkan 8 karakter pertama hash sebagai identifikasi visual.
      // Nomor aslinya tidak disimpan di mana pun.
      hashPendek: d.id.slice(0, 8),
      alasan: d.alasan,
      createdAt: d.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const tolak = await otorisasi();
  if (tolak) return tolak;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }
  const parsed = skemaBlokir.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nomor tidak valid." }, { status: 400 });
  }

  try {
    // Blokir via listing: ambil nomor penjual di server supaya nomor asli
    // tidak pernah dikirim ke browser.
    const nomor = parsed.data.listingId
      ? (
          await db
            .select({ wa: listings.sellerWhatsapp })
            .from(listings)
            .where(eq(listings.id, parsed.data.listingId))
            .limit(1)
        )[0]?.wa
      : parsed.data.nomor;

    if (!nomor) {
      return NextResponse.json({ error: "Barang tidak ditemukan." }, { status: 404 });
    }

    await blokirNomor(nomor, parsed.data.alasan);
    return NextResponse.json({ diblokir: true });
  } catch (e) {
    logger.error("[admin blokir] gagal:", e);
    return NextResponse.json({ error: "Gagal memblokir. Coba lagi." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const tolak = await otorisasi();
  if (tolak) return tolak;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }
  const parsed = skemaBuka.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const dibuka = await bukaBlokirNomor(parsed.data.id);
  if (!dibuka) {
    return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
  }
  return NextResponse.json({ dibuka: true });
}
