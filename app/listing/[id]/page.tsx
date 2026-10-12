import Link from "next/link";
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
import { IconPin, IconChevronRight } from "@/components/shared/icons";
import { formatRupiah } from "@/lib/format";
import { LABEL_KONDISI } from "@/lib/urgency";

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

  const judul = `${d.title} — Angkutin`;
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

  const sudahDiambil = d.status === "TAKEN";

  return (
    <>

      <main className="mx-auto w-full max-w-[1200px] px-4 pb-[190px] pt-4 md:px-6 md:pb-24 md:pt-6">
        {/* Breadcrumb (desktop) */}
        <nav className="mb-4 hidden items-center gap-1.5 text-[12.5px] text-ink-secondary md:flex">
          <Link href="/" className="hover:text-primary">
            Katalog
          </Link>
          <IconChevronRight size={13} />
          <span className="text-ink">{d.district_name ? `${d.district_name}, ${d.regency_name}` : (d.regency_name ?? "—")}</span>
        </nav>

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
            </div>

            <div>
              <h1 className="font-display text-[22px] font-bold leading-tight tracking-tight text-ink md:text-[26px]">
                {d.title}
              </h1>
              <div className="mt-3">
                {d.is_free ? (
                  <span className="inline-block rounded-md bg-primary px-3 py-1.5 text-[18px] font-bold text-white">
                    GRATIS
                  </span>
                ) : (
                  <span className="font-display text-[24px] font-bold text-ink">
                    {formatRupiah(d.price)}
                  </span>
                )}
              </div>
            </div>

            {/* Deskripsi */}
            <div className="rounded-md border border-line bg-surface p-4">
              <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-ink-secondary">
                Deskripsi &amp; kondisi
              </h2>
              <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink">
                {d.description}
              </p>
            </div>

            {/* Info penjemputan */}
            <div className="rounded-md border border-line bg-surface p-4">
              <h2 className="mb-3 text-[12px] font-bold uppercase tracking-wider text-ink-secondary">
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

                {d.access_notes && (
                  <div className="rounded-sm bg-appbg px-3 py-2.5">
                    <div className="text-[12px] text-ink-secondary">
                      Catatan akses logistik
                    </div>
                    <div className="mt-0.5 text-[13px] leading-relaxed text-ink">
                      {d.access_notes}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CTA di kolom kanan (desktop & tablet) */}
            <div className="hidden md:block">
              <DetailActions
                listingId={d.id}
                deadline={d.deadline_date}
                status={d.status}
              />
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
          status={d.status}
          ringkas
        />
      </div>

    </>
  );
}
