-- Migrasi: tambah kolom wilayah + koordinat di tabel clusters
--
-- Tujuan: kluster bisa difilter berdasarkan provinsi & kabupaten/kota, dan
-- tombol "Gunakan Lokasi Saya" bisa mencari kluster terdekat.
--
-- Koordinat diisi dari hasil geocoding (Nominatim/OpenStreetMap) untuk 6
-- kluster awal. province_code / regency_code memakai kode BPS (wilayah.id)
-- supaya cocok dengan daftar 514 kabupaten/kota di lib/data/wilayah.json.
--
-- AMAN DIULANG (idempotent): pakai IF NOT EXISTS.

ALTER TABLE clusters ADD COLUMN IF NOT EXISTS province_code VARCHAR(2);
ALTER TABLE clusters ADD COLUMN IF NOT EXISTS province_name VARCHAR(100);
ALTER TABLE clusters ADD COLUMN IF NOT EXISTS regency_code VARCHAR(5);
ALTER TABLE clusters ADD COLUMN IF NOT EXISTS regency_name VARCHAR(100);
ALTER TABLE clusters ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6);
ALTER TABLE clusters ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

-- Isi data wilayah + koordinat untuk 6 kluster awal.
-- Sleman = 34.04 (DIY) · Depok = 32.76 (Jabar) · Sumedang = 32.11 (Jabar)
-- Kota Bandung = 32.73 · Kota Semarang = 33.74 (Jateng)
UPDATE clusters SET province_code='34', province_name='Daerah Istimewa Yogyakarta',
       regency_code='34.04', regency_name='Kabupaten Sleman',
       latitude=-7.757540, longitude=110.373230
 WHERE id='pogung';

UPDATE clusters SET province_code='34', province_name='Daerah Istimewa Yogyakarta',
       regency_code='34.04', regency_name='Kabupaten Sleman',
       latitude=-7.773940, longitude=110.412190
 WHERE id='babarsari';

UPDATE clusters SET province_code='32', province_name='Jawa Barat',
       regency_code='32.76', regency_name='Kota Depok',
       latitude=-6.366050, longitude=106.818160
 WHERE id='kukusan';

UPDATE clusters SET province_code='32', province_name='Jawa Barat',
       regency_code='32.11', regency_name='Kabupaten Sumedang',
       latitude=-6.934270, longitude=107.772310
 WHERE id='jatinangor';

UPDATE clusters SET province_code='32', province_name='Jawa Barat',
       regency_code='32.73', regency_name='Kota Bandung',
       latitude=-6.868990, longitude=107.593400
 WHERE id='setiabudi';

UPDATE clusters SET province_code='33', province_name='Jawa Tengah',
       regency_code='33.74', regency_name='Kota Semarang',
       latitude=-7.060150, longitude=110.446600
 WHERE id='tembalang';

-- Indeks untuk filter wilayah.
CREATE INDEX IF NOT EXISTS idx_clusters_regency ON clusters(regency_code) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_clusters_province ON clusters(province_code) WHERE is_active;
