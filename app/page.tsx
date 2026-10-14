import { db } from "@/db";
import { categories, listings } from "@/db/schema";
import { and, asc, eq, gte, sql } from "drizzle-orm";
import { ambilFeed, type KartuListing } from "@/lib/listing-query";
import { FeedClient } from "@/components/feed/feed-client";
import type { WilayahAdaBarang } from "@/components/feed/location-picker";
import { tanggalHariIniID } from "@/lib/format";

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
 *
 * FILTER AWAL DARI URL (?kategori=&regency=):
 * Dipakai oleh remah navigasi di halaman detail barang, supaya "Rak & Meja"
 * atau "Sleman, DI Yogyakarta" di remah benar-benar membuka katalog yang sudah
 * tersaring — bukan tautan yang mendarat di katalog penuh.
 *
 * Batasnya: hanya dua filter pertama yang dibaca. Sort, kata kunci, dan
 * provinsi sengaja tidak, supaya URL tetap pendek dan tidak ada permukaan
 * tambahan yang perlu diamankan.
 */
export default async function BerandaPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string; regency?: string }>;
}) {
  const sp = await searchParams;
  const kategoriAwal = sp.kategori ?? "semua";
  const regencyAwal = sp.regency ?? "";

  // Zona WIB, bukan UTC — lihat catatan di lib/format.ts. Dengan
  // toISOString() tanggalnya masih kemarin antara 00:00–06:59 WIB.
  const hariIni = tanggalHariIniID();

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
    // Filter awal dari URL: kabupaten kalau ada, kalau tidak kategori saja.
    // (Katalog tidak menerima keduanya sekaligus dari remah.)
    ambilFeed({
      sort: "mendesak",
      limit: 24,
      ...(regencyAwal
        ? { regency_code: regencyAwal }
        : kategoriAwal !== "semua"
          ? { category_id: kategoriAwal }
          : {}),
    }),
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
      {/*
        Memakai .shell (bukan mx-auto max-w-[1200px] px-6 seperti sebelumnya).
        Di layar 1920px, 1200px menyisakan 360px kosong di kiri DAN kanan
        sekaligus — konten terlihat mengambang, bukan edge to edge.
      */}
      <main className="shell w-full pb-24 pt-6 md:pt-10">
        {/*
          Kepala katalog.

          KENAPA judulnya diperbesar dari 26px jadi clamp(2.1rem, 5vw, 3.6rem):
          judul kecil di halaman yang lapang membuat halamannya terbaca KOSONG,
          bukan lapang. Selain itu judul kecil tidak memberi titik fokus, jadi
          mata tidak tahu harus mulai dari mana.

          KENAPA font-display (bukan font lain): sekarang `display` menunjuk
          Plus Jakarta Sans yang sama dengan teks badan, jadi judul dan isi
          satu keluarga huruf. Pemisahannya tetap ditulis lewat `font-display`
          supaya judul punya NAMA perannya sendiri di kode — kalau nanti mau
          dipisah lagi, cukup ubah satu baris di tailwind.config.ts.

          KENAPA sekarang tampil juga di mobile: sebelumnya `hidden md:block`,
          jadi pengguna ponsel tidak melihat judul sama sekali dan langsung
          mendarat di kotak pencarian tanpa tahu halaman apa ini.
        */}
        <div className="mb-5 md:mb-6">
          <h1 className="font-display text-judul-hero font-bold text-ink">
            Barang pindahan di sekitarmu
          </h1>
          {/*
            leading-relaxed (1,625) bukan leading-normal: pada teks 14px dengan
            dua baris, jarak baris rapat membuat barisnya saling menempel dan
            blok teksnya terbaca padat.
          */}
          <p className="mt-2.5 max-w-baca text-[14px] leading-relaxed text-ink-secondary md:text-[15px]">
            Tanpa daftar akun, ambil sendiri, bisa gratis.
          </p>
        </div>

        <FeedClient
          wilayah={wilayah}
          kategori={kategori}
          feedAwal={feed.data as KartuListing[]}
          totalAwal={feed.total}
          kategoriAwal={kategoriAwal}
          regencyAwal={regencyAwal}
        />
      </main>
    </>
  );
}
