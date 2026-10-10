import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
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
  openGraph: {
    title: "Angkutin",
    description:
      "Barang pindahan di sekitarmu. Tanpa daftar akun — ambil sendiri, bisa gratis.",
    type: "website",
    locale: "id_ID",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#059669",
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
