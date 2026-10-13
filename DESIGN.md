# angkutin — Arah Desain

Dokumen ini adalah sumber kebenaran untuk setiap keputusan visual di angkutin.
Kalau ada keputusan yang tidak bisa dijelaskan lewat dokumen ini, keputusan itu
belum layak diambil.

## Apa ini

Marketplace barang pindahan tanpa akun. Mahasiswa yang pindah kos memasang
barangnya dalam satu menit, dapat dua tautan (satu untuk dibagikan, satu
rahasia untuk mengelola), lalu pembeli menghubungi lewat WhatsApp. Tidak ada
pendaftaran, tidak ada pembayaran, tidak ada kurir.

## Untuk siapa

Mahasiswa dan anak kos di Indonesia, 18 sampai 25 tahun, hampir selalu di
ponsel, sering dengan koneksi lambat. Mereka tidak sedang berbelanja dengan
santai; mereka sedang buru-buru mengosongkan kamar sebelum tanggal keluar.

## Karakter

**Editorial hangat.** Kanvas krem, foto barang jadi bintang, tipografi besar
dan ramah, terasa lokal dan terpercaya. Ini bukan toko mewah dan bukan
dashboard perusahaan. Ini seperti katalog barang bekas yang ditata rapi oleh
orang yang peduli.

Tiga kata yang mengikat: **hangat, jujur, lapang.**

Tiga kata yang harus dihindari: **dingin, korporat, penuh.**

## Dial

```
ENERGY 2 / RHYTHM 2 / MOTION 2
```

- **ENERGY 2** — desain menyapa dengan tenang, tapi tidak datar. Bukan GOV.UK
  yang sepenuhnya linear, bukan portofolio agensi yang berteriak.
- **RHYTHM 2** — grid konsisten dengan beberapa jeda yang disengaja. Katalog
  itu grid; itu memang sifat produknya. Yang boleh berbeda hanya halaman
  Tentang dan kepala halaman detail.
- **MOTION 2** — transisi dan hover, tanpa parallax dan tanpa scroll-linked.
  Satu pengecualian: perpindahan tema eclipse, yang sudah ada dan sudah diuji.

Dial ini dipegang dari section pertama sampai terakhir.

## Warna

Hijau tetap identitas, tapi dihangatkan. Kanvasnya krem, bukan putih dingin.

### Terang

| Peran | Nilai | Alasan |
|---|---|---|
| Kanvas | `#FAF8F5` | Krem hangat. Putih murni terasa klinis; krem terasa seperti kertas. |
| Permukaan (kartu) | `#FFFFFF` | Kartu harus terpisah dari kanvas. Putih di atas krem justru terbaca sebagai lapisan, bukan sebagai dingin. |
| Permukaan tenggelam | `#F3F0EA` | Baris tabel, kolom filter, area yang tidak perlu menonjol. |
| Tinta utama | `#1C1A17` | Coklat-hitam, bukan hitam pekat. Hitam pekat di atas krem terasa patah. |
| Tinta sekunder | `#6B655C` | Abu hangat. |
| Tinta mono | `#8A8378` | Keterangan kecil, label. |
| Garis | `#E5E0D6` | Batas kartu. Harus terlihat, tidak boleh jadi garis yang berteriak. |
| Garis kuat | `#B5AEA1` | Batas input, harus lolos 3:1 terhadap kanvas. |
| Primary | `#0E7A4F` | Hijau dihidupkan dari `#047857`. Lebih banyak kroma, tetap lolos 4,5:1 dengan teks putih. |
| Primary hover | `#0A6541` | |
| Primary soft | `#E8F5EE` | Latar badge dan tombol sekunder. |
| Accent (urgensi) | `#C2410C` | Terracotta, bukan amber. Amber adalah warna peringatan sistem; terracotta adalah warna tanah, dan barang pindahan itu soal tanah dan waktu. |

### Gelap

Kanvas `#17150F` (coklat-gelap hangat, bukan abu netral), permukaan `#201D16`,
tinta `#F2EFE9`. Hijau dinaikkan ke `#3DBE85` supaya tetap terbaca sebagai
hijau di atas gelap, bukan jadi hijau lumpur.

