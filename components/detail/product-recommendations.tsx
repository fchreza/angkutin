"use client";

import Link from "next/link";
import { ListingCard } from "@/components/feed/listing-card";
import { IconChevronRight } from "@/components/shared/icons";
import type { KartuListing } from "@/lib/listing-query";

export function ProductRecommendations({
  data,
  dariLapak,
}: {
  data: KartuListing[];
  dariLapak: boolean;
}) {
  if (data.length === 0) return null;

  const params = new URLSearchParams();
  if (data[0].category_id) params.set("kategori", data[0].category_id);
  if (data[0].regency_code) params.set("regency", data[0].regency_code);
  const href = params.size > 0 ? `/?${params.toString()}` : "/";

  return (
    <section aria-labelledby="rekomendasi-heading" className="mt-12 border-t border-line pt-8 md:mt-16 md:pt-10">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-mono">
            Temukan barang lainnya
          </p>
          <h2 id="rekomendasi-heading" className="font-display text-judul-sedang font-bold text-ink">
            {dariLapak ? "Lainnya di lapak ini" : "Barang serupa di sekitar"}
          </h2>
        </div>
        <Link
          href={href}
          className="group mb-0.5 inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Jelajahi katalog
          <IconChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 md:gap-4">
        {data.map((item) => (
          <ListingCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
