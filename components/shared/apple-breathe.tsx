/**
 * AppleBreathe — enam titik yang bernapas mengembang dan mengempis.
 *
 * KONSEP DARI amicro.vercel.app/loaders/apple-breathe (MIT, Syed Subhan).
 *
 * KENAPA DITULIS ULANG, BUKAN PAKAI PAKETNYA:
 * Komponen aslinya bergantung pada framer-motion, dan animasinya dijalankan
 * lewat JavaScript (array keyframes + repeat: Infinity per titik) — enam
 * elemen beranimasi JS yang jalan terus selama komponennya terpasang.
 *
 * Di sini animasinya CSS murni: satu keyframes, enam delay berbeda. Jadi:
 *   - nol dependensi baru (package.json tidak berubah),
 *   - nol JS yang berjalan saat animasi,
 *   - dan tetap dihormati oleh prefers-reduced-motion (blok global di
 *     globals.css sudah mematikan semua animasi).
 *
 * BENTUKNYA: enam titik di lingkaran (0°, 60°, 120°, 180°, 240°, 300°).
 * Tiap titik bernapas dengan fase yang sama — mengembang 1 -> 1,75 -> 1
 * sambil bergerak keluar 11px dari pusatnya, lalu kembali. Karena semua
 * bergerak serempak ke arah radial masing-masing, hasilnya terbaca sebagai
 * satu lingkaran yang bernapas, bukan enam titik yang berkedip sendiri-sendiri.
 *
 * Warna memakai token tema (primary di mode terang, emerald terang di mode
 * gelap), bukan teal/cyan seperti aslinya — supaya menyatu dengan identitas
 * Angkutin.
 */

/** Sudut tiap titik, dalam derajat. */
const SUDUT = [0, 60, 120, 180, 240, 300];

export function AppleBreathe({
  /** Diameter area loader dalam piksel. */
  ukuran = 48,
  className,
}: {
  ukuran?: number;
  className?: string;
}) {
  // Radius dan ukuran titik mengikuti `ukuran`.
  // Rasionya 11/48 dan 14/48 diambil dari referensi, TAPI jarak antar titik
  // dirapatkan supaya lingkaran dalamnya tidak menggumpal: pada rasio asli,
  // enam titik hampir bersinggungan di pusat dan hasilnya terlihat seperti
  // satu bongkahan hijau, bukan enam titik yang bernapas. Dengan titik yang
  // lebih kecil dan radius yang sedikit lebih besar, tiap titik tetap terbaca
  // sebagai titik terpisah di titik terluar gerakannya.
  const radius = (15 / 48) * ukuran;
  const titik = (10 / 48) * ukuran;

  return (
    <span
      aria-hidden
      className={className}
      style={{
        position: "relative",
        display: "inline-block",
        width: ukuran,
        height: ukuran,
        flex: "0 0 auto",
      }}
    >
      {SUDUT.map((derajat) => {
        const rad = (derajat * Math.PI) / 180;
        return (
          <span
            key={derajat}
            className="napas-titik"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: titik,
              height: titik,
              marginLeft: -titik / 2,
              marginTop: -titik / 2,
              borderRadius: "9999px",
              background: "rgb(var(--w-primary))",
              // Titik bergerak radial keluar dari pusat. Nilai --dx/--dy
              // dipakai di keyframes sebagai jarak mengembang.
              ["--dx" as string]: `${Math.cos(rad) * radius}px`,
              ["--dy" as string]: `${Math.sin(rad) * radius}px`,
            }}
          />
        );
      })}
    </span>
  );
}

/**
 * Penanda halaman penuh: loader di tengah dengan latar tembus pandang.
 *
 * Dipakai sebagai isi loading.tsx untuk rute yang isinya belum siap, dan
 * untuk proses yang memblokir seluruh layar.
 */
export function MuatHalaman({
  teks = "Memuat…",
  /** true = tutup seluruh layar (untuk proses, bukan perpindahan halaman). */
  penuh = false,
}: {
  teks?: string;
  penuh?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        penuh
          ? "fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3.5 bg-appbg/85 backdrop-blur-sm"
          : "flex min-h-[52vh] flex-col items-center justify-center gap-3.5 px-6 py-16"
      }
    >
      <AppleBreathe ukuran={48} />
      <span className="text-[13px] text-ink-secondary">{teks}</span>
    </div>
  );
}
