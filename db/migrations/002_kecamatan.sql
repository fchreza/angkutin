-- Migrasi: ganti `clusters` dengan wilayah administratif berjenjang
--
-- Model lama : listing -> cluster_id  (kluster karangan, mis. "Babarsari")
-- Model baru : listing -> provinsi -> kabupaten/kota -> kecamatan
--
-- Alasan: kecamatan adalah satuan resmi (7.285 di Indonesia), jadi tidak perlu
-- mengarang nama wilayah. Katalog publik menyaring sampai kabupaten/kota;
-- kecamatan dipakai di form pasang sebagai penanda lokasi barang.
--
-- AMAN: tabel listings kosong (0 baris) dan clusters kosong saat migrasi ini
-- dibuat, jadi tidak ada data yang perlu dipindahkan.
--
-- AMAN DIULANG (idempotent): semua pakai IF EXISTS / IF NOT EXISTS.

-- 1. Kolom wilayah di listings.
--    Nama wilayah ikut disimpan (bukan hanya kode) supaya render kartu tidak
--    perlu join atau membaca berkas data wilayah setiap kali.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS province_code VARCHAR(2);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS province_name VARCHAR(100);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS regency_code VARCHAR(5);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS regency_name VARCHAR(100);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS district_code VARCHAR(8);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS district_name VARCHAR(100);

-- 2. Kabupaten/kota WAJIB (katalog menyaring sampai level ini), kecamatan juga
--    wajib karena form pasang selalu mengisinya. Diisi NOT NULL hanya kalau
--    tabel kosong — kalau ada baris lama tanpa wilayah, migrasi ini akan gagal
--    dengan pesan jelas, bukan diam-diam mengisi data yang salah.
DO $$
BEGIN
  IF (SELECT count(*) FROM listings) = 0 THEN
    ALTER TABLE listings ALTER COLUMN regency_code SET NOT NULL;
    ALTER TABLE listings ALTER COLUMN regency_name SET NOT NULL;
    ALTER TABLE listings ALTER COLUMN district_code SET NOT NULL;
    ALTER TABLE listings ALTER COLUMN district_name SET NOT NULL;
  END IF;
END $$;

-- 3. Indeks untuk filter katalog (sampai kabupaten) dan pengelompokan kecamatan.
CREATE INDEX IF NOT EXISTS idx_listings_regency ON listings(regency_code);
CREATE INDEX IF NOT EXISTS idx_listings_province ON listings(province_code);
CREATE INDEX IF NOT EXISTS idx_listings_district ON listings(district_code);

-- 4. Buang ketergantungan pada clusters, lalu hapus tabelnya.
ALTER TABLE listings DROP COLUMN IF EXISTS cluster_id;
DROP TABLE IF EXISTS clusters;
