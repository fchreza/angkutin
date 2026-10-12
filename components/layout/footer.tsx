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
    <footer className="mt-auto border-t border-line bg-surface pb-[76px] md:pb-0">
      <div className="shell flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        {/* Identitas */}
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.png" alt="" width={20} height={20} className="shrink-0" />
          <span className="font-display text-[13.5px] font-bold tracking-tight text-ink">
            angkut<span className="text-primary">in</span>
          </span>
          <span className="text-[12.5px] text-ink-secondary">
            · barang pindahan, diambil sendiri
          </span>
        </div>

        {/* Navigasi */}
        <nav className="flex items-center gap-4 text-[12.5px]">
          <Link href="/" className="text-ink-secondary transition-colors hover:text-primary">
            Katalog
          </Link>
          <Link href="/pasang" className="text-ink-secondary transition-colors hover:text-primary">
            Pasang Barang
          </Link>
          <Link href="/tentang" className="text-ink-secondary transition-colors hover:text-primary">
            Tentang
          </Link>
        </nav>

        {/* Catatan kecil */}
        <p className="text-[11.5px] leading-relaxed text-ink-secondary">
          Tanpa akun · Gratis · {tahun}
        </p>
      </div>
    </footer>
  );
}
