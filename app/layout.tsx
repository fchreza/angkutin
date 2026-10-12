import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Sans } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/shared/sw-register";
import { ToastProvider } from "@/components/shared/toast";
import { ThemeProvider, SKRIP_TEMA } from "@/components/shared/theme";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Instrument Sans untuk judul.
 *
 * Dipilih menggantikan Plus Jakarta Sans: bentuknya lebih netral dan rapat,
 * sehingga judul terasa tegas dan modern — sejalan dengan bahasa desain
 * referensi. Plus Jakarta Sans punya sudut membulat yang membuat tampilan
 * cenderung "ramah anak", yang tidak cocok untuk katalog barang.
 */
const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

/**
 * Alamat dasar situs untuk metadata.
 *
 * WAJIB ADA. Tanpa ini, Next mengubah URL og:image menjadi relatif, dan
 * crawler (WhatsApp, Facebook, X) TIDAK bisa mengambil gambar dari URL relatif
 * — akibatnya link yang dibagikan muncul tanpa gambar sama sekali.
 *
 * URUTAN PENTING: domain Vercel didahulukan, env eksplisit BELAKANGAN.
 * Alasannya: nilai NEXT_PUBLIC_SITE_URL di proyek ini berisi
 * "http://localhost:3000" (sisa dari pengembangan awal). Kalau env dipakai
 * lebih dulu, semua gambar kartu link di produksi akan menunjuk ke localhost
 * dan link WhatsApp tetap tampil tanpa gambar. Domain Vercel selalu benar
 * untuk deployment yang sedang berjalan.
 *
 * Kalau nanti ada domain sendiri (mis. angkutin.id), perbarui nilai env-nya
 * di Vercel ATAU ubah urutan ini supaya domain sendiri yang menang.
 */
const alamatSitus = (() => {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  const dariEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (dariEnv && !dariEnv.includes("localhost")) return dariEnv;

  return "http://localhost:3000";
})();

export const metadata: Metadata = {
  metadataBase: new URL(alamatSitus),
  title: "Angkutin — Barang pindahan, diambil sendiri",
  description:
    "Marketplace barang bekas hyper-local untuk yang sedang pindahan. Tanpa daftar akun, diambil sendiri, bisa gratis.",
  applicationName: "Angkutin",
  formatDetection: { telephone: false },
  // manifest inilah yang memunculkan tawaran "pasang ke layar utama".
  manifest: "/manifest.json",
  icons: {
    // .ico untuk browser lama dan tab; PNG untuk yang mendukung.
    // Urutan penting: .ico lebih dulu supaya tidak ditimpa.
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/favicon-48.png", type: "image/png", sizes: "48x48" },
    ],
    // iOS membaca apple-touch-icon, BUKAN ikon di manifest.
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Angkutin",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Angkutin",
    description:
      "Barang pindahan di sekitarmu. Tanpa daftar akun — ambil sendiri, bisa gratis.",
    type: "website",
    locale: "id_ID",
    images: [
      {
        url: "/brand/og.png",
        width: 1200,
        height: 630,
        alt: "angkutin — Lepas barang pindahan, ambil sendiri.",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Warna bar browser di Android/iOS. Dua nilai supaya bar ikut menyesuaikan
  // saat pengguna memakai mode gelap — kalau hanya satu, bar tetap terang di
  // mode gelap dan terlihat seperti sisa halaman yang belum dimuat.
  // Nilai terang HARUS sama dengan theme_color di manifest.json, kalau tidak
  // warna akan berkedip saat aplikasi diluncurkan dari layar utama.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F7F6" },
    { media: "(prefers-color-scheme: dark)", color: "#181817" },
  ],
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${inter.variable} ${instrument.variable}`}>
      <head>
        {/*
          Anti-kedip mode gelap.
          Skrip ini berjalan SINKRON saat HTML di-parse, sebelum halaman
          digambar. Tanpa ini, pengguna mode gelap melihat kilatan putih
          ~200ms di setiap pemuatan halaman.
          Lihat components/shared/theme.tsx untuk isi skripnya.
        */}
        <script dangerouslySetInnerHTML={{ __html: SKRIP_TEMA }} />
      </head>
      <body className="font-sans">
        {/* ThemeProvider di akar supaya tombol ganti tema bisa dipakai di
            mana saja (nav, footer, halaman). */}
        <ThemeProvider>
          {/* ToastProvider di akar supaya halaman mana pun bisa memunculkan
              notifikasi lewat useToast(). */}
          <ToastProvider>
            <AppShell>{children}</AppShell>
            <ServiceWorkerRegister />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
