import { MuatHalaman } from "@/components/shared/apple-breathe";

/**
 * Indikator saat halaman detail barang sedang dimuat.
 *
 * KENAPA INI ADA:
 * Halaman detail adalah rute dinamis (force-dynamic) yang membaca database,
 * jadi ada jeda antara menekan kartu di katalog dan halaman siap. Sebelumnya
 * jeda itu tidak punya penanda apa pun — kartu ditekan, layar diam sejenak,
 * lalu halaman muncul. Terasa seperti tidak ada reaksi.
 *
 * Bentuknya loader "napas", bukan skeleton, karena tata letak halaman detail
 * (foto besar + kolom info) sangat berbeda dari kartu katalog — skeleton yang
 * salah bentuk justru membuat peralihan terasa melompat. Loader kecil di
 * tengah tidak menjanjikan tata letak apa pun, jadi tidak ada lompatan.
 */
export default function Loading() {
  return (
    <main className="shell w-full">
      <MuatHalaman teks="Memuat barang…" />
    </main>
  );
}
