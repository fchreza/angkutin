import Link from "next/link";
import { Button } from "@/components/shared/button";
import { IconWhatsApp, IconArrowRight } from "@/components/shared/icons";

export const metadata = {
  title: "Tentang, Angkutin",
  description:
    "Angkutin membantu memasarkan barang yang ingin cepat dilepas karena pindahan kos. Kami hanya perantara. Transaksi tetap antara penjual dan pembeli.",
};

/**
 * Halaman Tentang — gaya EDITORIAL.
 *
 * KENAPA DITULIS ULANG TOTAL:
 * Versi sebelumnya menumpuk kartu berbingkai, badge, dan ikon centang di
 * dalam kotak. Pola itu (border + latar + sudut membulat untuk setiap blok)
 * adalah ciri khas keluaran generator UI, dan justru yang membuat halaman
 * terasa jadul. Struktur dibangun dari kotak, bukan dari tulisan.
 *
 * Pendekatan baru mengikuti bahasa desain editorial: hierarki dibangun dari
 * UKURAN dan JARAK huruf saja.
 *   - Judul besar tapi BERAT RINGAN (400, bukan 700) — inilah penanda utama
 *     tampilan editorial modern; judul tebal besar justru terasa kuno.
 *   - Kolom teks sempit supaya mata tidak menyapu terlalu jauh.
 *   - Tanpa kartu, tanpa bingkai, tanpa badge. Pemisah antar bagian memakai
 *     satu garis rambut tipis.
 *   - Ruang kosong yang lega sebagai pemisah, bukan garis.
 *
 * Dua hal yang WAJIB ada di halaman ini (permintaan pemilik produk):
 *   1. Penegasan bahwa Angkutin HANYA perantara pemasaran.
 *   2. Imbauan berhati-hati dan teliti saat bertransaksi.
 * Keduanya diletakkan sebagai bagian tersendiri supaya tidak terlewat
 * pembaca, dan yang kedua diberi penekanan visual karena menyangkut
 * keamanan pengguna.
 */

const LANGKAH_JUAL = [
  "Isi formulir singkat dan unggah foto barang.",
  "Tentukan batas pengambilan, maksimal 14 hari.",
  "Simpan tautan rahasia untuk menandai barang sudah diambil.",
];

const LANGKAH_CARI = [
  "Pilih kabupaten/kota, lalu telusuri katalognya.",
  "Tekan tombol WhatsApp untuk menghubungi pemilik.",
  "Jemput sendiri barangnya sesuai patokan lokasi.",
];

