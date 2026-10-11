import Link from "next/link";
import { headers } from "next/headers";
import { db } from "@/db";
import { categories, listings, listingImages } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { tokenCocok } from "@/lib/token";
import { tanggalHariIniID } from "@/lib/format";
import { statusEfektif } from "@/lib/urgency";
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
        <main className="mx-auto w-full max-w-[1200px] px-4 md:px-6">
          {gagalTautan}
        </main>
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
      provinceCode: listings.provinceCode,
      provinceName: listings.provinceName,
      regencyCode: listings.regencyCode,
      regencyName: listings.regencyName,
      districtCode: listings.districtCode,
      districtName: listings.districtName,
      categoryId: listings.categoryId,
      categoryName: categories.name,
    })
    .from(listings)
    .leftJoin(categories, eq(listings.categoryId, categories.id))
    .where(eq(listings.id, id))
    .limit(1);

  if (!row || !tokenCocok(token, row.secretToken)) {
    return (
      <>
        <main className="mx-auto w-full max-w-[1200px] px-4 md:px-6">
          {gagalTautan}
        </main>
      </>
    );
  }

  const [foto, kategori] = await Promise.all([
    db
      .select({
        image_url: listingImages.imageUrl,
        display_order: listingImages.displayOrder,
      })
      .from(listingImages)
      .where(eq(listingImages.listingId, id))
      .orderBy(asc(listingImages.displayOrder)),
    // Daftar kategori untuk dropdown di form ubah. Diambil bersamaan dengan
    // foto supaya tidak menambah satu perjalanan bolak-balik ke database.
    db
      .select({ id: categories.id, name: categories.name, slug: categories.slug })
      .from(categories)
      .orderBy(asc(categories.displayOrder)),
  ]);

  // Tanggal dihitung SERVER-SIDE supaya server dan browser tidak pernah
  // berbeda pendapat soal "hari ini" (server di UTC, penjual di WIB).
  const hariIni = tanggalHariIniID();

  const data: DataKelola = {
    id: row.id,
    title: row.title,
    description: row.description,
    price: row.price,
    isFree: row.isFree,
    condition: row.condition,
    // Status yang BENAR-BENAR berlaku, bukan hanya kolom database.
    // Cron hanya berjalan sekali sehari (batas Vercel Hobby), jadi tanpa ini
    // penjual melihat "Tersedia" padahal katalog sudah menyembunyikannya.
    status: statusEfektif(row.status, String(row.deadlineDate).slice(0, 10)),
    statusDb: row.status,
    hariIni,
    deadline_date: String(row.deadlineDate).slice(0, 10),
    pickup_landmark: row.pickupLandmark,
    access_notes: row.accessNotes,
    sellerName: row.sellerName,
    sellerWhatsapp: row.sellerWhatsapp,
    provinceCode: row.provinceCode,
    provinceName: row.provinceName,
    regencyCode: row.regencyCode,
    regencyName: row.regencyName,
    districtCode: row.districtCode,
    districtName: row.districtName,
    wilayahNama: [row.districtName, row.regencyName].filter(Boolean).join(", "),
    categoryId: row.categoryId,
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

  // Tautan kelola dibangun dari origin request yang sebenarnya, bukan dari
  // env. Kalau memakai env dan nilainya belum diisi, tautan yang ditampilkan
  // ke penjual akan berbunyi "localhost" — tautan itu tidak bisa dibuka dari
  // HP. Origin request selalu benar di domain mana pun (produksi/pratinjau).
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const manageUrl = `${proto}://${host}/manage/${id}?token=${token}`;

  return (
    <>

      <main className="mx-auto w-full max-w-[1200px] px-4 pb-[110px] pt-4 md:px-6 md:pb-24 md:pt-6">
        <KelolaClient
          data={data}
          token={token}
          manageUrl={manageUrl}
          kategori={kategori}
          fotoGagal={sp.foto === "gagal"}
        />
      </main>

    </>
  );
}
