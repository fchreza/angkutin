import { db } from "@/db";
import { listings, stalls } from "@/db/schema";
import { desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

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
  sellerName: string;
  /** Nomor WhatsApp BERTopeng. Lihat alasan di bawah. */
  waTopeng: string;
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

/**
 * Ambil daftar barang untuk admin, terbaru dulu.
 *
 * `q` mencari di judul, nama penjual, dan nomor WhatsApp. Pencariannya di
 * server, bukan di klien, karena nomor WhatsApp tidak pernah dikirim ke
 * browser dalam bentuk lengkap — jadi klien memang tidak punya bahan untuk
 * mencocokkan.
 */
export async function daftarBarangAdmin(q?: string): Promise<BarangAdmin[]> {
  const kueri = (q ?? "").trim();
  const varian = varianNomor(kueri);

  const syarat = kueri
    ? or(
        ilike(listings.title, `%${kueri}%`),
        ilike(listings.sellerName, `%${kueri}%`),
        ...varian.map((v) => ilike(listings.sellerWhatsapp, `%${v}%`)),
      )
    : undefined;

  const baris = await db
    .select({
      id: listings.id,
      title: listings.title,
      sellerName: listings.sellerName,
      sellerWhatsapp: listings.sellerWhatsapp,
      createdAt: listings.createdAt,
      deadlineDate: listings.deadlineDate,
      status: listings.status,
      viewCount: listings.viewCount,
      whatsappClicks: listings.whatsappClicks,
      stallId: listings.stallId,
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
      sellerName: b.sellerName,
      waTopeng: topengNomor(b.sellerWhatsapp),
      createdAt: b.createdAt.toISOString(),
      deadlineDate: b.deadlineDate,
      status: b.status,
      viewCount: b.viewCount,
      whatsappClicks: b.whatsappClicks,
      stallId: b.stallId ?? null,
      stallNama: lapak?.nama ?? null,
      // Dikurangi satu karena barang ini termasuk di dalam hitungan lapaknya.
      barangLapakLain: lapak ? Math.max(0, lapak.jumlah - 1) : 0,
    };
  });
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
