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
        // Instrument Sans untuk judul: lebih netral dan modern daripada
        // Plus Jakarta Sans, dan sejalan dengan referensi desain.
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-instrument)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        // Radius lebih rapat daripada sebelumnya (8/12/16) supaya terlihat
        // lebih tegas dan profesional, bukan seperti kartu mainan.
        sm: "6px",
        md: "10px",
        lg: "14px",
        pill: "999px",
      },
      boxShadow: {
        fab: "0 8px 22px rgb(var(--w-primary) / 0.35)",
        modal: "0 20px 48px rgb(var(--w-ink) / 0.18)",
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
