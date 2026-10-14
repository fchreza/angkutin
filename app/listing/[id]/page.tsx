import { notFound } from "next/navigation";
import { after } from "next/server";
import type { Metadata } from "next";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { ambilDetail } from "@/lib/listing-query";
import { MediaCarousel } from "@/components/detail/media-carousel";
import { DetailActions } from "@/components/detail/detail-actions";
import { Badge } from "@/components/shared/badge";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { IconPin } from "@/components/shared/icons";
import { formatRupiah } from "@/lib/format";
import { LABEL_KONDISI, statusEfektif } from "@/lib/urgency";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { title: "Barang tidak ditemukan" };
  const d = await ambilDetail(id);
  if (!d) return { title: "Barang tidak ditemukan" };

  const judul = `${d.title} | Angkutin`;
  const deskripsi = d.description.slice(0, 150);

  /**
   * Kartu link memakai endpoint /listing/:id/og, BUKAN foto aslinya.
   *
   * Foto asli berformat WebP dan boleh sampai 500 KB; WhatsApp menolak di
   * atas ~300 KB dan sering gagal merender WebP, sehingga link yang dibagikan
   * muncul tanpa gambar. Endpoint itu menyajikannya ulang sebagai JPEG
   * 1200x630 yang sudah dikecilkan.
   *
   * CADANGAN WAJIB: kalau listing tidak punya foto, pakai gambar bawaan situs.
   * Menulis `undefined` di sini BUKAN "pakai bawaan" — Next menafsirkannya
   * sebagai "tidak ada og:image", dan gambar bawaan dari layout ikut terhapus.
   * Akibatnya listing tanpa foto tampil tanpa gambar sama sekali di WhatsApp.
   */
  const ogImage = d.images.length > 0 ? `/listing/${id}/og` : "/brand/og.png";

  return {
    title: judul,
    description: deskripsi,
    alternates: { canonical: `/listing/${id}` },
    openGraph: {
      title: d.title,
      description: deskripsi,
      url: `/listing/${id}`,
      type: "website",
      locale: "id_ID",
      siteName: "Angkutin",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: d.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: d.title,
      description: deskripsi,
      images: [ogImage],
    },
  };
}

/**
 * Layar 2: Detail Barang.
 *
 * Catatan privasi: nomor WhatsApp penjual TIDAK dirender di halaman ini.
 * CTA mengambil link dari server saat diklik (lihat DetailActions).
 */
