import { cache } from "react";
import { db } from "@/db";
import { categories, listings, listingImages } from "@/db/schema";
import { and, asc, desc, eq, ilike, ne, or, sql, gte } from "drizzle-orm";
import { tanggalHariIniID } from "./format";

/**
 * Query feed katalog (FR-2).
 *
 * Aturan dari PRD:
 * - Hanya listing AVAILABLE yang muncul.
 * - Default sort: deadline_date ASC (paling mendesak di atas).
 * - Listing lewat tenggat TIDAK ditampilkan, meski cron belum jalan.
 *   Ini penting: cron Vercel Hobby tidak presisi, jadi filter di query
 *   adalah pengaman utama (cron hanya pembersih status di database).
 *
 * Wilayah: katalog publik menyaring sampai KABUPATEN/KOTA saja. Kecamatan
 * hanya dipakai di form pasang sebagai penanda lokasi barang.
 */

export type SortFeed = "mendesak" | "terbaru" | "termurah" | "gratis";

/**
 * Escape karakter wildcard LIKE (`%`, `_`, `\`).
 *
 * KENAPA: nilai pencarian dikirim sebagai parameter terikat (aman dari SQL
 * injection), TAPI `%` dan `_` tetap berfungsi sebagai wildcard di dalam
 * pola LIKE. Tanpa escape, pengguna yang mengetik "100%" akan cocok dengan
 * "1000", "100x", dan seterusnya — hasil pencarian yang menyesatkan.
 * PostgreSQL memakai backslash sebagai karakter escape bawaan di LIKE/ILIKE.
 */
