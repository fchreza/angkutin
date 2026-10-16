-- Migrasi 007: tabel blocked_numbers untuk memblokir nomor WhatsApp pelanggar.
--
-- KENAPA TABEL INI ADA:
-- Angkutin tanpa akun — satu-satunya identitas yang bisa dipakai untuk
-- menghentikan pelanggar berulang (spam, penipuan) adalah nomor WhatsApp-nya.
-- Tanpa tabel ini, spammer yang listingnya dihapus admin bisa memasang lagi
-- dalam 5 menit dengan nomor yang sama.
--
-- KENAPA SIMPAN HASH, BUKAN NOMOR ASLI:
-- Nomor WhatsApp adalah data pribadi. Menyimpan hash SHA-256 cukup untuk
-- pencocokan blokir tanpa menyimpan nomornya dalam bentuk yang bisa dibaca.
-- Normalisasi (hanya digit, tanpa awalan 0/62 ganda) dilakukan sebelum hash
-- supaya varian penulisan nomor tetap cocok.
--
-- AMAN DIULANG (idempotent): pakai IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS blocked_numbers (
  -- Hash SHA-256 heksadesimal dari nomor yang dinormalisasi (hanya digit).
  id varchar(64) PRIMARY KEY,
  -- Alasan pemblokiran, untuk audit admin.
  alasan text,
  created_at timestamptz NOT NULL DEFAULT now()
);
