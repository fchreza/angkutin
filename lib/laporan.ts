import { db } from "@/db";
import { listings, reports, REPORT_REASON_VALUES } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

/**
 * Antrian laporan penyalahgunaan untuk halaman admin.
 *
 * KENAPA LAPORAN DIPISAH DARI DAFTAR BARANG: laporan adalah antrean kerja
 * ("apa yang harus saya tinjau hari ini"), sedangkan daftar barang adalah
 * direktori ("cari barang tertentu"). Mencampurnya membuat keduanya lebih
 * sulit dipakai.
 *
 * KENAPA YANG DITAMPILKAN HANYA YANG OPEN: antrian yang berisi laporan yang
 * sudah ditangani bukan antrian — itu arsip. Admin menandai selesai lewat
 * endpoint /api/v1/admin/reports, dan laporan itu hilang dari sini.
 */

export type LaporanAdmin = {
  id: string;
  listingId: string;
  judulBarang: string;
  statusBarang: string;
  reason: string;
  detail: string | null;
  dibuat: string;
};

export const LABEL_ALASAN_LAPORAN: Record<string, string> = {
  SPAM: "Spam",
  PENIPUAN: "Indikasi penipuan",
  BARANG_SUDAH_TIDAK_ADA: "Barang sudah tidak ada",
  KONTEN_TIDAK_PANTAS: "Konten tidak pantas",
  LAINNYA: "Lainnya",
};

export async function daftarLaporan(): Promise<LaporanAdmin[]> {
  const baris = await db
    .select({
      id: reports.id,
      listingId: reports.listingId,
      judulBarang: listings.title,
      statusBarang: listings.status,
      reason: reports.reason,
      detail: reports.detail,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .innerJoin(listings, eq(reports.listingId, listings.id))
    .where(eq(reports.status, "OPEN"))
    .orderBy(desc(reports.createdAt))
    .limit(200);

  return baris.map((b) => ({
    id: b.id,
    listingId: b.listingId,
    judulBarang: b.judulBarang,
    statusBarang: b.statusBarang,
    reason: b.reason,
    detail: b.detail,
    dibuat: b.createdAt.toISOString(),
  }));
}

/** Jumlah laporan OPEN — dipakai untuk badge di halaman admin. */
export async function hitungLaporanTerbuka(): Promise<number> {
  const baris = await db
    .select({ id: reports.id })
    .from(reports)
    .where(eq(reports.status, "OPEN"));
  return baris.length;
}

/** Tandai laporan sudah ditinjau. Mengembalikan false bila id tidak dikenal. */
export async function tandaiLaporanDitinjau(id: string): Promise<boolean> {
  const hasil = await db
    .update(reports)
    .set({ status: "REVIEWED" })
    .where(eq(reports.id, id))
    .returning({ id: reports.id });
  return hasil.length > 0;
}

export { REPORT_REASON_VALUES };
