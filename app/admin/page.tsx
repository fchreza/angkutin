import type { Metadata } from "next";
import { sudahMasuk, adminSiap, MIN_SANDI } from "@/lib/admin";
import { ringkasanKunjungan } from "@/lib/analytics";
import { MasukAdmin } from "@/components/admin/masuk-admin";

/**
 * Halaman admin — ringkasan kunjungan.
 *
 * KENAPA HALAMAN INI ADA:
 * Analytics tanpa cara membacanya tidak ada gunanya. Data dikumpulkan supaya
 * pertanyaan "halaman mana yang dipakai orang" bisa dijawab, jadi harus ada
 * tempat untuk menjawabnya.
 *
 * KENAPA DIRENDER DI SERVER:
 * Pemeriksaan sesi terjadi di server sebelum halaman dikirim. Kalau
 * pemeriksaannya di klien, HTML halaman tetap terkirim ke browser siapa pun
 * dan datanya hanya disembunyikan dengan CSS. Data kunjungan memang bukan
 * rahasia, tapi pola kunjungan satu situs kecil bisa dipakai untuk menebak
 * kapan pemiliknya aktif, dan itu tidak perlu dibagikan.
 *
 * KENAPA MEMAKAI `.shell`:
 * `.shell` adalah pembungkus lebar yang dipakai SEMUA halaman lain — ia yang
 * memberi jarak dari tepi layar (padding-inline) dan batas lebar maksimum.
 * Halaman ini versi pertamanya lupa memakainya, sehingga isinya menempel
 * mentok ke tepi kiri dan kanan layar. Setiap halaman di aplikasi ini
 * memakainya; halaman admin tidak boleh jadi pengecualian.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  // Tidak boleh masuk mesin pencari.
  robots: { index: false, follow: false },
};

/**
 * Satu baris data: label di kiri, angka di kanan, batang proporsi di bawahnya.
 *
 * KENAPA PAKAI BATANG PROPORSI, padahal angkanya sudah tertulis:
 * Angka saja memaksa pembaca membandingkan sendiri, dan itu sulit dilakukan
 * untuk lebih dari tiga baris. Batangnya membuat perbandingan terlihat
 * sekaligus tanpa menghitung. Tingginya sengaja hanya 4px supaya terbaca
 * sebagai keterangan, bukan sebagai hiasan.
 *
 * `tabular-nums` dipakai supaya digitnya berkolom rapi — tanpa itu, angka
 * dengan lebar berbeda membuat daftarnya terlihat bergoyang.
 */
function Baris({
  label,
  jumlah,
  maks,
  keterangan,
  bergaris,
}: {
  label: string;
  jumlah: number;
  maks: number;
  keterangan?: string;
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
      {keterangan && (
        <p className="mt-0.5 text-[13px] leading-relaxed text-ink-secondary">
          {keterangan}
        </p>
      )}
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

export default async function HalamanAdmin() {
  // Belum dikonfigurasi: jelaskan apa yang harus dilakukan, jangan tampilkan
  // form yang tidak akan pernah berhasil.
  if (!adminSiap()) {
    return (
      <main className="shell w-full pb-24 pt-10 md:pt-16">
        <div className="max-w-baca">
          <h1 className="font-display text-judul-besar font-bold text-ink">
            Admin belum dikonfigurasi
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-secondary">
            Isi variabel lingkungan{" "}
            <code className="rounded bg-surface2 px-1.5 py-0.5 text-[14px] text-ink">
              ADMIN_PASS
            </code>{" "}
            dengan sandi minimal {MIN_SANDI} karakter, lalu buka halaman ini
            lagi.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-secondary">
            Di Vercel: Settings, Environment Variables, tambahkan ADMIN_PASS
            untuk Production, lalu deploy ulang.
          </p>
        </div>
      </main>
    );
  }

  if (!(await sudahMasuk())) {
    return (
      <main className="shell w-full pb-24 pt-10 md:pt-16">
        <MasukAdmin />
      </main>
    );
  }

  const ringkas = await ringkasanKunjungan(30);

  // Nama ramah untuk tiap jenis rujukan. Kode mentahnya dipakai di database
  // supaya stabil, tapi tidak ada gunanya ditampilkan apa adanya.
  const labelRujukan: Record<string, string> = {
    langsung: "Langsung",
    internal: "Dari halaman lain",
    whatsapp: "Dari WhatsApp",
    "mesin-cari": "Dari mesin pencari",
    lainnya: "Dari situs lain",
  };

  const maksJalur = Math.max(1, ...ringkas.per_jalur.map((b) => b.jumlah));
  const maksRujukan = Math.max(1, ...ringkas.per_rujukan.map((b) => b.jumlah));

  return (
    <main className="shell w-full pb-24 pt-10 md:pt-16">
      <header className="max-w-baca">
        <h1 className="font-display text-judul-besar font-bold text-ink">
          Kunjungan 30 hari terakhir
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-secondary">
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
              {ringkas.per_jalur.map((b) => (
                <Baris
                  key={b.path}
                  label={b.path}
                  jumlah={b.jumlah}
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
              {ringkas.per_rujukan.map((b) => (
                <Baris
                  key={b.referrer}
                  label={labelRujukan[b.referrer] ?? b.referrer}
                  jumlah={b.jumlah}
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
    </main>
  );
}
