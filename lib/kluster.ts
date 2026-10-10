import { db } from "@/db";
import { clusters, listings } from "@/db/schema";
import { and, asc, eq, gte, sql } from "drizzle-orm";

/**
 * Kluster aktif + jumlah listing yang benar-benar tayang.
 *
 * Kenapa jumlah dihitung lewat query terpisah lalu digabung di JS,
 * bukan subquery berkorelasi di dalam `select`:
 * subquery mentah lewat `sql` di Drizzle menghasilkan SQL yang salah di sini
 * (galat "undefined_table" dan "character varying = uuid"). Query terpisah
 * lebih mudah dibaca dan tidak bergantung pada cara Drizzle mengutip nama.
 */
export type KlusterDenganJumlah = {
  id: string;
  name: string;
  city: string;
  province_code: string | null;
  province_name: string | null;
  regency_code: string | null;
  regency_name: string | null;
  latitude: string | null;
  longitude: string | null;
  jumlah_aktif: number;
};

export async function ambilKlusterDenganJumlah(): Promise<KlusterDenganJumlah[]> {
  const hariIni = new Date().toISOString().slice(0, 10);

  const [daftar, hitung] = await Promise.all([
    db
      .select({
        id: clusters.id,
        name: clusters.name,
        city: clusters.city,
        province_code: clusters.provinceCode,
        province_name: clusters.provinceName,
        regency_code: clusters.regencyCode,
        regency_name: clusters.regencyName,
        latitude: clusters.latitude,
        longitude: clusters.longitude,
      })
      .from(clusters)
      .where(eq(clusters.isActive, true))
      .orderBy(asc(clusters.name)),

    // Hitung listing tayang per kluster, sekali query.
    db
      .select({
        clusterId: listings.clusterId,
        jumlah: sql<number>`count(*)::int`,
      })
      .from(listings)
      .where(
        and(
          eq(listings.status, "AVAILABLE"),
          gte(listings.deadlineDate, hariIni),
        ),
      )
      .groupBy(listings.clusterId),
  ]);

  const peta = new Map<string, number>();
  for (const h of hitung) {
    if (h.clusterId) peta.set(h.clusterId, Number(h.jumlah));
  }

  return daftar.map((k) => ({ ...k, jumlah_aktif: peta.get(k.id) ?? 0 }));
}
