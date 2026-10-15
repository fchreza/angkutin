-- Migrasi 006: tabel reports untuk laporan penyalahgunaan dari pengguna.
--
-- KENAPA TABEL INI ADA:
-- Marketplace tanpa akun tidak punya identitas pengguna yang bisa diblokir
-- atau sistem reputasi, jadi pertahanan terhadap spam/penipuan bergantung
-- pada laporan pengguna + tinjauan admin. Tanpa tabel ini, tidak ada saluran
-- resmi bagi pengguna untuk memberi tahu pengelola tentang listing bermasalah.
--
-- KENAPA TANPA IDENTITAS PELAPOR:
-- Meminta identitas akan menambah gesekan dan data pribadi yang harus dijaga.
-- Yang penting adalah listing mana yang bermasalah dan alasannya.

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  -- Alasan laporan: SPAM | PENIPUAN | BARANG_SUDAH_TIDAK_ADA |
  -- KONTEN_TIDAK_PANTAS | LAINNYA
  reason varchar(32) NOT NULL,
  detail text,
  -- OPEN = belum ditinjau admin, REVIEWED = sudah ditangani.
  status varchar(12) NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indeks untuk antrian admin: laporan yang belum ditinjau, terbaru dulu.
CREATE INDEX IF NOT EXISTS idx_reports_status_created
  ON reports (status, created_at DESC);

-- Indeks untuk melihat semua laporan pada satu listing.
CREATE INDEX IF NOT EXISTS idx_reports_listing
  ON reports (listing_id);
