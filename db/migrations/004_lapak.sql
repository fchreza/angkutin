-- Migrasi 004: LAPAK (kumpulan barang milik satu penjual anonim).
--
-- KENAPA INI ADA:
-- Sebelumnya satu barang = satu token = satu tautan kelola. Penjual yang
-- menjual 5 barang pindahan harus menyimpan 5 tautan, dan kalau satu hilang,
-- barang itu tidak bisa dikelola lagi. Sekarang satu LAPAK punya satu tautan
-- rahasia yang bisa mengelola semua barang di dalamnya.
--
-- KENAPA TOKEN LISTING TIDAK DIHAPUS:
-- Tautan kelola lama (/manage/<listingId>?token=<token_listing>) sudah
-- beredar dan mungkin sudah disimpan penjual di catatan atau dikirim ke
-- WhatsApp sendiri. Menghapus kolom `secret_token` akan mematikan tautan itu
-- seketika. Jadi kolomnya DIPERTAHANKAN dan tetap sah — halaman kelola
-- memeriksa lapak lebih dulu, lalu jatuh ke token listing lama.
--
-- KENAPA TOKEN LAPAK TERPISAH, BUKAN SATU TOKEN UNTUK SEMUA:
-- Kalau satu token bocor, yang terdampak hanya barang di lapak itu. Kalau
-- memakai satu token global, sekali bocor berarti semua barang bisa dihapus
-- orang lain.
--
-- CATATAN: TIDAK ada tabel pengguna. Lapak bersifat anonim — yang menjadi
-- kunci akses adalah token itu sendiri. Tidak ada email, kata sandi, atau
-- verifikasi apa pun (sesuai prinsip zero-friction).

CREATE TABLE IF NOT EXISTS stalls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Token rahasia: randomBytes(32) base64url = 43 karakter, sama seperti
  -- token listing. Disimpan dengan batas 64 karakter supaya ada ruang kalau
  -- panjangnya berubah nanti.
  secret_token varchar(64) NOT NULL UNIQUE,
  -- Nama lapak bersifat OPSIONAL. Dipakai hanya untuk membedakan beberapa
  -- lapak di perangkat yang sama (mis. "Lapak kos lama", "Lapak kamar baru").
  -- Tidak wajib, karena memaksa mengisi nama akan menambah gesekan.
  display_name varchar(60),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Setiap barang milik satu lapak.
-- ON DELETE CASCADE: menghapus lapak ikut menghapus barangnya. Aman karena
-- lapak hanya bisa dihapus lewat token rahasianya.
-- NULLABLE: barang yang dibuat SEBELUM migrasi ini belum punya lapak, dan
-- tidak boleh hilang hanya karena kita menambah kolom. Kolomnya diisi lewat
-- alur "pindahkan ke lapak" yang dijalankan penjual sendiri.
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS stall_id uuid REFERENCES stalls(id) ON DELETE CASCADE;

-- Dashboard lapak menampilkan barang terbaru lebih dulu, jadi indexnya
-- (stall_id, created_at DESC) supaya Postgres tidak perlu mengurutkan ulang.
CREATE INDEX IF NOT EXISTS idx_listings_stall
  ON listings (stall_id, created_at DESC);

-- Halaman kelola lapak mencari berdasarkan token.
CREATE INDEX IF NOT EXISTS idx_stalls_secret_token
  ON stalls (secret_token);

-- PENTING: sengaja TIDAK ada backfill otomatis di sini.
--
-- Membuatkan lapak untuk setiap barang lama terlihat membantu, tetapi
-- berbahaya: lapak itu tidak punya pemilik yang diketahui, jadi tautan
-- rahasianya tidak bisa dikirim ke siapa pun — dan barangnya tetap hanya bisa
-- dikelola lewat tautan lamanya. Yang lebih benar adalah membiarkan penjual
-- MEMINDAHKAN sendiri barangnya ke lapak lewat tombol di halaman kelola lama.
-- Dengan begitu tidak ada lapak yatim yang tidak bisa diakses siapa pun.
