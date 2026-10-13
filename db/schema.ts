import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Skema database Angkutin — persis mengikuti PRD-Enhanced.md §10.1
 * (+ tambahan ENHANCED: view_count, whatsapp_clicks untuk KPI).
 *
 * Catatan desain penting:
 * - TIDAK ada tabel `users`. Produk ini sengaja tanpa akun (zero-friction).
 *   Akses kelola memakai token rahasia, bukan identitas pengguna.
 * - Ada DUA tingkat akses kelola:
 *     1. `stalls.secret_token`  -> satu lapak, bisa mengelola SEMUA barangnya
 *     2. `listings.secret_token` -> satu barang (tautan lama, DIPERTAHANKAN
 *        supaya tautan yang sudah beredar tidak mati)
 *   Halaman kelola memeriksa lapak lebih dulu, lalu jatuh ke token listing.
 * - Nomor WhatsApp penjual disimpan di tabel `listings` dan TIDAK pernah
 *   dikirim ke halaman publik (hanya dipakai untuk membangun link wa.me).
 */

/**
 * Lapak: kumpulan barang milik satu penjual anonim.
 *
 * KENAPA ANONIM: produk ini tanpa pendaftaran. Yang menjadi kunci akses adalah
 * `secret_token` itu sendiri — tidak ada email, kata sandi, atau verifikasi.
 * Lapak hanya punya nama tampilan OPSIONAL, untuk membedakan beberapa lapak di
 * perangkat yang sama.
 */
export const stalls = pgTable("stalls", {
  id: uuid("id").primaryKey().defaultRandom(),
  secretToken: varchar("secret_token", { length: 64 }).notNull().unique(),
  displayName: varchar("display_name", { length: 60 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  displayOrder: smallint("display_order").default(0).notNull(),
});

export const listings = pgTable("listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  /**
   * Token kelola PER BARANG — tautan lama yang sudah beredar.
   *
   * SENGAJA DIPERTAHANKAN meski sudah ada token lapak: penjual mungkin sudah
   * menyimpan tautan ini di catatan atau mengirimnya ke WhatsApp sendiri.
   * Menghapusnya akan mematikan tautan itu seketika. Halaman kelola menerima
   * KEDUANYA.
   */
  secretToken: varchar("secret_token", { length: 64 }).notNull().unique(),
  /**
   * Lapak pemilik barang ini. NULLABLE karena barang yang dibuat sebelum
   * migrasi 004 belum punya lapak — dan tidak boleh hilang hanya karena kita
   * menambah kolom. Diisi lewat alur "pindahkan ke lapak" yang dijalankan
   * penjual sendiri.
   */
  stallId: uuid("stall_id").references(() => stalls.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 50 }).notNull(),
  description: text("description").notNull(),
  categoryId: varchar("category_id", { length: 36 }).references(() => categories.id),
  condition: varchar("condition", { length: 24 }).notNull(),
  isFree: boolean("is_free").default(false).notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).default("0").notNull(),
  // Wilayah administratif berjenjang. Nama ikut disimpan supaya render kartu
  // tidak perlu join atau membaca berkas data wilayah.
  provinceCode: varchar("province_code", { length: 2 }),
  provinceName: varchar("province_name", { length: 100 }),
  regencyCode: varchar("regency_code", { length: 5 }).notNull(),
  regencyName: varchar("regency_name", { length: 100 }).notNull(),
  districtCode: varchar("district_code", { length: 8 }).notNull(),
  districtName: varchar("district_name", { length: 100 }).notNull(),
  pickupLandmark: varchar("pickup_landmark", { length: 150 }).notNull(),
  deadlineDate: date("deadline_date").notNull(),
  accessNotes: varchar("access_notes", { length: 200 }),
  sellerName: varchar("seller_name", { length: 50 }).notNull(),
  sellerWhatsapp: varchar("seller_whatsapp", { length: 20 }).notNull(),
  status: varchar("status", { length: 12 }).default("AVAILABLE").notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  whatsappClicks: integer("whatsapp_clicks").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const listingImages = pgTable("listing_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  imageUrl: varchar("image_url", { length: 255 }).notNull(),
  displayOrder: smallint("display_order").default(0).notNull(),
});

/**
 * Kunjungan halaman — analytics milik sendiri, tanpa pihak ketiga.
 *
 * KENAPA TIDAK ADA KOLOM IP SAMA SEKALI:
 * Tabel ini sengaja tidak menyimpan apa pun yang bisa mengarah ke orang.
 * Yang dicatat hanya halaman apa yang dibuka, dari jenis rujukan mana, dan
 * perkiraan ukuran layar. Pertanyaan yang ingin dijawab adalah "halaman mana
 * yang dipakai", bukan "siapa yang memakainya".
 *
 * `ip_hash` tetap disimpan di tabel rate_limits karena di sana memang perlu
 * untuk membatasi penyalahgunaan, dan hanya berupa hash yang dibuang setelah
 * 24 jam. Di sini tidak ada kebutuhan seperti itu.
 */
export const pageviews = pgTable("pageviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Jalur halaman saja, tanpa query string (token tidak pernah ikut). */
  path: varchar("path", { length: 200 }).notNull(),
  /** Klasifikasi jenis rujukan: langsung, internal, whatsapp, mesin-cari. */
  referrer: varchar("referrer", { length: 16 }).notNull(),
  /** Lebar viewport, dibulatkan ke 50px. Cukup untuk tahu ponsel vs desktop. */
  width: smallint("width").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Tabel bantu untuk rate limiting POST /api/v1/listings (5/jam/IP). */
export const rateLimits = pgTable("rate_limits", {
  id: uuid("id").primaryKey().defaultRandom(),
  ipHash: varchar("ip_hash", { length: 64 }).notNull(),
  action: varchar("action", { length: 32 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const CONDITION_VALUES = [
  "SEPERTI_BARU",
  "MINUS_PEMAKAIAN",
  "PERLU_SERVIS_RINGAN",
] as const;

export const STATUS_VALUES = ["AVAILABLE", "TAKEN", "EXPIRED", "DELETED"] as const;

export type Condition = (typeof CONDITION_VALUES)[number];
export type ListingStatus = (typeof STATUS_VALUES)[number];
export type Listing = typeof listings.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Stall = typeof stalls.$inferSelect;
export type Pageview = typeof pageviews.$inferSelect;

export { sql };
