import { db } from "@/db";
import { categories, listings, listingImages } from "@/db/schema";
import { and, asc, desc, eq, ilike, or, sql, gte } from "drizzle-orm";

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
  const hariIni = new Date().toISOString().slice(0, 10);

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
    const kata = `%${f.q.trim()}%`;
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

  const limit = Math.min(Math.max(f.limit ?? 24, 1), 60);
  const offset = Math.max(f.offset ?? 0, 0);

  const baris = await db
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
    .offset(offset);

  // Hitung total memakai syarat yang sama.
  const [{ jumlah }] = await db
    .select({ jumlah: sql<number>`count(*)::int` })
    .from(listings)
    .where(and(...syarat));

  return {
    data: baris.map((b) => ({
      ...b,
      created_at: b.created_at.toISOString(),
      deadline_date: String(b.deadline_date).slice(0, 10),
    })) as KartuListing[],
    total: jumlah,
  };
}

export async function ambilDetail(id: string) {
  const [row] = await db
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
      access_notes: listings.accessNotes,
      seller_name: listings.sellerName,
      seller_whatsapp: listings.sellerWhatsapp,
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
    .limit(1);

  if (!row) return null;

  const foto = await db
    .select({
      image_url: listingImages.imageUrl,
      display_order: listingImages.displayOrder,
    })
    .from(listingImages)
    .where(eq(listingImages.listingId, id))
    .orderBy(asc(listingImages.displayOrder));

  return {
    ...row,
    created_at: row.created_at.toISOString(),
    deadline_date: String(row.deadline_date).slice(0, 10),
    images: foto,
  };
}
