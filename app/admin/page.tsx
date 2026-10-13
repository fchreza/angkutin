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
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  // Tidak boleh masuk mesin pencari.
  robots: { index: false, follow: false },
};

function Kartu({
  judul,
  nilai,
  keterangan,
}: {
  judul: string;
  nilai: string;
  keterangan?: string;
}) {
  return (
    <div className="rounded-md border border-line bg-surface p-5">
      <p className="text-sm font-medium text-ink-secondary">{judul}</p>
      <p className="mt-1 font-display text-3xl text-ink">{nilai}</p>
      {keterangan && (
        <p className="mt-1 text-sm leading-relaxed text-ink-mono">
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
      <div className="mx-auto max-w-2xl py-16">
        <h1 className="judul-sedang">Admin belum dikonfigurasi</h1>
        <p className="mt-3 leading-relaxed text-ink-secondary">
          Isi variabel lingkungan <code className="text-ink">ADMIN_PASS</code>{" "}
          dengan sandi minimal {MIN_SANDI} karakter, lalu buka halaman ini lagi.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-mono">
          Di Vercel: Settings, Environment Variables, tambahkan ADMIN_PASS untuk
          Production, lalu deploy ulang.
        </p>
      </div>
    );
  }

  if (!(await sudahMasuk())) return <MasukAdmin />;

  const ringkas = await ringkasanKunjungan(30);

  // Nama ramah untuk tiap jenis rujukan. Kode mentahnya dipakai di database
  // supaya stabil, tapi tidak ada gunanya ditampilkan apa adanya.
  const labelRujukan: Record<string, string> = {
    langsung: "Langsung (buka dari bookmark atau ketik alamat)",
    internal: "Dari halaman lain di Angkutin",
    whatsapp: "Dari tautan yang dibagikan lewat WhatsApp",
    "mesin-cari": "Dari Google atau mesin pencari lain",
    lainnya: "Dari situs lain",
  };

  return (
    <div className="space-y-8 py-10">
      <div>
        <h1 className="judul-sedang">Kunjungan 30 hari terakhir</h1>
        <p className="mt-2 leading-relaxed text-ink-secondary">
          Angka ini menghitung kunjungan halaman, bukan orang. Tidak ada cara
          mengetahui berapa banyak orang berbeda, karena halaman ini memang
          tidak menyimpan apa pun yang bisa dipakai untuk membedakan orang.
        </p>
      </div>

      {ringkas.total === 0 ? (
        <div className="rounded-md border border-line bg-surface p-6">
          <p className="text-ink-secondary">
            Belum ada kunjungan tercatat dalam 30 hari terakhir.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Kartu
              judul="Total kunjungan halaman"
              nilai={ringkas.total.toLocaleString("id-ID")}
              keterangan="Bukan jumlah orang berbeda"
            />
            <Kartu
              judul="Halaman berbeda yang dibuka"
              nilai={ringkas.per_jalur.length.toLocaleString("id-ID")}
            />
          </div>

          <section>
            <h2 className="judul-kecil">Halaman paling banyak dibuka</h2>
            <div className="mt-3 overflow-hidden rounded-md border border-line">
              {ringkas.per_jalur.map((b, i) => (
                <div
                  key={b.path}
                  className={`flex items-center justify-between gap-4 px-4 py-3 text-sm ${
                    i % 2 === 1 ? "bg-surface2" : "bg-surface"
                  }`}
                >
                  <code className="truncate text-ink">{b.path}</code>
                  <span className="shrink-0 font-medium text-ink-secondary">
                    {b.jumlah.toLocaleString("id-ID")}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="judul-kecil">Dari mana orang datang</h2>
            <div className="mt-3 overflow-hidden rounded-md border border-line">
              {ringkas.per_rujukan.map((b, i) => (
                <div
                  key={b.referrer}
                  className={`flex items-center justify-between gap-4 px-4 py-3 text-sm ${
                    i % 2 === 1 ? "bg-surface2" : "bg-surface"
                  }`}
                >
                  <span className="text-ink">
                    {labelRujukan[b.referrer] ?? b.referrer}
                  </span>
                  <span className="shrink-0 font-medium text-ink-secondary">
                    {b.jumlah.toLocaleString("id-ID")}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <p className="text-sm leading-relaxed text-ink-mono">
        Data kunjungan disimpan 90 hari, lalu dihapus otomatis oleh tugas
        harian. Yang dicatat hanya jalur halaman, jenis rujukan, dan perkiraan
        ukuran layar. Alamat IP, token, dan isi kolom apa pun tidak pernah
        disimpan.
      </p>
    </div>
  );
}
