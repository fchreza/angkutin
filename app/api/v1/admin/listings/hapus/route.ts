import { NextResponse } from "next/server";
import { z } from "zod";
import { sudahMasuk, adminSiap } from "@/lib/admin";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/admin/listings/hapus — hapus permanen satu listing.
 *
 * KENAPA HAPUS PERMANEN, bukan ubah status: tombol ini untuk listing
 * bermasalah (spam, penipuan, konten tidak pantas) yang dilaporkan pengguna.
 * Listing seperti itu tidak boleh bisa tayang lagi — bahkan oleh penjualnya
 * sendiri via tautan kelola. Laporan yang menunjuk ke listing ini ikut
 * terhapus via ON DELETE CASCADE di tabel reports.
 *
 * KENAPA BUTUH KONFIRMASI GANDA DI KLIEN: penghapusan tidak bisa dibatalkan.
 * Komponen tombol meminta konfirmasi dua kali (klik → "Yakin?" → eksekusi).
 */
const skema = z.object({
  id: z.string().uuid(),
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
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  try {
    const [dihapus] = await db
      .delete(listings)
      .where(eq(listings.id, parsed.data.id))
      .returning({ id: listings.id });

    if (!dihapus) {
      return NextResponse.json({ error: "Barang tidak ditemukan." }, { status: 404 });
    }

    // Catatan: file foto di object storage tidak dihapus di sini —
    // cron pembersih berkala yang menangani file yatim.
    return NextResponse.json({ dihapus: true });
  } catch (e) {
    logger.error("[admin hapus listing] gagal:", e);
    return NextResponse.json({ error: "Gagal menghapus. Coba lagi." }, { status: 500 });
  }
}
