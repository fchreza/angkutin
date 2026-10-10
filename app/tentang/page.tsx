import Link from "next/link";
import { TopNav, MobileAppBar, MobileTabBar } from "@/components/layout/nav";
import { Button } from "@/components/shared/button";
import { IconWhatsApp, IconCheck } from "@/components/shared/icons";

export const metadata = {
  title: "Tentang — Angkutin",
  description:
    "Angkutin menghubungkan mahasiswa yang pindahan dengan orang yang butuh barangnya. Tanpa akun, tanpa biaya.",
};

const CARA = [
  {
    judul: "Untuk yang pindahan",
    langkah: [
      "Isi formulir singkat dan unggah foto barang.",
      "Tentukan batas pengambilan (maks 14 hari).",
      "Simpan tautan rahasia untuk menandai barang sudah diambil.",
    ],
  },
  {
    judul: "Untuk yang mencari barang",
    langkah: [
      "Pilih kluster kampusmu, telusuri katalog.",
      "Tekan tombol WhatsApp untuk menghubungi pemilik.",
      "Jemput sendiri barangnya sesuai patokan lokasi.",
    ],
  },
];

export default function TentangPage() {
  return (
    <>
      <TopNav />
      <MobileAppBar />

      <main className="mx-auto w-full max-w-[820px] px-4 pb-[110px] pt-4 md:px-6 md:pb-24 md:pt-8">
        <h1 className="font-display text-[24px] font-bold tracking-tight text-ink md:text-[30px]">
          Tentang Angkutin
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-secondary">
          Setiap tahun ribuan barang masih layak pakai dibuang begitu saja saat
          mahasiswa pindahan. Angkutin membuat barang-barang itu berpindah
          tangan dengan cepat — gratis, tanpa daftar akun.
        </p>

        <div className="mt-7 space-y-4">
          {CARA.map((blok) => (
            <section
              key={blok.judul}
              className="rounded-md border border-line bg-surface p-4"
            >
              <h2 className="font-display text-[16px] font-bold text-ink">
                {blok.judul}
              </h2>
              <ul className="mt-3 space-y-2.5">
                {blok.langkah.map((l) => (
                  <li key={l} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink">
                    <IconCheck size={15} className="mt-[3px] shrink-0 text-primary" />
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="mt-4 rounded-md border border-primary/25 bg-primary-soft p-4">
          <h2 className="font-display text-[15px] font-bold text-primary-dark">
            Soal privasi
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
            Alamat kamar tidak pernah ditampilkan di halaman publik. Yang tampil
            hanya patokan lokasi umum. Nomor WhatsApp pemilik baru dikirim saat
            pembeli menekan tombol WhatsApp.
          </p>
        </section>

        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
          <Link href="/" className="flex-1">
            <Button varian="outline" penuh ukuran="lg">
              Telusuri Katalog
            </Button>
          </Link>
          <Link href="/pasang" className="flex-1">
            <Button penuh ukuran="lg">
              <IconWhatsApp size={18} />
              Pasang Barang
            </Button>
          </Link>
        </div>
      </main>

      <MobileTabBar />
    </>
  );
}
