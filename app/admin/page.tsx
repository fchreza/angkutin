import type { Metadata } from "next";
import { sudahMasuk, adminSiap, MIN_SANDI } from "@/lib/admin";
import { daftarBarangAdmin, hitungStatusBarangAdmin } from "@/lib/admin-barang";
import { daftarLaporan, LABEL_ALASAN_LAPORAN } from "@/lib/laporan";
import { STATUS_VALUES } from "@/db/schema";
import { MasukAdmin } from "@/components/admin/masuk-admin";
import { CariBarang } from "@/components/admin/cari-barang";
import { FilterStatusBarang } from "@/components/admin/filter-status-barang";
import { TautanBarang } from "@/components/admin/tautan-barang";
import { TandaiLaporan } from "@/components/admin/tandai-laporan";
import { HapusBarang } from "@/components/admin/hapus-barang";

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
 * Label status barang.
 *
 * Kode mentahnya dipakai di database supaya stabil, tapi tidak ada gunanya
 * ditampilkan apa adanya ke manusia.
 */
const LABEL_STATUS: Record<string, string> = {
  AVAILABLE: "Tayang",
  TAKEN: "Sudah diambil",
  EXPIRED: "Kedaluwarsa",
  DELETED: "Dihapus penjual",
};

/** Warna titik status. Hijau = masih hidup, abu = sudah tidak tayang. */
const WARNA_STATUS: Record<string, string> = {
  AVAILABLE: "bg-primary",
  TAKEN: "bg-accent",
  EXPIRED: "bg-ink-mono",
  DELETED: "bg-ink-mono",
};

/**
 * Tanggal dalam format Indonesia, diikat ke tengah malam UTC.
 *
 * KENAPA UTC: kolom tanggal di database bertipe `date` dan dibaca sebagai
 * string 'YYYY-MM-DD'. Kalau diubah jadi Date lokal lalu diformat, hasilnya
 * bergeser sehari di WIB. Pola ini sama dengan yang dipakai lib/urgency.ts.
 */
