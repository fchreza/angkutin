/**
 * Indikator saat halaman /pasang sedang dimuat.
 *
 * KENAPA INI ADA:
 * Sebelumnya menekan tombol "Pasang Barang" tidak memberi umpan balik apa pun
 * — halaman form tiba-tiba terbuka. Terasa seperti tidak ada reaksi, dan
 * pengguna tidak yakin tombolnya bekerja (terutama di koneksi lambat, saat
 * jeda antara halaman bisa terasa 1 detik lebih).
 *
 * Next.js otomatis memakai berkas ini sebagai Suspense boundary untuk rute
 * /pasang, jadi indikatornya muncul SEKETIKA saat navigasi dimulai — sebelum
 * server selesai menyiapkan halaman.
 *
 * Bentuknya sengaja meniru tata letak form asli (judul, tiga kotak isian),
 * supaya peralihan ke form tidak terasa melompat.
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 pb-[130px] pt-4 md:px-6 md:pb-24 md:pt-6">
      {/* Kepala halaman */}
      <div className="mb-5">
        <div className="skeleton h-[26px] w-[220px]" />
        <div className="skeleton mt-2 h-[14px] w-[300px]" />
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_360px] md:gap-8">
        <div className="space-y-5">
          {/* Kotak foto */}
          <div className="rounded-md border border-line bg-surface p-4">
            <div className="skeleton mb-3 h-[14px] w-[120px]" />
            <div className="grid grid-cols-3 gap-2.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton aspect-square rounded-md" />
              ))}
            </div>
          </div>

          {/* Kotak detail barang */}
          <div className="space-y-4 rounded-md border border-line bg-surface p-4">
            <div className="skeleton h-[12px] w-[130px]" />
            <div>
              <div className="skeleton mb-2 h-[13px] w-[100px]" />
              <div className="skeleton h-11 w-full rounded-md" />
            </div>
            <div>
              <div className="skeleton mb-2 h-[13px] w-[80px]" />
              <div className="skeleton h-11 w-full rounded-md" />
            </div>
            <div>
              <div className="skeleton mb-2 h-[13px] w-[140px]" />
              <div className="skeleton h-[92px] w-full rounded-md" />
            </div>
          </div>

          {/* Kotak penjemputan */}
          <div className="space-y-4 rounded-md border border-line bg-surface p-4">
            <div className="skeleton h-[12px] w-[110px]" />
            <div className="skeleton h-11 w-full rounded-md" />
            <div className="skeleton h-11 w-full rounded-md" />
            <div className="skeleton h-11 w-full rounded-md" />
          </div>
        </div>

        {/* Pratinjau (desktop saja, sama seperti form asli) */}
        <div className="hidden md:block">
          <div className="skeleton h-[420px] w-full rounded-md" />
        </div>
      </div>
    </main>
  );
}