export default function TentangPage() {
  return (
    <main className="shell w-full pb-24 pt-10 md:pt-16">
      {/* Kolom bacaan. 62ch adalah batas nyaman sebelum mata mulai kehilangan
          baris saat kembali ke kiri. */}
      <article className="mx-auto max-w-[62ch]">
        {/* Label kecil di atas judul — penanda bagian, bukan hiasan. */}
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-mono">
          Tentang
        </p>

        {/*
          Judul: besar tapi RINGAN. Ini yang membedakan editorial modern dari
          tampilan kuno — bukan ukurannya, melainkan beratnya.
        */}
        <h1 className="mt-4 font-display text-[34px] font-normal leading-[1.12] tracking-[-0.02em] text-ink sm:text-[42px] md:text-[50px]">
          Barang yang masih layak tidak perlu berakhir jadi sampah.
        </h1>

        <p className="mt-6 text-[17px] leading-[1.65] text-ink-secondary md:text-[18px]">
          Setiap tahun, ribuan barang masih bagus dibuang begitu saja saat
          penghuni kos pindahan. Angkutin mempertemukan barang itu dengan orang
          yang membutuhkannya, tanpa daftar akun dan tanpa biaya.
        </p>

        <hr className="my-10 border-0 border-t border-line md:my-14" />

        {/* ---------- Apa itu Angkutin ---------- */}
        <section>
          <h2 className="font-display text-[20px] font-medium tracking-[-0.01em] text-ink md:text-[22px]">
            Apa itu Angkutin
          </h2>
          <div className="mt-4 space-y-4 text-[15.5px] leading-[1.75] text-ink">
            <p>
              Angkutin adalah papan pengumuman terbuka untuk barang pindahan.
              Siapa pun bisa memasang barang yang ingin dilepas, dan siapa pun
              bisa melihat apa yang tersedia di sekitarnya.
            </p>
            <p>
              Barangnya diambil sendiri oleh yang menginginkan, jadi tidak ada
              biaya kirim dan tidak ada kurir. Barang bisa dijual dengan harga
              seadanya, atau diberikan gratis kalau memang sudah tidak sempat
              dijual.
            </p>
          </div>
        </section>

        {/* ---------- Penegasan peran: HANYA perantara ---------- */}
        <section className="mt-10 md:mt-14">
          <h2 className="font-display text-[20px] font-medium tracking-[-0.01em] text-ink md:text-[22px]">
            Angkutin hanya perantara
          </h2>
          <div className="mt-4 space-y-4 text-[15.5px] leading-[1.75] text-ink">
            <p>
              Angkutin <strong className="font-semibold">hanya membantu memasarkan</strong>{" "}
              barang yang ingin cepat dilepas karena pindahan kos dan keperluan
              sejenisnya. Kami bukan penjual, bukan pembeli, dan bukan pihak
              yang menguasai barangnya.
            </p>
            <p>
              Karena itu, seluruh proses transaksi terjadi langsung antara
              penjual dan pembeli, mulai dari tawar-menawar, pembayaran,
              sampai pengambilan barang. Angkutin tidak menerima uang, tidak
              menahan barang, dan tidak menjamin kualitas apa pun yang
              dipasang di sini.
            </p>
          </div>
        </section>

        {/* ---------- Imbauan keamanan ----------
            Diberi penekanan visual karena menyangkut keamanan pengguna.
            Tetap tanpa bingkai: latar lembut + sudut membulat, tanpa garis,
            supaya tidak kembali ke pola kartu. */}
        <section className="mt-10 rounded-lg bg-accent-soft px-5 py-5 md:mt-14 md:px-6 md:py-6">
          <h2 className="font-display text-[18px] font-medium tracking-[-0.01em] text-accent-text md:text-[20px]">
            Bertransaksi dengan hati-hati
          </h2>
          <div className="mt-3.5 space-y-3.5 text-[15px] leading-[1.7] text-accent-text">
            <p>
              Karena Angkutin tidak terlibat dalam transaksi, kamu perlu berhati-hati
              dan teliti. Periksa barangnya langsung sebelum membayar, dan
              pastikan kondisinya sesuai yang dijanjikan.
            </p>
            <p>
              Jangan pernah mengirim uang muka sebelum barang dilihat, apalagi
              ke rekening yang tidak bisa kamu pastikan. Untuk barang bernilai
              besar, ajak teman saat mengambil, dan lakukan pertemuan di tempat
              yang terang serta ramai.
            </p>
            <p>
              Kalau ada yang mencurigakan, misalnya harga terlalu bagus untuk benar,
              penjual menolak ditemui, atau meminta transfer lebih dulu,
              sebaiknya tinggalkan saja. Keamananmu lebih penting daripada
              barang murah.
            </p>
          </div>
        </section>

        {/* ---------- Cara kerjanya ----------
            Tanpa kartu. Nomor kecil + judul, dipisah garis rambut. */}
        <section className="mt-10 md:mt-14">
          <h2 className="font-display text-[20px] font-medium tracking-[-0.01em] text-ink md:text-[22px]">
            Cara kerjanya
          </h2>

          <div className="mt-6 space-y-8">
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-mono">
                Kalau mau melepas barang
              </p>
              <ol className="mt-3.5 space-y-3">
                {LANGKAH_JUAL.map((l, i) => (
                  <li key={l} className="flex gap-3.5 text-[15px] leading-[1.65] text-ink">
                    <span className="mt-[2px] w-4 shrink-0 text-[13px] font-semibold tabular-nums text-primary">
                      {i + 1}
                    </span>
                    <span>{l}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="border-t border-line pt-8">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-mono">
                Kalau mencari barang
              </p>
              <ol className="mt-3.5 space-y-3">
                {LANGKAH_CARI.map((l, i) => (
                  <li key={l} className="flex gap-3.5 text-[15px] leading-[1.65] text-ink">
                    <span className="mt-[2px] w-4 shrink-0 text-[13px] font-semibold tabular-nums text-primary">
                      {i + 1}
                    </span>
                    <span>{l}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ---------- Privasi ---------- */}
        <section className="mt-10 border-t border-line pt-8 md:mt-14">
          <h2 className="font-display text-[20px] font-medium tracking-[-0.01em] text-ink md:text-[22px]">
            Soal privasi
          </h2>
          <p className="mt-4 text-[15.5px] leading-[1.75] text-ink">
            Alamat kamar tidak pernah ditampilkan di halaman publik. Yang tampil
            hanya patokan lokasi umum. Nomor WhatsApp pemilik baru dikirim saat
            pembeli menekan tombol WhatsApp.
          </p>
        </section>

        {/* ---------- Tanda tangan ----------
            Penutup bergaya editorial: siapa yang bicara, bukan blok CTA. */}
        <div className="mt-12 border-t border-line pt-8 md:mt-16">
          <p className="text-[15px] leading-[1.7] text-ink-secondary">
            Terima kasih sudah memakai Angkutin. Semoga barangmu sampai ke
            orang yang memang membutuhkannya.
          </p>
          <p className="mt-5 font-display text-[15px] font-medium text-ink">
            Tim Angkutin
          </p>
        </div>

        {/* ---------- Aksi ---------- */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="flex-1">
            <Button varian="outline" penuh ukuran="lg">
              Telusuri Katalog
              <IconArrowRight size={16} />
            </Button>
          </Link>
          <Link href="/pasang" className="flex-1">
            <Button penuh ukuran="lg">
              <IconWhatsApp size={18} />
              Pasang Barang
            </Button>
          </Link>
        </div>
      </article>
    </main>
  );
}
