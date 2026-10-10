import { db } from "@/db";
import { categories } from "@/db/schema";
import { asc } from "drizzle-orm";
import { ok, gagal } from "@/lib/api";
import { ambilKlusterDenganJumlah } from "@/lib/kluster";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/clusters — daftar kluster aktif (FR-1).
 *
 * Menyertakan wilayah (provinsi & kabupaten/kota) dan koordinat untuk
 * "Gunakan Lokasi Saya", plus `jumlah_aktif` supaya pemilih lokasi bisa
 * menandai wilayah yang masih kosong.
 */
export async function GET() {
  try {
    const data = await ambilKlusterDenganJumlah();
    return ok({ data, total: data.length });
  } catch (e) {
    console.error("[clusters] gagal:", e);
    return gagal("Gagal memuat daftar kluster.", 500);
  }
}
