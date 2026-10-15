import Link from "next/link";

/**
 * Footer minimalis.
 *
 * Prinsipnya: satu baris tipis, tiga kelompok informasi (identitas, navigasi,
 * catatan kecil). Bukan footer berkolom 4-5 seperti situs perusahaan — produk
 * ini masih awal, dan footer gemuk justru terlihat berlebihan.
 *
 * Ditempatkan di layout akar supaya konsisten di semua halaman. Di mobile
 * diberi jarak bawah supaya tidak tertutup tab bar.
 */
export function Footer() {
  const tahun = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-line pb-[76px] md:pb-0">
      <div className="shell flex flex-col gap-5 py-8 sm:flex-row sm:items-center sm:justify-between">
        {/* Identitas */}
        <div className="flex items-center gap-2.5">
          <img src="/brand/mark.png" alt="" width={22} height={22} className="shrink-0" />
          {/*
            Nama brand memakai font-display. KENAPA: ini satu-satunya
            tempat nama merek muncul dalam ukuran kecil, dan serif di sini
            mengikat footer ke judul-judul halaman sehingga situsnya terbaca
            sebagai satu keluarga, bukan kumpulan halaman terpisah.
          */}
          <span className="font-display text-[15px] font-bold text-ink">
            angkut<span className="text-primary">in</span>
          </span>
        </div>

        {/* Navigasi */}
        {/*
          Tautan footer memakai `inline-flex h-11 items-center` (44px) supaya
          area tekannya memenuhi WCAG 2.5.5. Diukur sebelumnya: hanya 20px
          tinggi, artinya kurang dari setengah ambang, dan di ponsel itu
          termasuk tautan yang paling sering salah tekan.
        */}
        <nav className="flex flex-wrap items-center gap-x-5 text-[13px]">
          <Link href="/" className="inline-flex h-11 items-center text-ink-secondary transition-colors hover:text-primary-dark">
            Katalog
          </Link>
          <Link href="/pasang" className="inline-flex h-11 items-center text-ink-secondary transition-colors hover:text-primary-dark">
            Pasang Barang
          </Link>
          <Link href="/tentang" className="inline-flex h-11 items-center text-ink-secondary transition-colors hover:text-primary-dark">
            Tentang
          </Link>
          <Link href="/privasi" className="inline-flex h-11 items-center text-ink-secondary transition-colors hover:text-primary-dark">
            Privasi
          </Link>
          <Link href="/kontak" className="inline-flex h-11 items-center text-ink-secondary transition-colors hover:text-primary-dark">
            Kontak
          </Link>
          <Link href="/kontak#laporkan" className="inline-flex h-11 items-center text-ink-secondary transition-colors hover:text-primary-dark">
            Laporkan
          </Link>
        </nav>

        {/*
          Catatan kecil.
          Ditulis sebagai satu kalimat, bukan tiga frasa yang dipisah titik
          tengah. Titik tengah sebagai pemisah adalah gaya label sistem; satu
          kalimat terbaca seperti tulisan manusia.
        */}
        <p className="text-[12px] leading-relaxed text-ink-mono">
          Tanpa akun, gratis, {tahun}.
        </p>
      </div>
    </footer>
  );
}
