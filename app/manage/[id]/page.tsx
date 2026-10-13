import Link from "next/link";
import { headers } from "next/headers";
import { db } from "@/db";
import { categories, listings, listingImages } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { periksaAkses, urlBarang, urlLapak } from "@/lib/lapak";
import { tanggalHariIniID } from "@/lib/format";
import { statusEfektif } from "@/lib/urgency";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { KelolaClient, type DataKelola } from "@/components/manage/kelola-client";
import { DaftarLapak, type BarisBarang } from "@/components/manage/daftar-lapak";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kelola Listing — Angkutin",
  robots: { index: false, follow: false },
};

/**
 * Halaman kelola — menerima DUA JENIS tautan.
 *
 *   1. /manage/<stallId>?token=<token_lapak>      -> dashboard LAPAK
 *      Daftar semua barang + tombol tambah barang.
 *
 *   2. /manage/<listingId>?token=<token_listing>  -> dashboard BARANG (lama)
 *      Hanya satu barang. TAUTAN INI SENGAJA TETAP SAH: sudah beredar dan
 *      mungkin sudah disimpan penjual. Dari sini penjual bisa memindahkan
 *      barangnya ke lapak.
 *
 * KENAPA SATU RUTE, BUKAN DUA:
 * Id lapak dan id barang sama-sama UUID, jadi bentuk URL-nya identik. Dengan
 * satu rute, tautan lama tidak perlu dialihkan ke mana pun — dan pengalihan
 * akan membocorkan token lapak ke riwayat browser serta header `Referer`.
 * Yang membedakan hanya tokennya, dan itu diperiksa di server.
 *
 * KEAMANAN:
 * Token dibandingkan dengan waktu tetap (constant-time) di dalam periksaAkses.
 * Token salah dan id tidak ada menghasilkan halaman yang SAMA, supaya tidak
 * ada cara menebak id mana yang benar-benar ada.
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
    return <main className="shell w-full">{gagalTautan}</main>;
  }

  const akses = await periksaAkses(id, token);
  if (!akses) {
    return <main className="shell w-full">{gagalTautan}</main>;
  }

  // Origin dari request yang sebenarnya, bukan env — kalau env belum diisi,
  // tautan yang ditampilkan akan berbunyi "localhost" dan tidak bisa dibuka
  // dari HP.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  // ==========================================================================
  // DASHBOARD LAPAK
  // ==========================================================================
  if (akses.jenis === "lapak") {
    const rows = await db
      .select({
        id: listings.id,
        secretToken: listings.secretToken,
        title: listings.title,
        price: listings.price,
        isFree: listings.isFree,
        status: listings.status,
        deadlineDate: listings.deadlineDate,
        regencyName: listings.regencyName,
        districtName: listings.districtName,
        viewCount: listings.viewCount,
        whatsappClicks: listings.whatsappClicks,
      })
      .from(listings)
      .where(eq(listings.stallId, akses.stallId))
      .orderBy(desc(listings.createdAt));

    // Foto utama tiap barang untuk kartu di daftar. Satu query untuk SEMUA
    // barang, bukan satu query per barang — jarak ke Singapura ~250 ms, jadi
    // satu query per kartu akan terasa sekali saat lapaknya berisi banyak
    // barang.
    const idBarang = new Set(rows.map((r) => r.id));
    const semuaFoto = rows.length
      ? await db
          .select({
            listingId: listingImages.listingId,
            imageUrl: listingImages.imageUrl,
            displayOrder: listingImages.displayOrder,
          })
          .from(listingImages)
          .orderBy(asc(listingImages.displayOrder))
      : [];

    const fotoUtama = new Map<string, string>();
    for (const f of semuaFoto) {
      if (idBarang.has(f.listingId) && !fotoUtama.has(f.listingId)) {
        fotoUtama.set(f.listingId, f.imageUrl);
      }
    }

    const barang: BarisBarang[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      price: r.price,
      isFree: r.isFree,
      // Status yang BENAR-BENAR berlaku, bukan hanya kolom database. Cron
      // hanya jalan sekali sehari (batas Vercel Hobby), jadi tanpa ini
      // penjual melihat "Tersedia" padahal katalog sudah menyembunyikannya.
      status: statusEfektif(r.status, String(r.deadlineDate).slice(0, 10)),
      deadline: String(r.deadlineDate).slice(0, 10),
      wilayah: [r.districtName, r.regencyName].filter(Boolean).join(", "),
      view: r.viewCount,
      waClick: r.whatsappClicks,
      foto: fotoUtama.get(r.id) ?? null,
      publicUrl: `${origin}/listing/${r.id}`,
      manageUrl: urlBarang(origin, r.id, r.secretToken),
    }));

    return (
      <main className="shell w-full pb-[110px] pt-4 md:pb-24 md:pt-6">
        <DaftarLapak
          barang={barang}
          namaLapak={akses.nama}
          stallUrl={urlLapak(origin, akses.stallId, token)}
          token={token}
          stallId={akses.stallId}
        />
      </main>
    );
  }

  // ==========================================================================
  // DASHBOARD BARANG (tautan lama)
  // ==========================================================================
  const [row] = await db
    .select({
      id: listings.id,
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
    .where(eq(listings.id, akses.listingId))
    .limit(1);

  // Barang hilang di antara pemeriksaan akses dan pengambilan data (mis.
  // dihapus dari tab lain). Tampilkan halaman tautan tidak valid yang sama.
  if (!row) {
    return <main className="shell w-full">{gagalTautan}</main>;
  }

  const [foto, kategori] = await Promise.all([
    db
      .select({
        image_url: listingImages.imageUrl,
        display_order: listingImages.displayOrder,
      })
      .from(listingImages)
      .where(eq(listingImages.listingId, akses.listingId))
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

  return (
    <main className="shell w-full pb-[110px] pt-4 md:pb-24 md:pt-6">
      <KelolaClient
        data={data}
        token={token}
        manageUrl={urlBarang(origin, id, token)}
        publicUrl={`${origin}/listing/${row.id}`}
        punyaLapak={Boolean(akses.stallId)}
        kategori={kategori}
        fotoGagal={sp.foto === "gagal"}
      />
    </main>
  );
}
