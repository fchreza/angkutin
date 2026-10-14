# angkutin — Arah Desain

Dokumen ini mencatat **UI yang benar-benar berjalan**; implementasi warna dan tipografi bersumber dari `app/globals.css`, `app/layout.tsx`, dan konfigurasi Tailwind. Jika UI berubah, perbarui dokumen ini bersamaan.

## Produk dan pengguna

Angkutin adalah marketplace barang pindahan mahasiswa di Indonesia. Penjual memasang barang tanpa akun, membagikan tautan publik, dan mengelolanya lewat tautan rahasia. Pembeli mengambil sendiri dan menghubungi penjual melalui WhatsApp; tidak ada checkout, kurir, atau pembayaran di aplikasi.

Pengguna utama adalah mahasiswa dan penghuni kos yang sering memakai ponsel, perlu bergerak cepat, dan mungkin memakai koneksi lambat. Karena itu, katalog harus mudah dipindai, gambar harus proporsional, dan tindakan utama harus jelas tanpa menambah langkah yang tidak perlu.

## Karakter visual

**Ringkas, ramah, dan terang.** Kanvas alabaster netral, kartu putih, tinta biru-arang, dan hijau emerald membentuk identitas yang bersih tanpa terasa korporat. Foto barang dan harga menjadi pusat perhatian; label kecil, ikon garis, serta ruang antarkelompok membantu pemindaian cepat.

Prinsip yang dipakai: **jelas, mudah dipindai, tepercaya**. Hindari dekorasi yang membuat kartu katalog padat atau mengalihkan perhatian dari barang dan tindakan.

## Warna

Nilai di bawah mengikuti custom properties `--w-*` pada `app/globals.css`. Gunakan token, bukan nilai warna baru yang dipilih secara terpisah.

### Mode terang

| Peran | Nilai | Pemakaian |
|---|---|---|
| Kanvas (`--w-bg`) | `#F8FAFC` | Latar halaman, alabaster sejuk. |
| Permukaan (`--w-surface`) | `#FFFFFF` | Kartu dan panel. |
| Permukaan kedua (`--w-surface2`) | `#F1F5F9` | Bidang sekunder dan skeleton. |
| Tinta utama (`--w-ink`) | `#0F172A` | Judul dan teks utama. |
| Tinta sekunder (`--w-ink2`) | `#475569` | Keterangan dan teks pendukung. |
| Tinta lembut (`--w-ink3`) | `#55637A` | Metadata berukuran kecil. |
| Garis (`--w-line`) | `#E2E8F0` | Batas kartu dan panel. |
| Garis kuat (`--w-line-kuat`) | `#75879E` | Batas kontrol input. |
| Primary (`--w-primary`) | `#047857` | Tombol utama dan identitas emerald. |
| Primary hover | `#065F46` | Hover/fokus tombol utama. |
| Primary soft | `#ECFDF5` | Latar aksen hijau yang lembut. |
| Aksen tenggat (`--w-accent`) | `#B45309` | Peringatan urgensi; bukan aksen dekoratif umum. |
| Bahaya (`--w-danger`) | `#DC2626` | Error dan tindakan berisiko. |

### Mode gelap

Mode gelap memakai kanvas `#121212`, permukaan `#1A1A1A` dan `#222222`, tinta `#E0E0E0`/`#B0B0B0`, garis `#444444`/`#6E6E6E`, primary `#10B981`, serta aksen `#FB923C`. Nilai lengkap ada di blok `.dark` pada `app/globals.css`; jangan mengasumsikan warna terang hanya dibalik secara otomatis.

Kontras teks, kontrol, dan state interaktif harus tetap mengikuti nilai terukur yang didokumentasikan dekat token CSS. Perubahan warna perlu diperiksa pada kedua tema.

## Tipografi

**Plus Jakarta Sans** adalah satu-satunya keluarga font UI, dimuat lewat `next/font/google` di `app/layout.tsx` dan dipakai sebagai `font-sans`. Berat yang tersedia 400, 500, 600, 700, dan 800. Fraunces tidak lagi dimuat; jangan menambahkan font kedua tanpa kebutuhan dan evaluasi performa yang jelas.

- Harga pada kartu dibuat besar dan tegas agar cepat ditemukan.
- Judul dan label memakai hierarki ukuran/berat, bukan keluarga font berbeda.
- Label bagian kecil boleh memakai kapital dan tracking lebar; teks bantuan tetap mudah dibaca pada layar ponsel.

## Bentuk dan tata letak

Gunakan skala radius dari konfigurasi Tailwind aktif: radius kecil untuk kontrol, `rounded-md` untuk kartu/panel, `rounded-lg` untuk permukaan lebih besar, dan pill hanya untuk badge/chip. Pastikan radius kartu dan foto terasa menyatu melalui `overflow-hidden`.

Katalog memakai grid responsif dua kolom pada ponsel dan menambah kolom seiring lebar layar. Kartu memakai bingkai foto tetap rasio **4:3**; seluruh foto ditampilkan utuh di dalam bingkai (`object-fit: contain`) dengan latar netral, bukan dipotong mengikuti rasio bingkai. Kondisi tampil sebagai label ringkas pada foto, lalu judul, harga menonjol, lokasi, dan tenggat. Hindari memperbesar satu kartu hingga memecah ritme grid.

### Halaman detail barang

Detail memakai bingkai galeri foto tetap 4:3 dengan thumbnail yang dapat dipilih; foto utuh dipaskan ke dalam bingkai agar tidak terpotong. Informasi inti berada dalam kolom terpisah pada desktop dan urutan vertikal yang jelas pada ponsel. Harga dan tindakan menghubungi penjual tetap mudah ditemukan; deskripsi dan lokasi penjemputan dipisah menjadi panel ringkas. Rekomendasi menampilkan barang lain dari lapak yang sama, atau barang serupa di kategori/wilayah yang sama jika lapak belum memiliki barang lain.

## Elevasi dan interaksi

Kartu diam memakai border halus dan bayangan sangat ringan untuk memisahkan permukaan putih dari kanvas; hover/fokus mempertegas batas/bayangan. Elemen mengambang seperti dialog dapat memakai elevasi lebih tinggi. Batasi blur/backdrop dan animasi agar tidak mengganggu konten atau perangkat lambat.

Interaksi harus memiliki state hover, focus-visible, disabled, loading, dan error yang dapat dikenali. Animasi bersifat singkat dan membantu memberi umpan balik; hormati preferensi pengurangan gerak. Validasi menautkan pesan ke kontrol, mengumumkan error, dan memfokuskan field pertama yang perlu diperbaiki.

## Aksesibilitas dan PWA

- Gunakan label yang terhubung ke input, `aria-invalid`, dan `aria-describedby` untuk error.
- Semua tindakan dapat dijangkau dengan keyboard serta memiliki focus-visible yang jelas.
- Status tidak disampaikan hanya dengan warna.
- `public/manifest.json` dan `viewport.themeColor` di `app/layout.tsx` harus cocok dengan token kanvas mode terang `#F8FAFC`; warna identitas tombol tetap `#047857`.
- Pertahankan ukuran tap yang nyaman di ponsel dan teks yang terbaca tanpa zoom.

## Area yang memerlukan kehati-hatian

Loader `apple-breathe`, tombol salin, dropdown Radix, pengalih tema, pengunggah foto, panel lapak, struktur URL, dan makna teks produk telah memiliki perilaku khusus. Perubahan pada area tersebut harus mempertahankan fungsinya, aksesibilitas, dan kontrak yang digunakan halaman lain.