export default async function DetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const d = await ambilDetail(id);
  if (!d) notFound();

  /**
   * Catat tampilan (KPI view -> CTR).
   *
   * KENAPA DI SINI, BUKAN DI API ROUTE:
   * Halaman ini membaca database langsung, sedangkan `GET /api/v1/listings/:id`
   * yang punya kode penghitung tidak pernah dipanggil siapa pun — jadi
   * "Dilihat" selalu 0 dan CTR di dashboard selalu 0% (padahal ada label
   * target 35%). Penghitungnya harus berada di jalur yang benar-benar
   * dilewati pembaca.
   *
   * `after()` menjalankan ini SETELAH respons terkirim, jadi pembaca tidak
   * menunggu satu tulis database. Kalau penulisannya gagal, halaman tetap
   * tampil — statistik tidak boleh menjatuhkan halaman publik.
   */
  after(async () => {
    try {
      await db
        .update(listings)
        .set({ viewCount: sql`${listings.viewCount} + 1` })
        .where(eq(listings.id, id));
    } catch (e) {
      console.error("[view count] gagal:", e);
    }
  });

  const status = statusEfektif(d.status, d.deadline_date);
  const sudahDiambil = status === "TAKEN";

  return (
    <>

      <main className="shell w-full pb-[190px] pt-4 md:pb-24 md:pt-6">
        {/*
          Remah navigasi. Dulu hanya tampil di desktop (`hidden md:flex`), dan
          tanpa tautan ke wilayah — padahal wilayah itu langkah di antaranya.
          Sekarang tampil di semua ukuran (referensinya memang membungkus baris
          di layar sempit) dan wilayah bisa diklik untuk memfilter katalog.

          Hierarkinya: Katalog > Kategori > Wilayah > Judul barang.
          Ruas yang tidak punya nilai dilewati, jadi tidak ada tautan kosong.
        */}
        <Breadcrumb
          className="mb-4"
          items={[
            { label: "Katalog", href: "/" },
            ...(d.category_name
              ? [
                  {
                    label: d.category_name,
                    href: `/?kategori=${encodeURIComponent(d.category_id ?? "")}`,
                  },
                ]
              : []),
            ...(d.regency_name
              ? [
                  {
                    label: d.district_name
                      ? `${d.district_name}, ${d.regency_name}`
                      : d.regency_name,
                    href: `/?regency=${encodeURIComponent(d.regency_code ?? "")}`,
                  },
                ]
              : []),
            { label: d.title },
          ]}
        />

        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          {/* Kolom kiri: foto */}
          <div className={sudahDiambil ? "opacity-70" : ""}>
            <MediaCarousel foto={d.images} judul={d.title} />
          </div>

          {/* Kolom kanan: info */}
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-1.5">
              {d.category_name && <Badge varian="netral">{d.category_name}</Badge>}
              <Badge varian="kondisi">
                {LABEL_KONDISI[d.condition] ?? d.condition}
              </Badge>
              {d.regency_name && (
                <Badge varian="wilayah">
                  {d.district_name ? `${d.district_name}, ${d.regency_name}` : d.regency_name}
                </Badge>
              )}
              {sudahDiambil && <Badge varian="taken">SUDAH DIAMBIL</Badge>}
              {status === "EXPIRED" && <Badge varian="netral">WAKTU HABIS</Badge>}
            </div>

            <div>
              <h1 className="font-display text-judul-besar font-bold text-ink">
                {d.title}
              </h1>
              <div className="mt-3">
                {d.is_free ? (
                  <span className="inline-block rounded-sm bg-primary px-3 py-1.5 font-display text-[20px] font-bold text-primary-teks">
                    GRATIS
                  </span>
                ) : (
                  <span className="font-display text-[30px] font-bold leading-none tracking-tight tabular-nums text-ink">
                    {formatRupiah(d.price)}
                  </span>
                )}
              </div>
            </div>

            {/*
              AKSI UTAMA DI SINI, tepat di bawah harga.

              KENAPA DIPINDAH KE SINI:
              Sebelumnya tombol WhatsApp berada di paling bawah kolom kanan,
              setelah kartu Deskripsi dan kartu Penjemputan. Pada layar 1265x624
              tombolnya mulai di 610px, artinya praktis tidak terlihat tanpa
              menggulir. Padahal menghubungi penjual adalah SATU-SATUNYA aksi
              yang bisa dilakukan di halaman ini: kalau tombolnya tidak
              terlihat, halaman ini tidak punya jalan keluar.

              Judul dan harga adalah dua hal yang membuat orang memutuskan.
              Tombolnya harus berada tepat setelah keputusan itu terbentuk,
              bukan setelah dua kartu informasi yang bisa dibaca belakangan.

              Kartu tenggat tetap di dalam komponen ini dan tetap muncul
              tepat di atas tombol, karena tenggat ikut menentukan keputusan.
              Detail penjemputan tetap di bawah, karena itu dibaca SETELAH
              orang tertarik.
            */}
            <div className="hidden md:block">
              <DetailActions
                listingId={d.id}
                deadline={d.deadline_date}
                status={status}
              />
            </div>

            {/* Deskripsi */}
            <div className="rounded-md border border-line bg-surface p-4">
              {/*
                Motif identitas situs: label kecil kapital dengan tracking
                lebar. Dipakai sama persis di seluruh situs, jadi halaman
                terasa satu keluarga. Sebelumnya memakai `font-bold`, dan
                tebal + kapital + tracking lebar sekaligus membuat labelnya
                berteriak, bukan menandai.
              */}
              <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-mono">
                Deskripsi &amp; kondisi
              </h2>
              <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink">
                {d.description}
              </p>
            </div>

            {/* Info penjemputan */}
            <div className="rounded-md border border-line bg-surface p-4">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-mono">
                Penjemputan &amp; akses
              </h2>

              <div className="space-y-3">
                <div className="flex gap-2.5">
                  <IconPin size={16} className="mt-[2px] shrink-0 text-primary" />
                  <div>
                    <div className="text-[12px] text-ink-secondary">
                      Patokan lokasi
                    </div>
                    <div className="text-[13.5px] font-medium text-ink">
                      {d.pickup_landmark}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <span className="mt-[2px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-bold text-primary-dark">
                    {d.seller_name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <div className="text-[12px] text-ink-secondary">Pemilik</div>
                    <div className="text-[13.5px] font-medium text-ink">
                      {d.seller_name}
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </main>

      {/* CTA melekat di bawah untuk mobile */}
      <div
        className="fixed inset-x-0 z-20 border-t border-line bg-surface p-3 md:hidden"
        style={{ bottom: "calc(60px + env(safe-area-inset-bottom))" }}
      >
        <DetailActions
          listingId={d.id}
          deadline={d.deadline_date}
          status={status}
          ringkas
        />
      </div>

    </>
  );
}