export function escapeLike(teks: string): string {
  return teks.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export type KartuListing = {
  id: string;
  title: string;
  price: string;
  is_free: boolean;
  condition: string;
  status: string;
  deadline_date: string;
  pickup_landmark: string;
  province_code: string | null;
  province_name: string | null;
  regency_code: string;
  regency_name: string;
  district_code: string;
  district_name: string;
  category_id: string | null;
  category_name: string | null;
  created_at: string;
  cover_url: string | null;
  jumlah_foto: number;
};

export type FilterFeed = {
  /** Filter wilayah: kabupaten/kota (kode BPS). */
  regency_code?: string;
  /** Filter wilayah: provinsi (kode BPS). Dipakai kalau kabupaten belum dipilih. */
  province_code?: string;
  /** Filter kecamatan — dipakai halaman kelola, bukan katalog publik. */
  district_code?: string;
  category_id?: string;
  is_free?: boolean;
  q?: string;
  sort?: SortFeed;
  limit?: number;
  offset?: number;
};

export async function ambilFeed(f: FilterFeed): Promise<{
  data: KartuListing[];
  total: number;
}> {
  const hariIni = tanggalHariIniID();

  const syarat = [
    eq(listings.status, "AVAILABLE"),
    // pengaman tenggat: jangan tampilkan yang sudah lewat tanggal
    gte(listings.deadlineDate, hariIni),
  ];

  // Filter wilayah langsung ke kolom listings — tidak perlu join lagi.
  // Kabupaten lebih spesifik, jadi kalau keduanya ada, kabupaten yang menang.
  if (f.regency_code) {
    syarat.push(eq(listings.regencyCode, f.regency_code));
  } else if (f.province_code) {
    syarat.push(eq(listings.provinceCode, f.province_code));
  }
  if (f.district_code) syarat.push(eq(listings.districtCode, f.district_code));
  if (f.category_id) {
    // "gratis" adalah kategori semu -> filter lewat is_free
    if (f.category_id === "gratis") syarat.push(eq(listings.isFree, true));
    else syarat.push(eq(listings.categoryId, f.category_id));
  }
  if (f.is_free === true) syarat.push(eq(listings.isFree, true));
  if (f.q && f.q.trim()) {
    // Escape wildcard LIKE (%, _, \) supaya input pengguna diperlakukan
    // sebagai teks biasa. Tanpa ini, pencarian "100%" akan cocok dengan
    // apa pun yang mengandung "100" diikuti karakter apa saja.
    // PostgreSQL memakai backslash sebagai karakter escape bawaan di LIKE.
    const kata = `%${escapeLike(f.q.trim())}%`;
    syarat.push(
      or(ilike(listings.title, kata), ilike(listings.pickupLandmark, kata))!,
    );
  }

  const urut = {
    mendesak: asc(listings.deadlineDate),
    terbaru: desc(listings.createdAt),
    termurah: asc(listings.price),
    gratis: desc(listings.isFree),
  }[f.sort ?? "mendesak"];

  // Pertahanan lapis kedua: kalau limit/offset lolos sebagai NaN (mis. dari
  // pemanggil yang tidak memvalidasi), Math.max/min akan meneruskan NaN ke
  // Drizzle dan menyebabkan 500. Di sini NaN dikembalikan ke nilai bawaan.
  const limitMentah = Number.isFinite(f.limit) ? (f.limit as number) : 24;
  const offsetMentah = Number.isFinite(f.offset) ? (f.offset as number) : 0;
  const limit = Math.min(Math.max(limitMentah, 1), 60);
  const offset = Math.max(offsetMentah, 0);

  // PENTING — kedua query dijalankan BERSAMAAN, bukan berurutan.
  // Database ada di Singapura: satu round-trip ~250 ms. Menjalankannya
  // berurutan berarti pengguna menunggu 2x lipat hanya untuk hal yang tidak
  // saling bergantung. Promise.all memangkas satu round-trip penuh.
  const [baris, hasilHitung] = await Promise.all([
    db
      .select({
        id: listings.id,
        title: listings.title,
        price: listings.price,
        is_free: listings.isFree,
        condition: listings.condition,
        status: listings.status,
        deadline_date: listings.deadlineDate,
        pickup_landmark: listings.pickupLandmark,
        province_code: listings.provinceCode,
        province_name: listings.provinceName,
        regency_code: listings.regencyCode,
        regency_name: listings.regencyName,
        district_code: listings.districtCode,
        district_name: listings.districtName,
        category_id: listings.categoryId,
        category_name: categories.name,
        created_at: listings.createdAt,
        cover_url: sql<string | null>`(
          select li.image_url from listing_images li
          where li.listing_id = ${listings.id}
          order by li.display_order asc limit 1
        )`,
        jumlah_foto: sql<number>`(
          select count(*)::int from listing_images li where li.listing_id = ${listings.id}
        )`,
      })
      .from(listings)
      .leftJoin(categories, eq(listings.categoryId, categories.id))
      .where(and(...syarat))
      .orderBy(urut, asc(listings.createdAt))
      .limit(limit)
      .offset(offset),
    // Hitung total memakai syarat yang sama.
    db
      .select({ jumlah: sql<number>`count(*)::int` })
      .from(listings)
      .where(and(...syarat)),
  ]);

  return {
    data: baris.map((b) => ({
      ...b,
      created_at: b.created_at.toISOString(),
      deadline_date: String(b.deadline_date).slice(0, 10),
    })) as KartuListing[],
    total: hasilHitung[0]?.jumlah ?? 0,
  };
}

/**
 * Detail barang untuk halaman publik.
 *
 * DIBUNGKUS `cache()` REACT — bukan sekadar optimasi.
 * `generateMetadata` dan komponen halaman sama-sama memanggil fungsi ini untuk
 * id yang sama dalam satu permintaan. Tanpa cache, setiap buka halaman detail
 * menjalankan dua kali query detail + dua kali query foto, padahal hasilnya
 * identik. `cache()` membuat panggilan kedua dalam permintaan yang sama
 * memakai hasil yang pertama.
 *
 * Catatan: ini cache PER-PERMINTAAN, bukan cache lintas pengguna — jadi data
 * yang baru diubah tetap langsung terlihat.
 */
export const ambilDetail = cache(async (id: string) => {
  // OPTIMASI KECEPATAN (2026-10-16): query baris listing dan foto dijalankan
  // BERSAMAAN via Promise.all, bukan berurutan. Database di Singapura
  // (~250ms/round-trip dari Vercel US), jadi ini memangkas ~250ms per
  // buka halaman detail. Foto diambil walau baris belum pasti ada —
  // kalau row null, hasilnya dibuang di bawah.
  const [barisRow, foto] = await Promise.all([
    db
      .select({
        id: listings.id,
        title: listings.title,
        description: listings.description,
        price: listings.price,
        is_free: listings.isFree,
        condition: listings.condition,
        status: listings.status,
        deadline_date: listings.deadlineDate,
        pickup_landmark: listings.pickupLandmark,
      /*
       * `access_notes` SENGAJA TIDAK DIAMBIL DI SINI.
       *
       * KENAPA: kolom ini berisi catatan logistik yang diminta dari penjual
       * dengan contoh "Kamar lantai 3, tangga sempit", jadi isinya bisa
       * menunjuk lokasi kamar. PRD §11 no.2 melarang alamat spesifik
       * disimpan ATAU ditampilkan di antarmuka publik, dan halaman ini
       * publik serta terindeks mesin pencari.
       *
       * Catatan itu tetap berguna, jadi ia tidak dihapus: sekarang dikirim
       * lewat pesan WhatsApp saat pembeli menekan tombol hubungi, sehingga
       * hanya orang yang benar-benar akan menjemput yang melihatnya.
       * Lihat lib/whatsapp.ts.
       *
       * Menghapusnya dari query adalah pertahanan lapis kedua: walaupun ada
       * komponen yang keliru mencoba menampilkannya, datanya tidak ada.
      */
      seller_name: listings.sellerName,
      stall_id: listings.stallId,
      province_code: listings.provinceCode,
      province_name: listings.provinceName,
      regency_code: listings.regencyCode,
      regency_name: listings.regencyName,
      district_code: listings.districtCode,
      district_name: listings.districtName,
      category_id: listings.categoryId,
      category_name: categories.name,
      view_count: listings.viewCount,
      created_at: listings.createdAt,
      })
      .from(listings)
      .leftJoin(categories, eq(listings.categoryId, categories.id))
      .where(and(eq(listings.id, id), sql`${listings.status} <> 'DELETED'`))
      .limit(1),
    db
      .select({
        image_url: listingImages.imageUrl,
        display_order: listingImages.displayOrder,
      })
      .from(listingImages)
      .where(eq(listingImages.listingId, id))
      .orderBy(asc(listingImages.displayOrder)),
  ]);

  const [row] = barisRow;
  if (!row) return null;

  return {
    ...row,
    created_at: row.created_at.toISOString(),
    deadline_date: String(row.deadline_date).slice(0, 10),
    images: foto,
  };
});


/** Barang lain dari lapak yang sama; bila belum ada, tampilkan barang tersedia yang paling relevan. */
export async function ambilRekomendasi({
  id,
  stallId,
  categoryId,
  regencyCode,
}: {
  id: string;
  stallId: string | null;
  categoryId: string | null;
  regencyCode: string;
}): Promise<{ data: KartuListing[]; dariLapak: boolean }> {
  const hariIni = tanggalHariIniID();
  const kolom = {
    id: listings.id,
    title: listings.title,
    price: listings.price,
    is_free: listings.isFree,
    condition: listings.condition,
    status: listings.status,
    deadline_date: listings.deadlineDate,
    pickup_landmark: listings.pickupLandmark,
    province_code: listings.provinceCode,
    province_name: listings.provinceName,
    regency_code: listings.regencyCode,
    regency_name: listings.regencyName,
    district_code: listings.districtCode,
    district_name: listings.districtName,
    category_id: listings.categoryId,
    category_name: categories.name,
    created_at: listings.createdAt,
    cover_url: sql<string | null>`(
      select li.image_url from listing_images li
      where li.listing_id = ${listings.id}
      order by li.display_order asc limit 1
    )`,
    jumlah_foto: sql<number>`(
      select count(*)::int from listing_images li where li.listing_id = ${listings.id}
    )`,
  };

  const normalisasi = <T extends { created_at: Date; deadline_date: string | Date }>(
    baris: T[],
  ) =>
    baris.map((b) => ({
      ...b,
      created_at: b.created_at.toISOString(),
      deadline_date: String(b.deadline_date).slice(0, 10),
    })) as unknown as KartuListing[];

  if (stallId) {
    const barisLapak = await db
      .select(kolom)
      .from(listings)
      .leftJoin(categories, eq(listings.categoryId, categories.id))
      .where(
        and(
          ne(listings.id, id),
          eq(listings.stallId, stallId),
          eq(listings.status, "AVAILABLE"),
          gte(listings.deadlineDate, hariIni),
        ),
      )
      .orderBy(desc(listings.createdAt))
      .limit(6);

    if (barisLapak.length > 0) {
      return { data: normalisasi(barisLapak), dariLapak: true };
    }
  }

  const relevansi = categoryId
    ? or(
        eq(listings.categoryId, categoryId),
        eq(listings.regencyCode, regencyCode),
      )!
    : eq(listings.regencyCode, regencyCode);
  const barisSerupa = await db
    .select(kolom)
    .from(listings)
    .leftJoin(categories, eq(listings.categoryId, categories.id))
    .where(
      and(
        ne(listings.id, id),
        eq(listings.status, "AVAILABLE"),
        gte(listings.deadlineDate, hariIni),
        relevansi,
      ),
    )
    .orderBy(
      ...(categoryId
        ? [sql`CASE WHEN ${listings.categoryId} = ${categoryId} THEN 0 ELSE 1 END`]
        : []),
      desc(listings.createdAt),
    )
    .limit(6);

  return { data: normalisasi(barisSerupa), dariLapak: false };
}
