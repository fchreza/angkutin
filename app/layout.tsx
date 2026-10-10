import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/shared/sw-register";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Angkutin — Barang pindahan, diambil sendiri",
  description:
    "Marketplace barang bekas hyper-local untuk yang sedang pindahan. Tanpa daftar akun, diambil sendiri, bisa gratis.",
  applicationName: "Angkutin",
  formatDetection: { telephone: false },
  // manifest inilah yang memunculkan tawaran "pasang ke layar utama".
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
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
  // Nilai ini HARUS sama dengan theme_color di manifest.json, kalau tidak
  // warna akan berkedip saat aplikasi diluncurkan dari layar utama.
  themeColor: "#059669",
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="font-sans">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
