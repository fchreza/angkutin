-- Migrasi: index untuk mempercepat query katalog.
--
-- KENAPA INI PERLU:
-- Query feed selalu menyaring `status = 'AVAILABLE'` DAN `deadline_date >= hari
-- ini`, lalu mengurutkan menurut `deadline_date`. Tanpa index, Postgres harus
-- membaca seluruh tabel setiap kali katalog dibuka.
--
-- Index gabungan ini melayani ketiga hal sekaligus (saring status, saring
-- tenggat, urut tenggat), jadi Postgres bisa langsung mengambil baris yang
-- dibutuhkan tanpa memindai tabel.
--
-- Urutan kolom penting: kolom penyaring kesetaraan (`status`) lebih dulu,
-- baru kolom rentang/urutan (`deadline_date`). Kalau dibalik, index tidak
-- terpakai untuk penyaringan status.

CREATE INDEX IF NOT EXISTS idx_listings_feed
  ON listings (status, deadline_date);

-- Katalog menyaring sampai kabupaten/kota, jadi kolom ini sering dipakai.
CREATE INDEX IF NOT EXISTS idx_listings_regency
  ON listings (regency_code, status, deadline_date);

-- Pencarian teks memakai ILIKE pada judul. Index trigram membuat ILIKE '%kata%'
-- bisa memakai index, bukan memindai seluruh tabel.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_listings_title_trgm
  ON listings USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_listings_landmark_trgm
  ON listings USING gin (pickup_landmark gin_trgm_ops);

-- Halaman kelola mencari listing berdasarkan token rahasia.
CREATE INDEX IF NOT EXISTS idx_listings_secret_token
  ON listings (secret_token);

-- Foto diambil per listing, diurutkan menurut display_order.
CREATE INDEX IF NOT EXISTS idx_listing_images_listing
  ON listing_images (listing_id, display_order);
