import { db } from "@/db";
import { listings, stalls, STATUS_VALUES, type ListingStatus } from "@/db/schema";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { escapeLike } from "./listing-query";

/**
 * Data barang untuk halaman admin.
 *
 * KENAPA TAUTAN KELOLA TIDAK ADA DI SINI:
 * Fungsi ini dipanggil oleh halaman admin yang dirender di server, dan
 * hasilnya dikirim ke browser. Kalau token ikut di sini, SEMUA tautan kelola
 * ada di dalam HTML halaman itu — dan "disembunyikan sampai diklik" hanya
 * jadi hiasan CSS: siapa pun yang membuka kode sumber atau memotret layar
 * tetap mendapat semuanya sekaligus.
 *
 * Karena itu fungsi ini sengaja TIDAK mengambil kolom token sama sekali.
 * Tautan diambil per barang lewat endpoint terpisah saat admin benar-benar
 * menekan tombolnya (lihat app/api/v1/admin/tautan/route.ts).
 */

export type BarangAdmin = {
  id: string;
  title: string;
  description: string;
  sellerName: string;
  /** Nomor WhatsApp BERTopeng. Lihat alasan di bawah. */
  waTopeng: string;
  price: string;
  isFree: boolean;
  pickupLandmark: string;
  createdAt: string;
  /** 'YYYY-MM-DD' */
  deadlineDate: string;
  status: string;
  viewCount: number;
  whatsappClicks: number;
  stallId: string | null;
  stallNama: string | null;
  /** Jumlah barang lain di lapak yang sama. 0 kalau tidak punya lapak. */
  barangLapakLain: number;
  /** Jumlah laporan OPEN untuk barang ini. Dipakai untuk badge peringatan. */
  jumlahLaporan: number;
};

/**
 * Topeng nomor WhatsApp.
 *
 * KENAPA DITOPENG, padahal admin perlu memverifikasi:
 * Nomor ini milik ORANG LAIN. Halaman admin memang ber-sandi, tapi sandi
 * tidak melindungi dari tangkapan layar, layar yang kebetulan terlihat orang
 * lain, atau perekaman layar saat sesi dukungan. Menampilkan nomor lengkap
 * berarti memaparkan data pribadi semua penjual sekaligus.
 *
 * Untuk kebutuhan verifikasi, empat digit terakhir sudah cukup: admin tinggal
 * bertanya "nomor yang kamu pakai berakhiran 789?". Dan pencarian tetap bisa
 * memakai nomor LENGKAP, karena pencariannya dijalankan di server dan nomor
 * yang diketik tidak perlu ditampilkan kembali.
 */
function topengNomor(wa: string): string {
  const d = wa.replace(/\D/g, "");
  if (d.length <= 7) return d;
  return `${d.slice(0, 4)}••••${d.slice(-3)}`;
}

/**
 * Varian nomor untuk pencarian.
 *
 * Nomor tersimpan bisa dalam format 62812... atau 0812..., tergantung apa
 * yang diketik penjual. Kalau admin mencari dengan format yang berbeda dari
 * yang tersimpan, pencocokan langsung akan gagal walaupun nomornya sama.
 * Jadi kedua bentuk dicoba.
 */
function varianNomor(q: string): string[] {
  const d = q.replace(/\D/g, "");
  if (d.length < 6) return [];
  const keluar = new Set<string>([d]);
  if (d.startsWith("0")) keluar.add("62" + d.slice(1));
  if (d.startsWith("62")) keluar.add("0" + d.slice(2));
  if (d.startsWith("8")) {
    keluar.add("0" + d);
    keluar.add("62" + d);
  }
  return [...keluar];
}

const BATAS = 500;

export type JumlahStatusBarangAdmin = Record<ListingStatus, number>;

/**
 * Syarat pencarian yang dipakai bersama oleh daftar dan hitungan tab status.
 * Pencocokan nomor tetap dilakukan di server agar nomor lengkap tidak pernah
 * ikut dikirim ke browser.
 */
function syaratPencarian(kueri: string) {
  if (!kueri) return undefined;
  // Escape wildcard LIKE supaya "%" atau "_" yang diketik admin tidak
  // menjadi wildcard (lihat escapeLike di lib/listing-query.ts).
  const aman = escapeLike(kueri);
  const varian = varianNomor(kueri);
  return or(
    ilike(listings.title, `%${aman}%`),
    ilike(listings.sellerName, `%${aman}%`),
    ...varian.map((v) => ilike(listings.sellerWhatsapp, `%${escapeLike(v)}%`)),
  );
}

/**
 * Ambil daftar barang untuk admin, terbaru dulu.
 *
 * `q` mencari di judul, nama penjual, dan nomor WhatsApp. Pencariannya di
 * server, bukan di klien, karena nomor WhatsApp tidak pernah dikirim ke
 * browser dalam bentuk lengkap — jadi klien memang tidak punya bahan untuk
 * mencocokkan.
 */
