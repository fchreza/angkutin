-- Migrasi 005: tabel pageviews untuk analytics milik sendiri.
--
-- KENAPA TANPA KOLOM IP SAMA SEKALI:
-- Tabel ini sengaja tidak menyimpan apa pun yang bisa mengarah ke orang.
-- Yang dicatat hanya halaman apa yang dibuka, dari jenis rujukan mana, dan
-- perkiraan ukuran layar. Pertanyaan yang ingin dijawab adalah "halaman mana
-- yang dipakai", bukan "siapa yang memakainya".
--
-- Ini juga sebabnya tidak ada cookie maupun penyimpanan di perangkat: tanpa
-- keduanya, tidak ada cara menggabungkan dua kunjungan menjadi satu orang.

CREATE TABLE IF NOT EXISTS pageviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Jalur halaman saja, TANPA query string. Token lapak tidak pernah masuk
  -- ke kolom ini; klien dan server sama-sama menyaringnya.
  path varchar(200) NOT NULL,
  -- Jenis rujukan: langsung | internal | whatsapp | mesin-cari | lainnya.
  referrer varchar(16) NOT NULL,
  -- Lebar viewport dibulatkan ke 50px. Cukup untuk tahu ponsel vs desktop.
  width smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indeks untuk pertanyaan yang paling sering ditanyakan: "halaman apa yang
-- paling banyak dibuka dalam periode tertentu". Urutan (path, created_at)
-- dipilih supaya satu query bisa memakai indeks untuk menyaring DAN
-- mengelompokkan sekaligus.
CREATE INDEX IF NOT EXISTS idx_pageviews_path_created
  ON pageviews (path, created_at DESC);

-- Indeks terpisah untuk pembersihan berkala oleh cron, yang menyaring hanya
-- berdasarkan waktu. Tanpa indeks ini, pembersihan akan memindai seluruh
-- tabel setiap hari dan itu makin lambat seiring tabelnya membesar.
CREATE INDEX IF NOT EXISTS idx_pageviews_created
  ON pageviews (created_at);
