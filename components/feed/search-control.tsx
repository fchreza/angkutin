"use client";

import { Select } from "@/components/shared/select";
import {
  IconChevronDown,
  IconPin,
  IconSearch,
  IconX,
} from "@/components/shared/icons";
import type { Kategori } from "@/components/feed/filter-pills";
import type { PilihanLokasi } from "@/components/feed/location-picker";
import { cn } from "@/lib/cn";

export function SearchControl({
  q,
  onQueryChange,
  onCari,
  lokasi,
  panelBuka,
  onToggleLokasi,
  kategori,
  kategoriId,
  onKategoriChange,
}: {
  q: string;
  onQueryChange: (value: string) => void;
  onCari: () => void;
  lokasi: PilihanLokasi;
  panelBuka: boolean;
  onToggleLokasi: () => void;
  kategori: Kategori[];
  kategoriId: string;
  onKategoriChange: (id: string) => void;
}) {
  return (
    <form
      role="search"
      aria-label="Cari barang"
      onSubmit={(e) => {
        e.preventDefault();
        onCari();
      }}
      className={cn(
        "flex flex-col rounded-[26px] border border-line bg-surface p-1.5",
        "shadow-[0_2px_8px_rgb(var(--w-ink)/0.05),0_8px_24px_rgb(var(--w-ink)/0.04)]",
        "transition-colors focus-within:border-line-kuat md:h-[68px] md:flex-row md:items-center md:rounded-full md:p-1",
      )}
    >
      <div className="flex h-11 min-w-0 items-center gap-3 px-3 md:h-full md:flex-1 md:px-4">
        <IconSearch size={18} className="shrink-0 text-ink-secondary" />
        <input
          type="search"
          value={q}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onQueryChange("");
          }}
          placeholder="Cari barang atau patokan lokasi…"
          aria-label="Cari barang atau patokan lokasi"
          className={cn(
            "h-full min-w-0 w-full bg-transparent text-[16px] text-ink",
            "placeholder:text-ink-secondary/75 focus:outline-none",
            "[&::-webkit-search-cancel-button]:hidden",
          )}
        />
        {q && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Hapus pencarian"
            className="press grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-secondary hover:bg-appbg"
          >
            <IconX size={15} />
          </button>
        )}
      </div>

      <span className="mx-2 h-px bg-line md:hidden" aria-hidden="true" />
      <span className="hidden h-8 w-px bg-line md:block" aria-hidden="true" />

      <div className="flex min-w-0 items-center gap-1 md:contents">
        <button
          type="button"
          onClick={onToggleLokasi}
          aria-expanded={panelBuka}
          aria-label={`Pilih lokasi, saat ini ${lokasi.label}`}
          className={cn(
            "press flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full px-3 text-left transition-colors",
            "hover:bg-appbg md:w-[205px] md:flex-none md:px-4",
            lokasi.jenis !== "semua" && "bg-primary-soft hover:bg-primary-soft",
          )}
        >
          <IconPin
            size={16}
            className={cn("shrink-0", lokasi.jenis === "semua" ? "text-ink-secondary" : "text-primary")}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-medium uppercase leading-tight tracking-wide text-ink-secondary">
              Lokasi
            </span>
            <span className="block truncate text-[12.5px] font-semibold leading-tight text-ink">
              {lokasi.label}
            </span>
          </span>
          <IconChevronDown
            size={14}
            className={cn(
              "shrink-0 text-ink-secondary transition-transform duration-200",
              panelBuka && "rotate-180",
            )}
          />
        </button>

        <span className="hidden h-8 w-px bg-line md:block" aria-hidden="true" />

        <Select
          nilai={kategoriId}
          onUbah={onKategoriChange}
          aria-label="Kategori"
          opsi={[
            { value: "semua", label: "Semua kategori" },
            ...kategori.map((k) => ({ value: k.id, label: k.name })),
          ]}
          className="min-w-0 flex-1 md:w-[170px] md:flex-none"
          triggerClassName={cn(
            "h-11 rounded-full border-0 bg-transparent px-3 text-[13px] font-semibold",
            "hover:bg-appbg focus:ring-0 data-[state=open]:bg-appbg md:px-4",
          )}
        />

        <button
          type="submit"
          aria-label="Cari"
          className="press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-teks shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <IconSearch size={18} />
        </button>
      </div>
    </form>
  );
}
