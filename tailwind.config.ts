import type { Config } from "tailwindcss";

/**
 * Design token Angkutin.
 *
 * PENTING — KENAPA NILAINYA `rgb(var(--w-xxx) / <alpha-value>)`:
 * Semua warna di sini menunjuk ke CSS variable, bukan nilai tetap. Dengan
 * begitu, mengganti mode terang/gelap cukup mengubah nilai variable di
 * globals.css, dan SELURUH komponen ikut berubah tanpa satu pun berkas .tsx
 * disentuh.
 *
 * Bentuk `rgb(var(--x) / <alpha-value>)` dipakai (bukan `var(--x)` langsung)
 * supaya pemakaian opacity seperti `bg-surface/95` tetap bekerja. Variable-nya
 * menyimpan kanal RGB terpisah spasi, mis. `--w-surface: 255 255 255`.
 *
 * Menulis `var(--x)` langsung akan MEMATIKAN semua opacity modifier secara
 * diam-diam — warnanya tetap benar, tapi `bg-ink/70` jadi tidak transparan.
 *
 * Nilai warna sesungguhnya ada di app/globals.css (blok :root dan .dark).
 */
const warna = (nama: string) => `rgb(var(--w-${nama}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Primary — emerald (aksi utama, gratis, WhatsApp)
        primary: {
          DEFAULT: warna("primary"),
          hover: warna("primary-hover"),
          dark: warna("primary-text"),
          soft: warna("primary-soft"),
          500: warna("primary"),
          /**
           * Teks di ATAS tombol primary.
           *
           * Kenapa bukan `text-white`: di mode gelap emerald dibuat lebih
           * terang supaya menonjol, dan teks putih di atasnya hanya 2,5:1
           * (gagal WCAG). Token ini berisi putih di mode terang dan hijau
           * sangat gelap di mode gelap, sehingga selalu >= 4,5:1.
           */
          teks: warna("on-primary"),
        },
        /**
         * Scrim — lapisan gelap-tetap untuk elemen yang menumpuk di ATAS FOTO
         * (badge jumlah foto, tombol hapus pada foto, overlay "sudah diambil").
         *
         * Tidak boleh memakai `ink`: ink adalah warna TEKS yang membalik jadi
         * terang di mode gelap, sehingga badge di atas foto berubah menjadi
         * kotak putih dengan teks putih — tidak terbaca sama sekali.
         * Scrim sengaja tidak ikut berubah karena di bawahnya selalu foto,
         * bukan permukaan tema.
         */
        scrim: warna("scrim"),
        "scrim-kuat": warna("scrim-kuat"),
        // Accent — amber (urgensi tenggat <= 2 hari)
        accent: {
          DEFAULT: warna("accent"),
          bright: warna("accent-bright"),
          soft: warna("accent-soft"),
          text: warna("accent-text"),
        },
        surface: warna("surface"),
        appbg: warna("bg"),
        surface2: warna("surface2"),
        ink: {
          DEFAULT: warna("ink"),
          secondary: warna("ink2"),
          mono: warna("ink3"),
        },
        line: warna("line"),
        "line-kuat": warna("line-kuat"),
        danger: {
          DEFAULT: warna("danger"),
          soft: warna("danger-soft"),
        },
      },
      fontFamily: {
        /**
         * Plus Jakarta Sans untuk SELURUH teks: badan, judul, tombol, label.
         *
         * KENAPA SERIF DILEPAS:
         * Sebelumnya judul memakai Fraunces (serif) sebagai penanda editorial.
         * Pemilik produk memutuskan pindah ke satu geometric sans untuk
         * semuanya. Jakarta dipilih, bukan Inter, karena Inter adalah pilihan
         * netral tanpa karakter — Jakarta membawa karakter "Indonesia, urban,
         * muda" yang sesuai produknya.
         *
         * KENAPA `display` TETAP ADA meski isinya sama:
         * Ada 45 tempat di kode yang memakai `font-display` untuk judul.
         * Menghapus alias ini berarti menyunting 45 berkas hanya untuk
         * mengubah satu keputusan desain, dan setiap berkas itu jadi berisiko
         * salah sunting. Dengan alias tetap ada, judul tetap punya NAMA
         * perannya sendiri di kode, jadi kalau nanti mau dipisah lagi
         * (misalnya ditambah font judul baru), cukup ubah satu baris ini.
         */
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        display: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      /**
       * Skala judul dengan TRACKING PER-UKURAN.
       *
       * KENAPA per-ukuran, bukan satu nilai: huruf besar butuh tracking rapat
       * karena jarak antarhurufnya sudah terlihat melebar saat diperbesar,
       * sementara huruf kecil butuh sedikit longgar supaya tidak menempel.
       * Satu nilai untuk semua ukuran adalah tanda tipografi yang belum
       * dipikirkan.
       *
       * `lineHeight` dirapatkan di ukuran besar: huruf besar dengan jarak
       * baris normal terlihat mengambang, bukan lapang.
       */
      fontSize: {
        /**
         * Ukuran hero DIUKUR, bukan dikira-kira.
         *
         * Percobaan pertama memakai clamp(2.1rem, 5vw, 3.6rem) dan hasilnya
         * 57,6px di layar 1280px. Terlalu besar untuk halaman katalog: judulnya
         * memakan seperlima tinggi layar dan mendorong barang pertama ke bawah
         * lipatan. Di halaman katalog, yang harus terlihat lebih dulu adalah
         * BARANGNYA, bukan judulnya.
         *
         * Sekarang maksimum 2,5rem (40px): tetap jadi titik fokus, tapi tidak
         * lagi mengalahkan isi halaman.
         */
        /**
         * Batas BAWAH clamp dinaikkan ke 1.875rem (30px) dan batas atas 2.5rem
         * (40px). KENAPA batas bawahnya dinaikkan: dengan 1.7rem, di layar
         * 360px judulnya jadi 27,2px, di bawah rentang yang nyaman untuk
         * judul halaman. Batas bawah 30px menjaga judul tetap terbaca sebagai
         * judul di ponsel kecil tanpa membuatnya memenuhi layar (terukur 7%
         * tinggi layar).
         */
        "judul-hero": ["clamp(1.875rem, 3.2vw, 2.5rem)", { lineHeight: "1.1", letterSpacing: "-0.03em" }],
        "judul-besar": ["clamp(1.5rem, 2.4vw, 1.85rem)", { lineHeight: "1.14", letterSpacing: "-0.025em" }],
        "judul-sedang": ["clamp(1.25rem, 1.8vw, 1.4rem)", { lineHeight: "1.22", letterSpacing: "-0.02em" }],
        "judul-kecil": ["1.125rem", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
      },
      borderRadius: {
        /**
         * Radius BERTINGKAT, bukan seragam.
         *
         * KENAPA: kalau semua elemen memakai radius yang sama, radius berhenti
         * jadi alat hierarki dan berubah jadi hiasan. Dengan tiga tingkat,
         * ukuran sudut ikut memberi tahu "ini input", "ini kartu", "ini modal".
         */
        sm: "8px", // input, tombol kecil
        md: "14px", // kartu, panel
        lg: "22px", // modal, lembar besar
        pill: "999px", // chip filter, badge, FAB
      },
      /**
       * Bayangan hanya untuk menandai KETINGGIAN, dan alasannya harus bisa
       * ditulis satu baris.
       *
       * KENAPA kartu saat diam tidak punya bayangan: katalog berisi banyak
       * kartu. Kalau semuanya melayang, tidak ada yang benar-benar melayang,
       * dan halaman kehilangan bidang dasarnya. Kartu diam cukup dibatasi
       * garis 1px; bayangan baru muncul saat kursor mendekat, sebagai tanda
       * "ini bisa ditekan".
       *
       * Setiap bayangan berlapis dua: satu lembut dan lebar (ambient) untuk
       * ketinggian, satu rapat dan gelap (direct) untuk ketajaman. Satu
       * bayangan saja selalu terlihat seperti tempelan.
       */
      boxShadow: {
        hover: "0 2px 4px rgb(var(--w-ink) / 0.04), 0 8px 20px rgb(var(--w-ink) / 0.07)",
        fab: "0 2px 6px rgb(var(--w-ink) / 0.10), 0 10px 26px rgb(var(--w-primary) / 0.30)",
        modal: "0 4px 12px rgb(var(--w-ink) / 0.08), 0 24px 56px rgb(var(--w-ink) / 0.20)",
        card: "0 1px 2px rgb(var(--w-ink) / 0.04), 0 1px 4px rgb(var(--w-ink) / 0.04)",
      },
      maxWidth: {
        // Lebar konten. Dipakai lewat kelas .shell, bukan ditempel manual,
        // supaya tidak ada lagi 1200px kaku di banyak berkas.
        shell: "1600px",
        baca: "68ch",
      },
      spacing: {
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        6: "24px",
        8: "32px",
      },
    },
  },
  plugins: [],
};

export default config;
