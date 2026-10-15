import { notFound } from "next/navigation";
import { after } from "next/server";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { ambilDetail, ambilRekomendasi } from "@/lib/listing-query";
import { MediaCarousel } from "@/components/detail/media-carousel";
import { DetailActions } from "@/components/detail/detail-actions";
import { ReportButton } from "@/components/detail/report-button";
import { ProductRecommendations } from "@/components/detail/product-recommendations";
import { Badge } from "@/components/shared/badge";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { IconPin } from "@/components/shared/icons";
import { formatRupiah, formatTanggalID } from "@/lib/format";
import { LABEL_KONDISI, statusEfektif } from "@/lib/urgency";
import { logger } from "@/lib/logger";

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
  // Link preview memakai JPEG yang sudah dioptimalkan; fallback bawaan tetap wajib
  // agar listing tanpa foto masih memiliki gambar Open Graph.
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
      images: [{ url: ogImage, width: 1200, height: 630, alt: d.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: d.title,
      description: deskripsi,
      images: [ogImage],
    },
  };
}

/** Nomor WhatsApp penjual tidak dirender; CTA mengambil link dari server saat diklik. */
export default async function DetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const d = await ambilDetail(id);
  if (!d) notFound();

  // Catat kunjungan setelah respons terkirim supaya statistik tidak memperlambat halaman.
  after(async () => {
    try {
      await db
        .update(listings)
        .set({ viewCount: sql`${listings.viewCount} + 1` })
        .where(eq(listings.id, id));
    } catch (e) {
      logger.error("[view count] gagal:", e);
    }
  });

  const status = statusEfektif(d.status, d.deadline_date);
  const sudahDiambil = status === "TAKEN";
  const rekomendasi = await ambilRekomendasi({
    id: d.id,
    stallId: d.stall_id,
    categoryId: d.category_id,
    regencyCode: d.regency_code,
  });

  // JSON-LD Product/Offer (schema.org) untuk rich results mesin pencari.
  //
  // KENAPA DITAMBAHKAN: halaman detail adalah aset SEO utama — setiap barang
  // punya URL unik yang bisa diindeks. Tanpa structured data, Google hanya
  // menebak dari HTML; dengan JSON-LD, harga, ketersediaan, dan gambar
  // terbaca eksplisit dan berpeluang tampil sebagai rich result.
  //
  // KENAPA URL ABSOLUT: schema.org dan validator Google menolak URL relatif.
  // Origin diambil dari header request yang sebenarnya (mengikuti pola yang
  // dipakai POST /api/v1/listings saat menyusun public_url).
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: d.title,
    description: d.description.slice(0, 500),
    image: d.images.map((f) => f.image_url),
    offers: {
      "@type": "Offer",
      url: origin ? `${origin}/listing/${d.id}` : `/listing/${d.id}`,
      price: d.is_free ? "0" : d.price,
      priceCurrency: "IDR",
      availability:
        status === "AVAILABLE"
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      {/* Structured data untuk mesin pencari — tidak terlihat pengguna.
          `<` di-escape supaya judul/deskripsi yang mengandung "</script>"
          tidak bisa memutus tag script ini (XSS via JSON-LD). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <main className="shell w-full pb-[190px] pt-3 md:pb-24 md:pt-7">
        <Breadcrumb
          className="mb-5 md:mb-7"
          items={[
            { label: "Katalog", href: "/" },
            ...(d.category_name
              ? [{ label: d.category_name, href: `/?kategori=${encodeURIComponent(d.category_id ?? "")}` }]
              : []),
            ...(d.regency_name
              ? [{
                  label: d.district_name ? `${d.district_name}, ${d.regency_name}` : d.regency_name,
                  href: `/?regency=${encodeURIComponent(d.regency_code ?? "")}`,
                }]
              : []),
            { label: d.title },
          ]}
        />

        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)] lg:gap-12">
          <div className={sudahDiambil ? "opacity-70" : ""}>
            <MediaCarousel foto={d.images} judul={d.title} />
          </div>

          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              {d.category_name && <Badge varian="netral">{d.category_name}</Badge>}
              <Badge varian="kondisi">{LABEL_KONDISI[d.condition] ?? d.condition}</Badge>
              {sudahDiambil && <Badge varian="taken">SUDAH DIAMBIL</Badge>}
              {status === "EXPIRED" && <Badge varian="netral">WAKTU HABIS</Badge>}
            </div>

            <h1 className="mt-4 font-display text-judul-hero font-bold text-ink">
              {d.title}
            </h1>

            <div className="mt-4">
              {d.is_free ? (
                <span className="font-display text-[30px] font-bold leading-none tracking-tight text-primary-dark">
                  Gratis
                </span>
              ) : (
                <span className="font-display text-[30px] font-bold leading-none tracking-tight tabular-nums text-ink sm:text-[34px]">
                  {formatRupiah(d.price)}
                </span>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-y border-line py-4 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-mono">Kondisi</p>
                <p className="mt-1 text-[13px] font-medium text-ink">
                  {LABEL_KONDISI[d.condition] ?? d.condition}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-mono">Lokasi</p>
                <p className="mt-1 truncate text-[13px] font-medium text-ink">{d.regency_name}</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-mono">Batas pengambilan</p>
                <p className="mt-1 text-[13px] font-medium text-ink">{formatTanggalID(d.deadline_date)}</p>
              </div>
            </div>

            <div className="mt-5 hidden md:block">
              <DetailActions listingId={d.id} deadline={d.deadline_date} status={status} />
            </div>

            {/* Saluran laporan penyalahgunaan — ditaruh di kolom info supaya
                terlihat tanpa mengganggu CTA utama. */}
            <ReportButton listingId={d.id} />
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:mt-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <section className="rounded-lg border border-line bg-surface p-5 md:p-6" aria-labelledby="deskripsi-heading">
            <h2 id="deskripsi-heading" className="text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-mono">
              Deskripsi &amp; kondisi
            </h2>
            <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-ink">
              {d.description}
            </p>
          </section>

          <section className="rounded-lg border border-line bg-surface p-5 md:p-6" aria-labelledby="penjemputan-heading">
            <h2 id="penjemputan-heading" className="text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-mono">
              Penjemputan
            </h2>
            <div className="mt-4 flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <IconPin size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] text-ink-secondary">Patokan lokasi</p>
                <p className="mt-0.5 text-[14px] font-medium text-ink">{d.pickup_landmark}</p>
                <p className="mt-1 text-[12px] text-ink-secondary">
                  {d.district_name ? `${d.district_name}, ${d.regency_name}` : d.regency_name}
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2.5 border-t border-line pt-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface2 text-[12px] font-semibold text-ink-secondary">
                {d.seller_name.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <p className="text-[11px] text-ink-secondary">Dipasang oleh</p>
                <p className="text-[13px] font-medium text-ink">{d.seller_name}</p>
              </div>
            </div>
          </section>
        </div>

        <ProductRecommendations data={rekomendasi.data} dariLapak={rekomendasi.dariLapak} />
      </main>

      <div
        className="fixed inset-x-0 z-20 border-t border-line bg-surface p-3 md:hidden"
        style={{ bottom: "calc(60px + env(safe-area-inset-bottom))" }}
      >
        <DetailActions listingId={d.id} deadline={d.deadline_date} status={status} ringkas />
      </div>
    </>
  );
}
