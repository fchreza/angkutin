import type { MetadataRoute } from "next";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { and, desc, eq, gte } from "drizzle-orm";
import { tanggalHariIniID } from "@/lib/format";

/**
 * Sitemap dinamis.
 *
 * KENAPA INI PENTING UNTUK PRODUK INI:
 * Setiap barang punya halaman sendiri di `/listing/[id]`, dan barang-barang
 * itu hanya hidup selama batas pengambilan (maksimal 14 hari). Tanpa sitemap,
 * mesin pencari harus menemukan setiap halaman lewat tautan dari halaman lain.
 * Karena katalog hanya menampilkan barang yang masih tayang, halaman barang
 * yang sudah lewat tenggat akan hilang dari katalog dan tidak pernah
 * ditemukan, padahal saat masih hidup ia justru paling sering dicari orang
 * ("dispenser bekas Medan").
 *
 * KENAPA HANYA BARANG YANG MASIH TAYANG:
 * Sitemap yang memuat halaman mati membuat crawler membuang anggaran
 * perayapannya untuk halaman 404, dan itu menurunkan kualitas seluruh situs
 * di mata mesin pencari. Barang yang sudah lewat tenggat atau sudah diambil
 * sengaja TIDAK dimasukkan.
 *
 * `revalidate` 1 jam: sitemap tidak perlu real-time, dan menghasilkannya
 * ulang setiap permintaan hanya membebani database tanpa manfaat.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  /*
   * Alamat dasar dihitung dengan urutan yang SAMA seperti di app/layout.tsx:
   * domain Vercel didahulukan, env eksplisit belakangan. Kalau urutannya
   * berbeda, sitemap bisa menunjuk ke localhost sementara halaman menunjuk ke
   * domain produksi, dan mesin pencari akan menganggap keduanya situs berbeda.
   */
  const dasar = (() => {
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
      return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    const dariEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (dariEnv && !dariEnv.includes("localhost")) return dariEnv;
    return "http://localhost:3000";
  })();

  const hariIni = tanggalHariIniID();

  let barang: { id: string; createdAt: Date }[] = [];
  try {
    barang = await db
      .select({ id: listings.id, createdAt: listings.createdAt })
      .from(listings)
      .where(
        and(eq(listings.status, "AVAILABLE"), gte(listings.deadlineDate, hariIni)),
      )
      .orderBy(desc(listings.createdAt))
      .limit(1000);
  } catch {
    /*
     * Kalau database sedang tidak bisa dihubungi, sitemap tetap dikembalikan
     * dengan halaman statis saja. Sitemap yang tidak lengkap jauh lebih baik
     * daripada sitemap yang gagal dimuat: yang pertama hanya kehilangan
     * beberapa halaman sementara, yang kedua membuat mesin pencari menganggap
     * seluruh situs tidak punya sitemap.
     */
    barang = [];
  }

  const statis: MetadataRoute.Sitemap = [
    {
      url: `${dasar}/`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      // Katalog berubah paling sering: setiap barang baru muncul di sini.
      priority: 1,
    },
    {
      url: `${dasar}/tentang`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${dasar}/privasi`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${dasar}/kontak`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const halamanBarang: MetadataRoute.Sitemap = barang.map((b) => ({
    url: `${dasar}/listing/${b.id}`,
    lastModified: b.createdAt,
    // Barang bisa hilang kapan saja (diambil atau lewat tenggat).
    changeFrequency: "daily",
    priority: 0.8,
  }));

  /*
   * YANG SENGAJA TIDAK ADA DI SINI:
   * - `/pasang`: halaman form. Tidak ada isi yang berguna bagi pencari, dan
   *   mengindeksnya hanya memasukkan halaman kosong ke hasil pencarian.
   * - `/manage/*`: berisi tautan rahasia. Sudah ditandai `noindex` dan
   *   dilarang di robots.txt; memasukkannya ke sitemap akan bertentangan
   *   dengan keduanya.
   * - `/offline`: halaman cadangan, bukan konten.
   */
  return [...statis, ...halamanBarang];
}
