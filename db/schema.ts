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
 *   Akses kelola listing memakai `secret_token` per listing.
 * - Nomor WhatsApp penjual disimpan di tabel `listings` dan TIDAK pernah
 *   dikirim ke halaman publik (hanya dipakai untuk membangun link wa.me).
 */

export const clusters = pgTable("clusters", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  // Wilayah administratif — dipakai filter provinsi & kabupaten/kota.
  // Kode memakai standar BPS supaya cocok dengan lib/data/wilayah.json.
  provinceCode: varchar("province_code", { length: 2 }),
  provinceName: varchar("province_name", { length: 100 }),
  regencyCode: varchar("regency_code", { length: 5 }),
  regencyName: varchar("regency_name", { length: 100 }),
  // Koordinat pusat kluster — dipakai "Gunakan Lokasi Saya" (hitung jarak).
  latitude: numeric("latitude", { precision: 9, scale: 6 }),
  longitude: numeric("longitude", { precision: 9, scale: 6 }),
});

export const categories = pgTable("categories", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  displayOrder: smallint("display_order").default(0).notNull(),
});

export const listings = pgTable("listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  secretToken: varchar("secret_token", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 50 }).notNull(),
  description: text("description").notNull(),
  categoryId: varchar("category_id", { length: 36 }).references(() => categories.id),
  condition: varchar("condition", { length: 24 }).notNull(),
  isFree: boolean("is_free").default(false).notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).default("0").notNull(),
  clusterId: varchar("cluster_id", { length: 36 }).references(() => clusters.id),
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
export type Cluster = typeof clusters.$inferSelect;
export type Category = typeof categories.$inferSelect;

export { sql };