Aturan: **setiap warna di kedua mode harus diukur, bukan diperkirakan.**
Teks normal minimal 4,5:1, teks besar minimal 3:1, batas input minimal 3:1.

## Tipografi

Dua rupa huruf, masing-masing dengan alasan tertulis.

### Plus Jakarta Sans — badan dan antarmuka

Dipesan untuk identitas kota Jakarta (Tokotype, 2020). Jadi huruf ini secara
harfiah membawa karakter "Indonesia, urban, muda" yang jadi tempat produk ini
hidup. Bentuknya geometris tapi hangat, dengan huruf `a`, `g`, dan `k` yang
khas. Ini alasan yang bisa ditulis satu baris, bukan "kelihatan bagus".

### Fraunces — judul besar saja

Serif editorial hangat dengan **optical sizing**: bentuk hurufnya benar-benar
berubah sesuai ukuran, yang persis prinsip tipografi display. Dipakai hanya di
atas 32px, dengan sumbu `SOFT` dinaikkan dan `WONK` dinyalakan supaya terasa
ditulis tangan, bukan dicetak.

### Aturan

- **Tracking bersifat per-ukuran.** Judul besar justru dirapatkan
  (`-0.02em`), teks kecil dilonggarkan. Satu nilai untuk semua ukuran adalah
  tanda tipografi yang belum dipikirkan.
- **Skala judul dinaikkan.** H1 katalog dari 26px jadi 40px di desktop. Judul
  yang kecil di halaman lapang membuat halamannya terasa kosong, bukan lapang.
- **Jarak baris judul dirapatkan** (1,05 sampai 1,15) karena huruf besar
  dengan jarak baris normal terlihat mengambang.

## Bentuk

Radius bertingkat, bukan seragam. Semua seragam berarti radius jadi hiasan,
bukan alat hierarki.

```
--radius-sm   : 8px   (input, tombol kecil)
--radius-md   : 14px  (kartu, panel)
--radius-lg   : 22px  (modal, lembar besar)
--radius-pill : 999px (chip filter, badge, FAB)
```

## Elevasi

Bayangan hanya untuk menandai ketinggian, dan alasannya harus bisa ditulis.

- **Kartu saat diam: tanpa bayangan.** Cukup batas 1px. Katalog berisi banyak
  kartu; kalau semuanya melayang, tidak ada yang melayang.
- **Kartu saat hover: bayangan berlapis** (ambient + direct). Alasannya:
  memberi tahu kartu ini bisa ditekan.
- **FAB dan lapisan mengambang: bayangan lebih dalam.** Alasannya: mereka
  memang di atas halaman.
- **Lapisan gerhana tema: bayangan penuh.** Alasannya: menutup seluruh layar.

Aturan: maksimal satu lapisan kaca (`backdrop-filter`) per layar, dan hanya
untuk navbar.

## Identitas

Satu motif yang diulang: **garis label kecil huruf kapital dengan tracking
lebar**, dipakai sebagai penanda bagian di seluruh situs. Ini bahasa visual
katalog cetak, dan itu yang membuat halaman-halamannya terasa satu keluarga.

Satu detail tanda tangan: **kartu barang memakai rasio foto 4:3 dengan sudut
foto yang mengikuti radius kartu**, dan harga diletakkan sebagai elemen paling
besar di kartu. Di marketplace, harga adalah informasi pertama yang dicari
mata, jadi harga yang harus paling menonjol, bukan judulnya.

## Yang tidak boleh diubah

Ini sudah teruji dan berfungsi. Redesain tidak boleh menyentuhnya, kecuali
untuk menyesuaikan warna lewat token.

- Loader `apple-breathe` (`components/shared/apple-breathe.tsx`)
- Tombol salin (`components/shared/tombol-salin.tsx`)
- Dropdown Radix (`components/shared/select.tsx`)
- Pengalih tema eclipse (`components/shared/tombol-tema.tsx`)
- Pengunggah foto (`components/form/photo-uploader.tsx`)
- Panel lapak (`components/form/panel-lapak.tsx`) dan seluruh logika lapak
- Struktur rute dan URL
- Semua teks yang sudah ada (boleh ditata ulang, tidak boleh diubah maknanya)
