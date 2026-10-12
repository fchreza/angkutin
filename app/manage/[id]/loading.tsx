import { MuatHalaman } from "@/components/shared/apple-breathe";

/**
 * Indikator saat halaman kelola listing sedang dimuat.
 *
 * Halaman ini dinamis dan memverifikasi token di server, jadi ada jeda antara
 * menekan tautan dan halaman siap. Sebelumnya jeda itu tanpa penanda.
 *
 * Memakai loader, bukan skeleton: halaman ini bisa berakhir di tiga bentuk
 * berbeda (tautan tidak valid, form kelola, atau galat) sehingga skeleton
 * bentuk apa pun berisiko melompat ke tata letak yang tidak sesuai.
 */
export default function Loading() {
  return (
    <main className="shell w-full">
      <MuatHalaman teks="Membuka halaman kelola…" />
    </main>
  );
}
