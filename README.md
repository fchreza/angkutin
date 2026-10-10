# Angkutin

Marketplace barang pindahan mahasiswa. **Tanpa daftar akun** — penjual memasang
listing dan mengelolanya lewat tautan rahasia.

Dibangun sesuai `docs/PRD-Enhanced.md` dan `docs/IMPLEMENTATION-GUIDE.md`.

## Tumpukan teknologi

| Lapisan | Pilihan | Catatan |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript | Server Components untuk render awal |
| Styling | Tailwind CSS | Token dari `docs/design-tokens.json` |
| Database | Neon Postgres + Drizzle ORM | Region `ap-southeast-1` (Singapore) |
| Foto | Neon Object Storage (S3-compatible) | Bucket `angkutin`, `public_read` |
| Hosting | Vercel | Cron harian untuk kedaluwarsa |

## Menjalankan lokal

```bash
npm install
cp .env.local.example .env.local   # isi kredensial
npm run dev                        # http://localhost:3000
```

## Variabel lingkungan

| Nama | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ya | Connection string Neon Postgres |
| `AWS_ENDPOINT_URL_S3` | ya | Endpoint Object Storage |
| `AWS_ACCESS_KEY_ID` | ya | Kunci akses S3 |
| `AWS_SECRET_ACCESS_KEY` | ya | Kunci rahasia S3 |
| `AWS_REGION` | ya | `ap-southeast-1` |
| `S3_BUCKET` | ya | `angkutin` |
| `CRON_SECRET` | ya | Bearer token untuk `/api/v1/cron/expire` |
| `NEXT_PUBLIC_SITE_URL` | ya | URL publik, untuk tautan kelola |

## Skema database

Dibuat lewat `db/schema.ts` (Drizzle). Lima tabel:

- `clusters` — wilayah kampus (Pogung, Kukusan, Jatinangor, Setiabudi, Babarsari, Tembalang)
- `categories` — kategori barang
- `listings` — data barang; `secret_token` = kunci tautan kelola
- `listing_images` — foto (maks 3, urutan 0-2)
- `rate_limits` — penghitung anti-spam per IP (hash SHA-256, bukan IP mentah)

Untuk menerapkan skema ke database baru:

```bash
npm run db:push
```

## API

| Metode | Rute | Fungsi |
|---|---|---|
| GET | `/api/v1/clusters` | Daftar kluster aktif |
| GET | `/api/v1/categories` | Daftar kategori |
| GET | `/api/v1/listings` | Feed + filter (`cluster_id`, `category_id`, `q`, `sort`) |
| POST | `/api/v1/listings` | Buat listing (rate limit 5/jam/IP) |
| GET | `/api/v1/listings/:id` | Detail satu listing |
| POST | `/api/v1/listings/:id/images` | Unggah 1-3 foto (butuh token) |
| POST | `/api/v1/listings/:id/wa-click` | Ambil link WhatsApp + catat klik |
| GET | `/api/v1/listings/manage/:id?token=` | Data dashboard penjual |
| PATCH | `/api/v1/listings/manage/:id/status` | Ubah status (butuh token) |
| GET | `/api/v1/cron/expire` | Tandai listing lewat tenggat (butuh `CRON_SECRET`) |

## Alur halaman

1. **`/`** Feed Katalog — filter kluster/kategori/pencarian/urutan
2. **`/listing/[id]`** Detail Barang — carousel foto, CTA WhatsApp
3. **`/pasang`** Form Pasang — kompresi foto di klien, pratinjau langsung
4. **`/manage/[id]?token=…`** Kelola Listing — status, statistik, tautan rahasia

## Keputusan desain penting

**Nomor WhatsApp penjual tidak pernah dikirim ke browser di halaman publik.**
Halaman detail hanya memuat tombol; nomornya diambil dari server saat diklik
(`POST /wa-click`). Ini mencegah pengikisan nomor massal. Nomor juga hanya
disimpan di Postgres — tidak pernah di object storage.

**Foto dikompresi di perangkat pengguna** (WebP, sisi terpanjang 1080 px,
< 500 KB) memakai Canvas API. Server Vercel membatasi body 4.5 MB, dan
pengguna di jaringan lambat tidak boleh mengunggah foto kamera 4 MB.

**Listing dibuat sebelum foto diunggah** (dua langkah). Kalau unggah foto
gagal, listing tetap tayang dan pengguna dibawa ke dashboard dengan
peringatan — bukan kehilangan seluruh isian.

**Tenggat kedaluwarsa difilter di level query**, bukan hanya mengandalkan cron.
Vercel Hobby hanya mengizinkan cron 1×/hari dengan jam tidak presisi, jadi
listing lewat tenggat sudah tersaring dari feed sejak awal; cron hanya
merapikan status di database.

**Tautan kelola memakai token 43 karakter** (`randomBytes(32)` → base64url)
dan dibandingkan dengan waktu tetap. Token salah dan listing tidak ada
sama-sama dibalas 404 supaya tidak bisa ditebak.

## Perintah

```bash
npm run dev        # pengembangan
npm run build      # build produksi
npm run start      # jalankan hasil build
npm run db:push    # terapkan skema ke database
```
