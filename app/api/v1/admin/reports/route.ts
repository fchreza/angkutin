import { NextResponse } from "next/server";
import { z } from "zod";
import { sudahMasuk, adminSiap } from "@/lib/admin";
import { tandaiLaporanDitinjau } from "@/lib/laporan";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/admin/reports — tandai satu laporan sudah ditinjau.
 *
 * KENAPA POST, bukan DELETE: laporannya tidak dihapus, hanya berubah status
 * jadi REVIEWED. Riwayat laporan tetap ada di database untuk audit, ia hanya
 * hilang dari antrian.
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

  const ok = await tandaiLaporanDitinjau(parsed.data.id);
  if (!ok) {
    return NextResponse.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ ditinjau: true });
}