export async function daftarBarangAdmin(
  q?: string,
  status?: ListingStatus,
): Promise<BarangAdmin[]> {
  const kueri = (q ?? "").trim();
  const syarat = and(
    syaratPencarian(kueri),
    status ? eq(listings.status, status) : undefined,
  );

  const baris = await db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      sellerName: listings.sellerName,
      sellerWhatsapp: listings.sellerWhatsapp,
      createdAt: listings.createdAt,
      deadlineDate: listings.deadlineDate,
      status: listings.status,
      viewCount: listings.viewCount,
      whatsappClicks: listings.whatsappClicks,
      stallId: listings.stallId,
      price: listings.price,
      isFree: listings.isFree,
      pickupLandmark: listings.pickupLandmark,
      // Jumlah laporan OPEN — subquery per baris, bukan join+group,
      // supaya tidak mengubah kardinalitas hasil utama.
      jumlahLaporan: sql<number>`(
        select count(*)::int from reports r
        where r.listing_id = ${listings.id} and r.status = 'OPEN'
      )`,
    })
    .from(listings)
    .where(syarat)
    .orderBy(desc(listings.createdAt))
    .limit(BATAS);

  // Nama lapak diambil terpisah, bukan lewat join.
  //
  // KENAPA: join mengembalikan objek bersarang di Drizzle, dan bentuk itu
  // harus dibongkar lagi. Untuk sekadar mengambil nama, satu query tambahan
  // dengan `inArray` lebih jelas dibaca dan tidak menambah kerumitan tipe.
  const idLapak = [...new Set(baris.map((b) => b.stallId).filter(Boolean))] as string[];

  const petaLapak = new Map<string, { nama: string | null; jumlah: number }>();
  if (idLapak.length > 0) {
    const info = await db
      .select({ id: stalls.id, nama: stalls.displayName })
      .from(stalls)
      .where(inArray(stalls.id, idLapak));

    const hitung = await db
      .select({ stallId: listings.stallId, jumlah: sql<number>`count(*)::int` })
      .from(listings)
      .where(inArray(listings.stallId, idLapak))
      .groupBy(listings.stallId);

    const petaHitung = new Map(hitung.map((h) => [h.stallId, h.jumlah]));
    for (const l of info) {
      petaLapak.set(l.id, { nama: l.nama, jumlah: petaHitung.get(l.id) ?? 0 });
    }
  }

  return baris.map((b) => {
    const lapak = b.stallId ? petaLapak.get(b.stallId) : undefined;
    return {
      id: b.id,
      title: b.title,
      description: b.description,
      sellerName: b.sellerName,
      waTopeng: topengNomor(b.sellerWhatsapp),
      price: b.price,
      isFree: b.isFree,
      pickupLandmark: b.pickupLandmark,
      createdAt: b.createdAt.toISOString(),
      deadlineDate: b.deadlineDate,
      status: b.status,
      viewCount: b.viewCount,
      whatsappClicks: b.whatsappClicks,
      stallId: b.stallId ?? null,
      stallNama: lapak?.nama ?? null,
      // Dikurangi satu karena barang ini termasuk di dalam hitungan lapaknya.
      barangLapakLain: lapak ? Math.max(0, lapak.jumlah - 1) : 0,
      jumlahLaporan: b.jumlahLaporan,
    };
  });
}

/** Hitung jumlah tiap status untuk kata pencarian yang sama dengan daftar. */
export async function hitungStatusBarangAdmin(
  q?: string,
): Promise<JumlahStatusBarangAdmin> {
  const kueri = (q ?? "").trim();
  const baris = await db
    .select({ status: listings.status, jumlah: sql<number>`count(*)::int` })
    .from(listings)
    .where(syaratPencarian(kueri))
    .groupBy(listings.status);

  const hasil = Object.fromEntries(
    STATUS_VALUES.map((status) => [status, 0]),
  ) as JumlahStatusBarangAdmin;
  for (const b of baris) {
    if (STATUS_VALUES.includes(b.status as ListingStatus)) {
      hasil[b.status as ListingStatus] = b.jumlah;
    }
  }
  return hasil;
}

/**
 * Ambil tautan kelola + publik untuk SATU barang.
 *
 * Dipanggil hanya dari endpoint yang sudah memeriksa sesi admin, dan hanya
 * saat admin menekan tombol untuk satu barang tertentu.
 */
export async function tautanBarang(listingId: string) {
  const [barang] = await db
    .select({
      id: listings.id,
      secretToken: listings.secretToken,
      stallId: listings.stallId,
    })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);

  if (!barang) return null;

  let lapak: { id: string; secretToken: string } | null = null;
  if (barang.stallId) {
    const [s] = await db
      .select({ id: stalls.id, secretToken: stalls.secretToken })
      .from(stalls)
      .where(eq(stalls.id, barang.stallId))
      .limit(1);
    lapak = s ?? null;
  }

  return {
    listingId: barang.id,
    /** Token barang itu sendiri. */
    tokenBarang: barang.secretToken,
    lapak: lapak ? { id: lapak.id, token: lapak.secretToken } : null,
  };
}
