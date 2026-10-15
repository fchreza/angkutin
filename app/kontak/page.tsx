export const metadata = {
  title: "Kontak, Angkutin",
  description:
    "Hubungi tim Angkutin: kehilangan tautan kelola, pertanyaan, atau laporkan listing mencurigakan.",
};

/**
 * Halaman Kontak — gaya editorial mengikuti /tentang.
 *
 * KENAPA TIDAK ADA FORMULIR KONTAK DI SINI: formulir kontak tanpa akun
 * menjadi saluran spam yang butuh moderasi sendiri. Untuk produk sekecil ini,
 * satu alamat email yang jelas + arahan kapan memakainya lebih jujur dan
 * lebih mudah dirawat.
 */
export default function KontakPage() {
  return (
    <main className="shell w-full pb-24 pt-10 md:pt-16">
      <article className="mx-auto max-w-[62ch]">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-mono">
          Kontak
        </p>

        <h1 className="mt-4 font-display text-judul-hero font-normal text-ink">
          Butuh bantuan? Ceritakan.
        </h1>

        <p className="mt-6 text-[17px] leading-[1.65] text-ink-secondary md:text-[18px]">
          Kehilangan tautan kelolamu, menemukan kejanggalan, atau sekadar ingin
          bertanya — kirim email ke{" "}
          <a
            href="mailto:halo@angkutin.id"
            className="font-medium text-primary-dark underline decoration-dotted underline-offset-4"
          >
            halo@angkutin.id
          </a>
          .
        </p>

        <hr className="my-10 border-0 border-t border-line md:my-14" />

        <section>
          <h2 className="font-display text-[20px] font-medium tracking-[-0.01em] text-ink md:text-[22px]">
            Sebelum menulis
          </h2>
          <div className="mt-4 space-y-4 text-[15.5px] leading-[1.75] text-ink">
            <p>
              <strong className="font-semibold">Kehilangan tautan kelola:</strong>{" "}
              sertakan judul barang, tanggal memasang, dan nomor WhatsApp yang
              dipakai (cukup 4 digit terakhir). Kami akan memverifikasi
              kepemilikanmu dulu sebelum membantu.
            </p>
            <p>
              <strong className="font-semibold">Pertanyaan umum:</strong> cara
              kerja, batas 14 hari, dan tips aman semuanya dijelaskan di
              halaman Tentang — cek dulu ke sana, biasanya jawabannya sudah
              ada.
            </p>
          </div>
        </section>

        <section id="laporkan" className="mt-10 scroll-mt-24 md:mt-14">
          <h2 className="font-display text-[20px] font-medium tracking-[-0.01em] text-ink md:text-[22px]">
            Laporkan listing mencurigakan
          </h2>
          <div className="mt-4 space-y-4 text-[15.5px] leading-[1.75] text-ink">
            <p>
              Cara tercepat: buka halaman barangnya, tekan{" "}
              <strong className="font-semibold">“Laporkan listing ini”</strong>{" "}
              di bawah tombol WhatsApp, pilih alasannya, dan kirim. Laporanmu
              anonim dan langsung masuk antrian tinjauan kami.
            </p>
            <p>
              Kalau tombolnya tidak bisa dipakai, kirim email dengan menyertakan
              tautan halaman barangnya dan alasanmu melapor.
            </p>
          </div>
        </section>
      </article>
    </main>
  );
}
