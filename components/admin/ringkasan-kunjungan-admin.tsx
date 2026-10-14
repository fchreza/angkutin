import { sudahMasuk, adminSiap } from "@/lib/admin";
import { ringkasanKunjungan } from "@/lib/analytics";

/** Satu baris data analytics, dilengkapi batang proporsi. */
function Baris({
  label,
  jumlah,
  maks,
  bergaris,
}: {
  label: string;
  jumlah: number;
  maks: number;
  bergaris?: boolean;
}) {
  const persen = maks > 0 ? Math.max(2, Math.round((jumlah / maks) * 100)) : 0;

  return (
    <li className="px-5 py-4 sm:px-6">
      <div className="flex items-baseline justify-between gap-4">
        <span className="min-w-0 truncate text-[15px] text-ink" title={label}>
          {label}
        </span>
        <span className="shrink-0 text-[15px] font-semibold tabular-nums text-ink">
          {jumlah.toLocaleString("id-ID")}
        </span>
      </div>
      <div
        className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-surface2"
        aria-hidden="true"
      >
        <div
          className={`h-full rounded-full ${bergaris ? "bg-accent" : "bg-primary"}`}
          style={{ width: `${persen}%` }}
        />
      </div>
    </li>
  );
}

function Kartu({
  judul,
  nilai,
  satuan,
  keterangan,
}: {
  judul: string;
  nilai: string;
  satuan?: string;
  keterangan?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface px-5 py-5 sm:px-6 sm:py-6">
      <p className="text-[13px] font-medium uppercase tracking-wide text-ink-secondary">
        {judul}
      </p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="font-display text-[2.25rem] font-bold leading-none tabular-nums text-ink sm:text-[2.75rem]">
          {nilai}
        </span>
        {satuan && (
          <span className="text-[15px] text-ink-secondary">{satuan}</span>
        )}
      </p>
      {keterangan && (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
          {keterangan}
        </p>
      )}
    </div>
  );
}

const LABEL_RUJUKAN: Record<string, string> = {
  langsung: "Langsung",
  internal: "Dari halaman lain",
  whatsapp: "Dari WhatsApp",
  "mesin-cari": "Dari mesin pencari",
  lainnya: "Dari situs lain",
};

/**
 * Ringkasan ini berada di layout admin, bukan di halaman yang berubah saat
 * filter status/search berubah. Next.js mempertahankan layout saat navigasi
 * client-side di segmen /admin, sehingga query analytics hanya dijalankan
 * ketika layout admin pertama kali dimuat.
 */
export async function RingkasanKunjunganAdmin() {
  if (!adminSiap() || !(await sudahMasuk())) return null;

  const ringkas = await ringkasanKunjungan(30);
  const maksJalur = Math.max(1, ...ringkas.per_jalur.map((baris) => baris.jumlah));
  const maksRujukan = Math.max(1, ...ringkas.per_rujukan.map((baris) => baris.jumlah));

  return (
    <section className="shell w-full pb-24">
      <header className="mt-12 max-w-baca">
        <h2 className="font-display text-judul-kecil font-bold text-ink">
          Kunjungan 30 hari terakhir
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-secondary">
          Angka ini menghitung kunjungan halaman, bukan orang. Tidak ada cara
          mengetahui berapa banyak orang berbeda, karena halaman ini memang
          tidak menyimpan apa pun yang bisa dipakai untuk membedakan orang.
        </p>
      </header>

      {ringkas.total === 0 ? (
        <section className="mt-8 rounded-lg border border-line bg-surface px-6 py-12 text-center">
          <p className="font-display text-[1.5rem] font-bold text-ink">
            Belum ada kunjungan
          </p>
          <p className="mx-auto mt-3 max-w-baca text-[15px] leading-relaxed text-ink-secondary">
            Data muncul beberapa detik setelah ada orang membuka halaman.
            Halaman ini sendiri dan halaman kelola sengaja tidak dihitung, jadi
            membuka ulang halaman ini tidak akan menambah angka apa pun.
          </p>
        </section>
      ) : (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2">
            <Kartu
              judul="Kunjungan halaman"
              nilai={ringkas.total.toLocaleString("id-ID")}
              keterangan="Bukan jumlah orang berbeda"
            />
            <Kartu
              judul="Halaman berbeda"
              nilai={ringkas.per_jalur.length.toLocaleString("id-ID")}
              satuan="halaman"
            />
          </section>

          <section className="mt-8">
            <h2 className="font-display text-judul-kecil font-bold text-ink">
              Halaman paling banyak dibuka
            </h2>
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
              {ringkas.per_jalur.map((baris) => (
                <Baris
                  key={baris.path}
                  label={baris.path}
                  jumlah={baris.jumlah}
                  maks={maksJalur}
                />
              ))}
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="font-display text-judul-kecil font-bold text-ink">
              Dari mana orang datang
            </h2>
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
              {ringkas.per_rujukan.map((baris) => (
                <Baris
                  key={baris.referrer}
                  label={LABEL_RUJUKAN[baris.referrer] ?? baris.referrer}
                  jumlah={baris.jumlah}
                  maks={maksRujukan}
                  bergaris
                />
              ))}
            </ul>
          </section>
        </>
      )}

      <footer className="mt-8 max-w-baca rounded-lg border border-line bg-surface2 px-5 py-4">
        <p className="text-[13px] leading-relaxed text-ink-secondary">
          Data kunjungan disimpan 90 hari, lalu dihapus otomatis oleh tugas
          harian. Yang dicatat hanya jalur halaman, jenis rujukan, dan
          perkiraan ukuran layar. Alamat IP, token, dan isi kolom apa pun tidak
          pernah disimpan.
        </p>
      </footer>
    </section>
  );
}
