import { db } from "@/db";
import { categories } from "@/db/schema";
import { asc } from "drizzle-orm";
import { ambilFeed, type KartuListing } from "@/lib/listing-query";
import { FeedClient } from "@/components/feed/feed-client";
import type { KlusterRingkas } from "@/components/feed/location-picker";
import { ambilKlusterDenganJumlah } from "@/lib/kluster";
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
 * langsung melihat semua barang — tidak dipaksa ke satu kluster.
 * Penyaringan lokasi hanya terjadi kalau pengguna memilihnya sendiri.
 *
 * Data awal diambil di server (SSR) supaya konten sudah ada saat halaman
 * pertama tampil — penting untuk FCP < 1.8s (NFR §11 no.1).
 */
export default async function BerandaPage() {
  const [kluster, kategori, feed] = await Promise.all([
    ambilKlusterDenganJumlah(),
    db
      .select({ id: categories.id, name: categories.name, slug: categories.slug })
      .from(categories)
      .orderBy(asc(categories.displayOrder)),
    // Tanpa filter kluster -> seluruh katalog
    ambilFeed({ sort: "mendesak", limit: 24 }),
  ]);

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
          kluster={kluster as KlusterRingkas[]}
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
