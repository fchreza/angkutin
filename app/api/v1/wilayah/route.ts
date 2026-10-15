import { db } from "@/db";
import { listings } from "@/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { ok, gagal } from "@/lib/api";
import { PROVINSI } from "@/lib/wilayah";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/wilayah — wilayah yang PUNYA barang, beserta jumlahnya.
 *
 * Hanya wilayah yang ada barangnya yang dikembalikan, diurutkan dari barang
 * terbanyak. Wilayah kosong tetap bisa ditemukan lewat pencarian di sisi klien.
 *
 * Katalog publik menyaring sampai KABUPATEN/KOTA saja.
 */
export async function GET() {
  try {
    const hariIni = new Date().toISOString().slice(0, 10);

    const baris = await db
      .select({
        regencyCode: listings.regencyCode,
        regencyName: listings.regencyName,
        provinceCode: listings.provinceCode,
        provinceName: listings.provinceName,
        jumlah: sql<number>`count(*)::int`,
      })
      .from(listings)
      .where(
        and(
          eq(listings.status, "AVAILABLE"),
          gte(listings.deadlineDate, hariIni),
        ),
      )
      .groupBy(
        listings.regencyCode,
        listings.regencyName,
        listings.provinceCode,
        listings.provinceName,
      );

    const perProvinsi = new Map<
      string,
      {
        province_code: string;
        province_name: string;
        jumlah: number;
        kabupaten: { regency_code: string; regency_name: string; jumlah: number }[];
      }
    >();

    for (const b of baris) {
      const pk = b.provinceCode ?? "";
      if (!perProvinsi.has(pk)) {
        perProvinsi.set(pk, {
          province_code: pk,
          province_name: b.provinceName ?? "",
          jumlah: 0,
          kabupaten: [],
        });
      }
      const p = perProvinsi.get(pk)!;
      p.jumlah += Number(b.jumlah);
      p.kabupaten.push({
        regency_code: b.regencyCode,
        regency_name: b.regencyName,
        jumlah: Number(b.jumlah),
      });
    }

    const data = [...perProvinsi.values()]
      .map((p) => ({
        ...p,
        kabupaten: p.kabupaten.sort((a, b) => b.jumlah - a.jumlah),
      }))
      .sort((a, b) => b.jumlah - a.jumlah);

    const total = data.reduce((a, p) => a + p.jumlah, 0);

    return ok({ data, total, provinsi_tersedia: PROVINSI.length });
  } catch (e) {
    logger.error("[wilayah] gagal:", e);
    return gagal("Gagal memuat daftar wilayah.", 500);
  }
}
