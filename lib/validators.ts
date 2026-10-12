import { z } from "zod";
import { tanggalHariIniID } from "./format";

/**
 * Skema validasi (Zod) — ambang batas PERSIS dari PRD-Enhanced §FR-3.
 * Dipakai bersama oleh form (klien) dan API (server) supaya tidak ada
 * perbedaan aturan antara keduanya.
 */

export const KONDISI = ["SEPERTI_BARU", "MINUS_PEMAKAIAN", "PERLU_SERVIS_RINGAN"] as const;
export const STATUS = ["AVAILABLE", "TAKEN", "EXPIRED", "DELETED"] as const;

export const WA_REGEX = /^(\+62|62|0)8[1-9][0-9]{6,11}$/;

export const MAX_HARI_TENGGAT = 14;

export const listingSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Judul minimal 3 karakter")
      .max(50, "Judul maksimal 50 karakter"),

    description: z
      .string()
      .trim()
      .min(10, "Deskripsi minimal 10 karakter")
      .max(500, "Deskripsi maksimal 500 karakter"),

    category_id: z.string().min(1, "Pilih kategori"),

    condition: z.enum(KONDISI, {
      errorMap: () => ({ message: "Pilih kondisi barang" }),
    }),

    is_free: z.boolean(),

    price: z.coerce
      .number()
      .int("Harga harus bilangan bulat")
      .min(0, "Harga tidak boleh negatif")
      .max(100_000_000, "Harga maksimal Rp 100.000.000"),

    // Wilayah berjenjang. Hanya FORMAT yang diperiksa di sini; keberadaan
    // kode dan kecocokan antar tingkat diverifikasi di lib/wilayah-server.ts
    // (butuh berkas 239 KB yang tidak boleh masuk bundel klien).
    province_code: z.string().regex(/^\d{2}$/, "Pilih provinsi"),
    regency_code: z.string().regex(/^\d{2}\.\d{2}$/, "Pilih kabupaten/kota"),
    district_code: z.string().regex(/^\d{2}\.\d{2}\.\d{2}$/, "Pilih kecamatan"),

    pickup_landmark: z
      .string()
      .trim()
      .min(5, "Patokan lokasi minimal 5 karakter")
      .max(150, "Patokan lokasi maksimal 150 karakter"),

    deadline_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid"),

    access_notes: z
      .string()
      .trim()
      .max(200, "Catatan akses maksimal 200 karakter")
      .optional()
      .or(z.literal("")),

    seller_name: z
      .string()
      .trim()
      .min(2, "Nama minimal 2 karakter")
      .max(50, "Nama maksimal 50 karakter"),

    seller_whatsapp: z
      .string()
      .trim()
      .regex(WA_REGEX, "Nomor WhatsApp tidak valid. Gunakan 08xx atau +62."),
  })
  .refine((d) => d.is_free || d.price > 0, {
    message: "Isi harga, atau aktifkan Berikan Gratis",
    path: ["price"],
  });

export type ListingInput = z.infer<typeof listingSchema>;

/**
 * Validasi tenggat: hari ini s/d hari ini + MAX_HARI_TENGGAT.
 *
 * Memakai perbandingan tanggal murni (YYYY-MM-DD) dalam zona WIB, bukan
 * selisih milidetik dari tengah malam lokal server. Dua alasan:
 *
 *  1. Server Vercel berjalan di UTC, sedangkan tanggal tenggat adalah konsep
 *     kalender pengguna di Indonesia. Menghitung selisih terhadap tengah
 *     malam lokal server membuat listing dengan tenggat "hari ini" ditolak
 *     sebagai "sebelum hari ini" antara pukul 00:00–06:59 WIB.
 *  2. Aturan yang sama dipakai katalog (deadline >= hari ini), jadi validasi
 *     dan penyaringan tidak mungkin berbeda pendapat soal tanggal.
 */
export function validasiTenggat(ymd: string, now = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "Format tanggal tidak valid";

  const hariIni = tanggalHariIniID(now);
  if (ymd < hariIni) return "Tanggal tidak boleh sebelum hari ini";

  /**
   * Batas atas = hari ini + MAX_HARI_TENGGAT, dihitung dalam zona WIB.
   *
   * JANGAN memakai `now.getTime() + n * 86_400_000` lalu `toISOString()`:
   * itu kembali ke tanggal UTC dan menggeser batasnya sehari untuk pengguna
   * Indonesia. Geser tanggalnya dulu, baru ambil tanggal WIB-nya.
   *
   * CATATAN: sebelumnya di sini tertulis `MAX_HARI_TENGGAT + 1`, sehingga
   * server menerima tenggat 15 hari padahal aturannya 14 — kalender di form
   * sudah benar sejak awal, tapi server terlalu longgar. Terbukti dengan uji:
   * POST tenggat +15 hari dijawab 201, seharusnya 400.
   */
  const batasMaks = tanggalHariIniID(
    new Date(now.getTime() + MAX_HARI_TENGGAT * 86_400_000),
  );
  if (ymd > batasMaks) return `Maksimal ${MAX_HARI_TENGGAT} hari dari sekarang`;
  return null;
}

export const statusSchema = z.object({
  token: z.string().min(20, "Token tidak valid"),
  status: z.enum(["TAKEN", "DELETED", "AVAILABLE"]),
});

/**
 * Skema untuk MENGUBAH listing dari dashboard penjual.
 *
 * Sengaja memakai `listingSchema` yang sama dengan form pasang, supaya aturan
 * validasinya tidak pernah berbeda antara "saat dipasang" dan "saat diubah".
 * Menulis skema kedua adalah cara paling mudah membuat keduanya menyimpang.
 */
export const editSchema = listingSchema.and(
  z.object({ token: z.string().min(20, "Token tidak valid") }),
);
