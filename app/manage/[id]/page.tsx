import Link from "next/link";
import { db } from "@/db";
import { categories, clusters, listings, listingImages } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { tokenCocok } from "@/lib/token";
import { TopNav, MobileAppBar, MobileTabBar } from "@/components/layout/nav";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { KelolaClient, type DataKelola } from "@/components/manage/kelola-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kelola Listing — Angkutin",
  robots: { index: false, follow: false },
};

/**
 * Layar 4: Kelola Listing (Seller Secret Dashboard).
 *
 * Keamanan: token dibandingkan dengan waktu tetap di server. Token salah
 * atau listing tidak ada -> tampilkan halaman "tautan tidak valid" yang
 * SAMA (tidak membedakan keduanya) untuk mencegah enumerasi.
 */
export default async function KelolaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; foto?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const token = sp.token ?? "";

  const gagalTautan = (
    <div className="mx-auto max-w-[520px] py-14">
      <EmptyState
        judul="Tautan pengelolaan tidak valid atau sudah kedaluwarsa"
        keterangan="Periksa kembali tautan yang kamu simpan. Tautan ini hanya bisa dibuka oleh pembuat listing."
        aksi={
          <Link href="/">
            <Button varian="outline">Kembali ke Katalog</Button>
          </Link>
        }
      />
    </div>
  );

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return (
      <>
        <TopNav />
        <MobileAppBar />
        <main className="mx-auto w-full max-w-[1200px] px-4 md:px-6">
          {gagalTautan}
        </main>
        <MobileTabBar />
      </>
    );
  }

  const [row] = await db
    .select({
      id: listings.id,
      secretToken: listings.secretToken,
      title: listings.title,
      description: listings.description,
      price: listings.price,
      isFree: listings.isFree,
      condition: listings.condition,
      status: listings.status,
      deadlineDate: listings.deadlineDate,
      pickupLandmark: listings.pickupLandmark,
      accessNotes: listings.accessNotes,
      sellerName: listings.sellerName,
      sellerWhatsapp: listings.sellerWhatsapp,
      viewCount: listings.viewCount,
      whatsappClicks: listings.whatsappClicks,
      createdAt: listings.createdAt,
      clusterName: clusters.name,
      categoryName: categories.name,
    })
    .from(listings)
    .leftJoin(clusters, eq(listings.clusterId, clusters.id))
    .leftJoin(categories, eq(listings.categoryId, categories.id))
    .where(eq(listings.id, id))
    .limit(1);

  if (!row || !tokenCocok(token, row.secretToken)) {
    return (
      <>
        <TopNav />
        <MobileAppBar />
        <main className="mx-auto w-full max-w-[1200px] px-4 md:px-6">
          {gagalTautan}
        </main>
        <MobileTabBar />
      </>
    );
  }

  const foto = await db
    .select({
      image_url: listingImages.imageUrl,
      display_order: listingImages.displayOrder,
    })
    .from(listingImages)
    .where(eq(listingImages.listingId, id))
    .orderBy(asc(listingImages.displayOrder));

  const data: DataKelola = {
    id: row.id,
    title: row.title,
    description: row.description,
    price: row.price,
    isFree: row.isFree,
    condition: row.condition,
    status: row.status,
    deadline_date: String(row.deadlineDate).slice(0, 10),
    pickup_landmark: row.pickupLandmark,
    access_notes: row.accessNotes,
    sellerName: row.sellerName,
    sellerWhatsapp: row.sellerWhatsapp,
    clusterName: row.clusterName,
    categoryName: row.categoryName,
    created_at: row.createdAt.toISOString(),
    images: foto,
    stat: {
      view: row.viewCount,
      wa_click: row.whatsappClicks,
      ctr:
        row.viewCount > 0
          ? Math.round((row.whatsappClicks / row.viewCount) * 100)
          : 0,
    },
  };

  const manageUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/manage/${id}?token=${token}`;

  return (
    <>
      <TopNav />
      <MobileAppBar />

      <main className="mx-auto w-full max-w-[1200px] px-4 pb-[110px] pt-4 md:px-6 md:pb-24 md:pt-6">
        <KelolaClient
          data={data}
          token={token}
          manageUrl={manageUrl.replace(/^\/manage/, "/manage")}
          fotoGagal={sp.foto === "gagal"}
        />
      </main>

      <MobileTabBar />
    </>
  );
}
