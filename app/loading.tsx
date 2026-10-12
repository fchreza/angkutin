import { MuatHalaman } from "@/components/shared/apple-breathe";

/**
 * Indikator saat katalog sedang dimuat.
 *
 * Katalog adalah rute force-dynamic yang membaca database, jadi berpindah
 * kembali ke sini dari halaman lain punya jeda. Sebelumnya jeda itu tanpa
 * penanda apa pun.
 *
 * Memakai loader, bukan skeleton grid: lebar kolom grid bergantung pada jumlah
 * kartu yang ditemukan, jadi skeleton dengan jumlah kotak yang salah justru
 * membuat tata letak melompat saat data asli tiba.
 */
export default function Loading() {
  return (
    <main className="shell w-full">
      <MuatHalaman teks="Memuat katalog…" />
    </main>
  );
}
