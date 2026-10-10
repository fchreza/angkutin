import { db } from "@/db";
import { categories, listings } from "@/db/schema";
import { and, asc, eq, gte, sql } from "drizzle-orm";
import { ambilFeed, type KartuListing } from "@/lib/listing-query";
import { FeedClient } from "@/components/feed/feed-client";
import type { WilayahAdaBarang } from "@/components/feed/location-picker";
import {
  TopNav,
  MobileAppBar,
  MobileTabBar,
  FabPasang,
} from "@/components/layout/nav";

export const dynamic = "force-dynamic";

/**
 * Layar 1: Feed Katalog.
 *
 * Default: SELURUH katalog, tanpa filter lokasi. Pengunjung dari mana pun
 * langsung melihat semua barang — tidak dipaksa ke satu wilayah.
 * Penyaringan lokasi hanya terjadi kalau pengguna memilihnya sendiri.
 *
 * Data awal diambil di server (SSR) supaya konten sudah ada saat halaman
 * pertama tampil — penting untuk FCP < 1.8s (NFR §11 no.1).
 */
export default async function BerandaPage() {
  const hariIni = new Date().toISOString().slice(0, 10);

  const [barisWilayah, kategori, feed] = await Promise.all([
    // Wilayah yang punya barang, beserta jumlahnya. Dikelompokkan per provinsi
    // di bawah supaya pemilih lokasi bisa menampilkan provinsi -> kabupaten.
    db
      .select({
        province_code: listings.provinceCode,
        province_name: listings.provinceName,
        regency_code: listings.regencyCode,
        regency_name: listings.regencyName,
        jumlah: sql<number>`count(*)::int`,
      })
      .from(listings)
      .where(
        and(eq(listings.status, "AVAILABLE"), gte(listings.deadlineDate, hariIni)),
      )
      .groupBy(
        listings.provinceCode,
        listings.provinceName,
        listings.regencyCode,
        listings.regencyName,
      ),
    db
      .select({ id: categories.id, name: categories.name, slug: categories.slug })
      .from(categories)
      .orderBy(asc(categories.displayOrder)),
    // Tanpa filter wilayah -> seluruh katalog
    ambilFeed({ sort: "mendesak", limit: 24 }),
  ]);

  // Kelompokkan per provinsi, urut dari barang terbanyak.
  const peta = new Map<string, WilayahAdaBarang>();
  for (const b of barisWilayah) {
    const pk = b.province_code ?? "";
    if (!peta.has(pk)) {
      peta.set(pk, {
        province_code: pk,
        province_name: b.province_name ?? "",
        jumlah: 0,
        kabupaten: [],
      });
    }
    const p = peta.get(pk)!;
    p.jumlah += Number(b.jumlah);
    p.kabupaten.push({
      regency_code: b.regency_code,
      regency_name: b.regency_name,
      jumlah: Number(b.jumlah),
    });
  }

  const wilayah: WilayahAdaBarang[] = [...peta.values()]
    .map((p) => ({
      ...p,
      kabupaten: p.kabupaten.sort((a, b) => b.jumlah - a.jumlah),
    }))
    .sort((a, b) => b.jumlah - a.jumlah);

  return (
    <>
      <TopNav />
      <MobileAppBar />

      <main className="mx-auto w-full max-w-[1200px] px-4 pb-[100px] pt-4 md:px-6 md:pb-24 md:pt-6">
        <div className="mb-4 hidden md:block">
          <h1 className="font-display text-[24px] font-bold tracking-tight text-ink">
            Barang pindahan di sekitarmu
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-secondary">
            Tanpa daftar akun — ambil sendiri, bisa gratis.
          </p>
        </div>

        <FeedClient
          wilayah={wilayah}
          kategori={kategori}
          feedAwal={feed.data as KartuListing[]}
          totalAwal={feed.total}
        />
      </main>

      <FabPasang />
      <MobileTabBar />
    </>
  );
}
