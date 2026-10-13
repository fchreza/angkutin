"use client";

import { useMemo } from "react";
import { Badge } from "@/components/shared/badge";
import { IconPin, IconClock } from "@/components/shared/icons";
import { formatRupiah } from "@/lib/format";
import { LABEL_KONDISI } from "@/lib/urgency";
import { cn } from "@/lib/cn";
import type { FotoSiap } from "./photo-uploader";

/**
 * Live preview kartu (desktop, Layar 3).
 *
 * Menampilkan persis seperti kartu di feed supaya penjual tahu bagaimana
 * barangnya akan terlihat sebelum menayangkan.
 */
export function LivePreview({
  foto,
  judul,
  harga,
  gratis,
  kondisi,
  wilayahNama,
  patokan,
  tenggat,
}: {
  foto: FotoSiap[];
  judul: string;
  harga: string;
  gratis: boolean;
  kondisi: string;
  wilayahNama: string;
  patokan: string;
  tenggat: string;
}) {
  const angkaHarga = useMemo(
    () => Number((harga || "0").replace(/\./g, "")),
    [harga],
  );

  return (
    <div className="sticky top-20">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[12.5px] font-bold uppercase tracking-wider text-ink-secondary">
          Pratinjau
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="overflow-hidden rounded-md border border-line bg-surface shadow-card">
        <div className="relative aspect-square w-full bg-appbg">
          {foto[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={foto[0].preview}
              alt="Pratinjau foto utama"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[14px] text-ink-secondary">
              Foto belum dipilih
            </div>
          )}

          <div className="absolute bottom-2 left-2">
            {gratis ? (
              <Badge varian="gratis" className="px-2.5 py-1 shadow-card">
                GRATIS
              </Badge>
            ) : (
              <span className="inline-block rounded-pill bg-white px-2.5 py-1 text-[14px] font-bold text-scrim shadow-card">
                {angkaHarga > 0 ? formatRupiah(angkaHarga) : "Rp 0"}
              </span>
            )}
          </div>

          {foto.length > 1 && (
            <span className="absolute right-2 top-2 rounded-pill bg-scrim/80 px-2 py-[3px] text-[11px] font-medium text-white">
              {foto.length} foto
            </span>
          )}
        </div>

        <div className="space-y-2 p-3">
          <h3 className="clamp-2 font-display text-[14px] font-semibold leading-snug text-ink">
            {judul || "Judul barang belum diisi"}
          </h3>

          <div className="flex items-center gap-1 text-[14px] text-ink-secondary">
            <IconPin size={12} />
            <span className="truncate">
              {patokan || wilayahNama || "Patokan lokasi belum diisi"}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {kondisi && (
              <Badge varian="kondisi" className="text-[11px]">
                {LABEL_KONDISI[kondisi] ?? kondisi}
              </Badge>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-pill border border-line bg-appbg px-2 py-[3px] text-[11px] text-ink-secondary",
              )}
            >
              <IconClock size={11} />
              {tenggat ? `Sampai ${tenggat}` : "Tenggat belum dipilih"}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[14px] leading-relaxed text-ink-secondary">
        Beginilah barangmu akan tampil di katalog.
      </p>
    </div>
  );
}
