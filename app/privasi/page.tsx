export const metadata = {
  title: "Kebijakan Privasi, Angkutin",
  description:
    "Kebijakan privasi Angkutin: data apa yang kami simpan, kenapa, dan berapa lama.",
};

/**
 * Halaman Kebijakan Privasi — gaya editorial mengikuti /tentang.
 *
 * Ditulis sejujur mungkin dan sesingkat mungkin: pengguna tidak membaca
 * dokumen hukum, jadi setiap kalimat di sini harus menjawab pertanyaan nyata
 * ("nomor WA saya ke mana?") bukan menumpuk istilah.
 */
export default function PrivasiPage() {
  return (
    <main className="shell w-full pb-24 pt-10 md:pt-16">
      <article className="mx-auto max-w-[62ch]">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-mono">
          Kebijakan privasi
        </p>

        <h1 className="mt-4 font-display text-judul-hero font-normal text-ink">
          Data yang kami simpan, dan kenapa.
        </h1>

        <p className="mt-6 text-[17px] leading-[1.65] text-ink-secondary md:text-[18px]">
          Angkutin tidak meminta kamu membuat akun. Data yang kami simpan
          adalah data yang memang dibutuhkan supaya barangmu bisa dipasang dan
          ditemukan orang — tidak lebih.
        </p>

        <hr className="my-10 border-0 border-t border-line md:my-14" />

        <section>
          <h2 className="font-display text-[20px] font-medium tracking-[-0.01em] text-ink md:text-[22px]">
            Yang kami simpan
          </h2>
          <div className="mt-4 space-y-4 text-[15.5px] leading-[1.75] text-ink">
            <p>
              <strong className="font-semibold">Data listing:</strong> judul,
              deskripsi, foto, harga, kondisi, lokasi (patokan umum, bukan
              alamat kamar), batas pengambilan, dan nama panggilan penjual.
              Semua ini tampil publik karena memang itulah isi iklanmu.
            </p>
            <p>
              <strong className="font-semibold">Nomor WhatsApp:</strong>{" "}
              disimpan supaya pembeli bisa menghubungimu, tetapi tidak pernah
              ditampilkan di halaman publik. Nomor baru dipakai saat pembeli
              menekan tombol WhatsApp, dan itupun lewat tautan yang dibuat di
              server — bukan ditempel di halaman.
            </p>
            <p>
              <strong className="font-semibold">Tautan rahasia:</strong> token
              acak untuk mengelola listingmu. Simpan baik-baik; siapa pun yang
              punya tautan ini bisa mengubah atau menghapus barangmu.
            </p>
          </div>
        </section>

        <section className="mt-10 md:mt-14">
          <h2 className="font-display text-[20px] font-medium tracking-[-0.01em] text-ink md:text-[22px]">
            Yang TIDAK kami simpan
          </h2>
          <div className="mt-4 space-y-4 text-[15.5px] leading-[1.75] text-ink">
            <p>
              Kami tidak menyimpan alamat email, kata sandi, atau identitas apa
              pun — karena memang tidak ada pendaftaran. Kami juga tidak
              memakai pelacak pihak ketiga: statistik kunjungan kami catat
              sendiri, tanpa cookie, dan tanpa menyimpan alamat IP dalam bentuk
              apa pun di tabel itu.
            </p>
            <p>
              Alamat IP hanya dipakai sesaat untuk rate limiting (mencegah
              spam), disimpan sebagai hash, dan dibuang setelah 24 jam.
            </p>
          </div>
        </section>

        <section className="mt-10 md:mt-14">
          <h2 className="font-display text-[20px] font-medium tracking-[-0.01em] text-ink md:text-[22px]">
            Foto dan metadata
          </h2>
          <div className="mt-4 space-y-4 text-[15.5px] leading-[1.75] text-ink">
            <p>
              Foto yang kamu unggah dikompresi ulang di server sebelum
              disimpan. Dalam proses itu metadata foto — termasuk koordinat
              GPS yang kadang menempel di foto HP — dibuang. Yang tersimpan
              hanyalah gambarnya.
            </p>
          </div>
        </section>

        <section className="mt-10 md:mt-14">
          <h2 className="font-display text-[20px] font-medium tracking-[-0.01em] text-ink md:text-[22px]">
            Berapa lama data disimpan
          </h2>
          <div className="mt-4 space-y-4 text-[15.5px] leading-[1.75] text-ink">
            <p>
              Listing yang melewati batas pengambilan otomatis tidak tayang
              lagi. Kalau kamu menghapus barang lewat tautan kelolamu, datanya
              (termasuk foto) dihapus dari sistem kami.
            </p>
          </div>
        </section>

        <section className="mt-10 border-t border-line pt-8 md:mt-14">
          <h2 className="font-display text-[20px] font-medium tracking-[-0.01em] text-ink md:text-[22px]">
            Pertanyaan
          </h2>
          <p className="mt-4 text-[15.5px] leading-[1.75] text-ink">
            Kalau ada yang ingin ditanyakan soal datamu, hubungi kami lewat
            halaman kontak.
          </p>
        </section>
      </article>
    </main>
  );
}