function tanggalID(ymd: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${ymd.slice(0, 10)}T00:00:00Z`));
}

/** Berapa hari lagi tenggatnya, dihitung terhadap tanggal hari ini di WIB. */
function sisaHari(ymd: string): number {
  const hariIni = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const a = new Date(`${hariIni}T00:00:00Z`).getTime();
  const b = new Date(`${ymd.slice(0, 10)}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

export default async function HalamanAdmin({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
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

  const { q, status: statusParam } = await searchParams;
  const kueri = (q ?? "").trim();
  const statusAktif = STATUS_VALUES.find((nilai) => nilai === statusParam);

  // Dijalankan bersamaan, bukan berurutan: ketiganya tidak saling bergantung,
  // jadi menunggunya satu per satu hanya menambah waktu muat halaman.
  const [barang, jumlahStatus, laporan] = await Promise.all([
    daftarBarangAdmin(kueri, statusAktif),
    hitungStatusBarangAdmin(kueri),
    // Laporan hanya diambil kalau tidak sedang mencari — antrian laporan
    // adalah daftar kerja harian, bukan hasil pencarian.
    kueri || statusAktif ? Promise.resolve([]) : daftarLaporan(),
  ]);
  const jumlahHasil = statusAktif
    ? jumlahStatus[statusAktif]
    : Object.values(jumlahStatus).reduce((total, jumlah) => total + jumlah, 0);

  return (
    <main className="shell w-full pt-10 md:pt-16">
      <header className="max-w-baca">
        <h1 className="font-display text-judul-besar font-bold text-ink">
          Barang
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-secondary">
          Semua barang yang pernah dipasang, terbaru dulu. Dipakai kalau ada
          penjual yang menghubungi karena kehilangan tautannya.
        </p>
      </header>

      <CariBarang nilaiAwal={kueri} status={statusAktif} />
      <FilterStatusBarang
        statusAktif={statusAktif}
        kueri={kueri}
        jumlah={jumlahStatus}
      />

      {/* ---------- Antrian laporan ----------
          Hanya tampil saat tidak sedang mencari: ini daftar kerja harian,
          bukan hasil pencarian. */}
      {!kueri && !statusAktif && (
        <section className="mt-10" aria-labelledby="laporan-heading">
          <h2
            id="laporan-heading"
            className="font-display text-[20px] font-medium tracking-[-0.01em] text-ink md:text-[22px]"
          >
            Laporan{" "}
            <span className="rounded-pill bg-accent-soft px-2.5 py-0.5 text-[13px] font-semibold text-accent-text">
              {laporan.length} menunggu
            </span>
          </h2>
          <p className="mt-2 max-w-baca text-[14px] leading-relaxed text-ink-secondary">
            Laporan dari pengguna tentang listing yang bermasalah (spam,
            penipuan, konten tidak pantas). Tinjau, lalu tandai ditinjau — atau
            hapus/ubah status barangnya dari daftar di bawah bila perlu.
          </p>

          {laporan.length === 0 ? (
            <p className="mt-4 rounded-lg border border-line bg-surface px-5 py-6 text-[14px] text-ink-secondary">
              Tidak ada laporan yang menunggu. Antrian bersih.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {laporan.map((l) => (
                <li
                  key={l.id}
                  className="rounded-lg border border-line bg-surface px-5 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-ink">
                        {LABEL_ALASAN_LAPORAN[l.reason] ?? l.reason}
                      </p>
                      <p className="mt-1 truncate text-[13px] text-ink-secondary">
                        <a
                          href={`/listing/${l.listingId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline decoration-dotted underline-offset-4 hover:text-ink"
                        >
                          {l.judulBarang}
                        </a>{" "}
                        · {tanggalID(l.dibuat)}
                      </p>
                      {l.detail && (
                        <p className="mt-2 text-[13px] leading-relaxed text-ink">
                          “{l.detail}”
                        </p>
                      )}
                    </div>
                    <TandaiLaporan laporanId={l.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {barang.length === 0 ? (
        <section className="mt-6 rounded-lg border border-line bg-surface px-6 py-10 text-center">
          <p className="font-display text-[1.25rem] font-bold text-ink">
            {kueri
              ? statusAktif
                ? `Tidak ada barang berstatus ${LABEL_STATUS[statusAktif]} yang cocok`
                : "Tidak ada yang cocok"
              : statusAktif
                ? `Belum ada barang berstatus ${LABEL_STATUS[statusAktif]}`
                : "Belum ada barang"}
          </p>
          <p className="mx-auto mt-2 max-w-baca text-[14px] leading-relaxed text-ink-secondary">
            {statusAktif
              ? kueri
                ? `Tidak ada barang dengan status ${LABEL_STATUS[statusAktif]} yang cocok dengan "${kueri}". Coba status lain atau ubah kata pencarian.`
                : "Pilih status lain untuk melihat barang lainnya."
              : kueri
                ? `Tidak ada barang yang cocok dengan "${kueri}". Coba kata kunci lain, atau kosongkan pencarian untuk melihat semuanya.`
                : "Barang akan muncul di sini setelah ada penjual yang memasangnya."}
          </p>
        </section>
      ) : (
        <section className="mt-6">
          <p className="text-[13px] text-ink-secondary">
            {jumlahHasil > barang.length
              ? `Menampilkan ${barang.length.toLocaleString("id-ID")} dari ${jumlahHasil.toLocaleString("id-ID")} barang${kueri ? ` yang cocok dengan "${kueri}"` : ""}`
              : `${jumlahHasil.toLocaleString("id-ID")} barang${kueri ? ` cocok dengan "${kueri}"` : ""}`}
          </p>
          <ul className="mt-3 space-y-3">
            {barang.map((b) => {
              const sisa = sisaHari(b.deadlineDate);
              const tayang = b.status === "AVAILABLE";
              return (
                <li
                  key={b.id}
                  className="rounded-lg border border-line bg-surface px-5 py-4 sm:px-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${WARNA_STATUS[b.status] ?? "bg-ink-mono"}`}
                          aria-hidden="true"
                        />
                        <h3 className="truncate text-[15px] font-semibold text-ink">
                          {b.title}
                        </h3>
                      </div>
                      <p className="mt-1 text-[13px] text-ink-secondary">
                        {b.sellerName} · {b.waTopeng}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-pill border border-line px-2.5 py-1 text-[12px] font-medium text-ink-secondary">
                      {LABEL_STATUS[b.status] ?? b.status}
                    </span>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-4">
                    <div>
                      <dt className="text-ink-secondary">Diupload</dt>
                      <dd className="mt-0.5 font-medium text-ink">
                        {tanggalID(b.createdAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-secondary">Tersedia sampai</dt>
                      <dd className="mt-0.5 font-medium text-ink">
                        {tanggalID(b.deadlineDate)}
                        {tayang && sisa >= 0 && (
                          <span className="font-normal text-ink-secondary">
                            {" "}
                            ({sisa === 0 ? "hari ini" : `${sisa} hari lagi`})
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-secondary">Dilihat</dt>
                      <dd className="mt-0.5 font-medium tabular-nums text-ink">
                        {b.viewCount.toLocaleString("id-ID")} kali
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-secondary">Klik WhatsApp</dt>
                      <dd className="mt-0.5 font-medium tabular-nums text-ink">
                        {b.whatsappClicks.toLocaleString("id-ID")} kali
                      </dd>
                    </div>
                  </dl>

                  {b.stallId && (
                    <p className="mt-3 text-[13px] leading-relaxed text-ink-secondary">
                      Bagian dari lapak
                      {b.stallNama ? ` "${b.stallNama}"` : ""}
                      {b.barangLapakLain > 0
                        ? ` yang berisi ${b.barangLapakLain} barang lain.`
                        : " yang hanya berisi barang ini."}
                    </p>
                  )}

                  <div className="mt-3.5 flex flex-wrap items-center gap-3">
                    <TautanBarang listingId={b.id} />
                    <HapusBarang listingId={b.id} judul={b.title} />
                  </div>
                </li>
              );
            })}
          </ul>
          {barang.length >= 500 && (
            <p className="mt-4 text-[13px] leading-relaxed text-ink-secondary">
              Hanya 500 barang terbaru yang ditampilkan. Pakai pencarian untuk
              menemukan barang yang lebih lama.
            </p>
          )}
        </section>
      )}

    </main>
  );
}
