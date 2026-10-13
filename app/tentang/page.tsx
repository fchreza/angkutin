import Link from "next/link";
import { Button } from "@/components/shared/button";
import {
  IconPlus,
  IconArrowRight,
  IconCheck,
  IconX,
} from "@/components/shared/icons";

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

/**
 * Isi bagian keamanan, dipisah menurut APA YANG HARUS DILAKUKAN.
 *
 * KENAPA dipisah dari kalimatnya: daftar "lakukan" dan "hindari" hanya
 * berguna kalau bisa dipindai. Kalau isinya dicampur dalam paragraf, pembaca
 * harus membaca semuanya untuk menemukan satu hal yang dia cari, dan pada
 * topik uang serta keselamatan itu terlalu mahal.
 */
const LAKUKAN = [
  "Periksa barangnya langsung sebelum membayar.",
  "Pastikan kondisinya sesuai yang dijanjikan penjual.",
  "Ajak teman kalau barangnya bernilai besar.",
  "Pilih tempat pertemuan yang terang dan ramai.",
];

const HINDARI = [
  "Jangan kirim uang muka sebelum barangnya kamu lihat.",
  "Jangan transfer ke rekening yang tidak bisa kamu pastikan.",
  "Jangan lanjutkan kalau penjual menolak ditemui.",
  "Jangan tergiur harga yang terlalu bagus untuk jadi benar.",
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
        {/*
          Memakai token judul-hero supaya ukurannya sejalan dengan halaman lain.
          Sebelumnya 34/42/50px, satu-satunya h1 yang melewati rentang skala
          (maksimum 40px) sehingga hierarkinya berbeda tanpa alasan.

          `font-normal` DIPERTAHANKAN. Bobot ringan pada judul besar adalah
          ciri editorial halaman ini, dan yang membuatnya terasa berbeda dari
          judul tebal di halaman lain. Yang disamakan ukurannya, bukan
          karakternya.
        */}
        <h1 className="mt-4 font-display text-judul-hero font-normal text-ink">
          Barang yang masih layak tidak perlu berakhir jadi sampah.
        </h1>

        <p className="mt-6 text-[17px] leading-[1.65] text-ink-secondary md:text-[18px]">
          {/*
            ANGKA SENGAJA TIDAK DISEBUT.
            Sebelumnya tertulis "ribuan barang", dan itu klaim tanpa sumber:
            kami tidak punya data jumlah barang yang dibuang, dan mengarang
            angka merusak kepercayaan begitu ada yang memeriksanya. Kalimat
            tanpa angka tetap menyampaikan hal yang sama dan tidak bisa salah.
          */}
          Barang yang masih bagus sering dibuang begitu saja saat penghuni kos
          pindahan. Angkutin mempertemukan barang itu dengan orang yang
          membutuhkannya, tanpa daftar akun dan tanpa biaya.
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
          <p className="mt-3 text-[15px] leading-[1.7] text-accent-text">
            Karena Angkutin tidak terlibat dalam transaksi, kamu perlu berhati-hati
            dan teliti. Periksa barangnya langsung sebelum membayar, dan pastikan
            kondisinya sesuai yang dijanjikan.
          </p>

          {/*
            DIPECAH JADI DUA KELOMPOK: yang perlu dilakukan, dan yang perlu
            dihindari.

            KENAPA: sebelumnya ini tiga paragraf mengalir yang isinya bercampur,
            anjuran dan larangan bergantian di dalam paragraf yang sama. Untuk
            isi yang menyangkut uang dan keselamatan, pembaca tidak sedang
            membaca santai, dia sedang mencari "apa yang harus saya lakukan"
            dan "apa yang tidak boleh saya lakukan". Dua daftar terpisah bisa
            dipindai dalam satu pandangan mata, paragraf mengalir tidak.

            KENAPA dua kolom, bukan dua daftar bertumpuk: ini tetap satu topik
            yang sama, dan dua kolom menjaga jarak pandang tetap satu layar
            di desktop, serta tidak menambah tinggi halaman di ponsel karena
            otomatis menumpuk.
          */}
          <div className="mt-5 grid gap-5 border-t border-accent-bright/25 pt-5 sm:grid-cols-2 md:gap-8">
            <div>
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-text">
                <IconCheck size={14} />
                Lakukan
              </h3>
              <ul className="mt-3 space-y-2.5 text-[14.5px] leading-[1.6] text-accent-text">
                {LAKUKAN.map((l) => (
                  <li key={l} className="flex gap-2.5">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-text">
                <IconX size={14} />
                Hindari
              </h3>
              <ul className="mt-3 space-y-2.5 text-[14.5px] leading-[1.6] text-accent-text">
                {HINDARI.map((l) => (
                  <li key={l} className="flex gap-2.5">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-5 text-[14px] leading-[1.6] text-accent-text">
            Kalau ada yang terasa mencurigakan, tinggalkan saja. Keamananmu
            lebih penting daripada barang murah.
          </p>
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
          {/*
            Ikon di sini adalah PLUS, bukan WhatsApp.
            KENAPA: ikon WhatsApp punya satu makna yang tegas, yaitu "aksi ini
            membuka WhatsApp". Tombol ini menuju formulir pasang barang, jadi
            memakai ikon WhatsApp membuat ikonnya berbohong tentang apa yang
            akan terjadi. Ikon sekarang menandai jenis aksinya (menambah),
            dan ikon WhatsApp tetap hanya muncul di tempat yang benar-benar
            membuka WhatsApp, yaitu tombol hubungi penjual.
          */}
          <Link href="/pasang" className="flex-1">
            <Button penuh ukuran="lg">
              <IconPlus size={17} />
              Pasang Barang
            </Button>
          </Link>
        </div>
      </article>
    </main>
  );
}
