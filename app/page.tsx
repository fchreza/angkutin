import { db } from "@/db";
import { categories, clusters } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { ambilFeed } from "@/lib/listing-query";
import { FeedClient } from "@/components/feed/feed-client";
import {
  TopNav,
  MobileAppBar,
  MobileTabBar,
  FabPasang,
} from "@/components/layout/nav";
import type { KartuListing } from "@/lib/listing-query";

export const dynamic = "force-dynamic";

/**
 * Layar 1: Feed Katalog.
 *
 * Data awal diambil di server (SSR) supaya konten sudah ada saat halaman
 * pertama kali tampil — penting untuk FCP < 1.8s (NFR §11 no.1).
 * Interaksi filter berikutnya dilakukan di klien.
 */
export default async function BerandaPage() {
  const [kluster, kategori, feed] = await Promise.all([
    db
      .select({ id: clusters.id, name: clusters.name, city: clusters.city })
      .from(clusters)
      .where(eq(clusters.isActive, true))
      .orderBy(asc(clusters.name)),
    db
      .select({ id: categories.id, name: categories.name, slug: categories.slug })
      .from(categories)
      .orderBy(asc(categories.displayOrder)),
    ambilFeed({ sort: "mendesak", limit: 24 }),
  ]);

  const klusterAwal = kluster[0]?.id ?? "semua";

  // Feed awal difilter ke kluster pertama supaya konsisten dengan tampilan
  const feedKluster = await ambilFeed({
    cluster_id: klusterAwal,
    sort: "mendesak",
    limit: 24,
  });

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
          kluster={kluster}
          kategori={kategori}
          klusterAwal={klusterAwal}
          feedAwal={feedKluster.data as KartuListing[]}
          totalAwal={feedKluster.total}
        />
      </main>

      <FabPasang />
      <MobileTabBar />
    </>
  );
}
