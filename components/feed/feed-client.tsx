"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { FilterPills, type Kategori } from "@/components/feed/filter-pills";
import { ListingCard } from "@/components/feed/listing-card";
import { SkeletonGrid } from "@/components/shared/skeleton-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/shared/button";
import {
  LocationPicker,
  type WilayahAdaBarang,
  type PilihanLokasi,
} from "@/components/feed/location-picker";
import {
  IconSearch,
  IconInbox,
  IconX,
  IconPin,
  IconChevronDown,
} from "@/components/shared/icons";
import { cn } from "@/lib/cn";
import type { KartuListing } from "@/lib/listing-query";

type Sort = "mendesak" | "terbaru" | "termurah" | "gratis";

const OPSI_SORT: { id: Sort; label: string }[] = [
  { id: "mendesak", label: "Paling Mendesak" },
  { id: "terbaru", label: "Terbaru" },
  { id: "termurah", label: "Harga Terendah" },
  { id: "gratis", label: "Gratis dulu" },
];

const KUNCI_TERAKHIR = "angkutin:lokasi-terakhir";

/**
 * Feed Katalog (Layar 1).
 *
 * Aturan lokasi (disepakati dengan pemilik produk):
 *  - Default SELALU "Semua Lokasi" — seluruh katalog terlihat. Tidak ada
 *    penyaringan otomatis berdasarkan kunjungan sebelumnya.
 *  - Pilihan terakhir disimpan hanya sebagai jalan pintas; pengguna harus
 *    menekannya sendiri untuk menerapkannya.
 *  - "Gunakan Lokasi Saya" hanya membaca lokasi saat ditekan.
 */
export function FeedClient({
  wilayah,
  kategori,
  feedAwal,
  totalAwal,
}: {
  wilayah: WilayahAdaBarang[];
  kategori: Kategori[];
  feedAwal: KartuListing[];
  totalAwal: number;
}) {
  const [lokasi, setLokasi] = useState<PilihanLokasi>({
    jenis: "semua",
    label: "Semua Lokasi",
  });
  const [panelBuka, setPanelBuka] = useState(false);
  const [terakhir, setTerakhir] = useState<PilihanLokasi | null>(null);

  const [kategoriId, setKategoriId] = useState("semua");
  const [sort, setSort] = useState<Sort>("mendesak");
  const [q, setQ] = useState("");
  const [qDebounce, setQDebounce] = useState("");

  const [data, setData] = useState<KartuListing[]>(feedAwal);
  const [total, setTotal] = useState(totalAwal);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const pertama = useRef(true);

  // Debounce pencarian 350ms — supaya tidak fetch tiap ketikan
  useEffect(() => {
    const t = setTimeout(() => setQDebounce(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  // Baca pilihan terakhir HANYA untuk chip pintasan — tidak diterapkan.
  useEffect(() => {
    try {
      const s = localStorage.getItem(KUNCI_TERAKHIR);
      if (s) {
        const p = JSON.parse(s) as PilihanLokasi;
        if (p && p.jenis !== "semua") setTerakhir(p);
      }
    } catch {
      /* mode privat / data rusak — abaikan */
    }
  }, []);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);
    try {
      const p = new URLSearchParams();
      if (lokasi.jenis === "regency" && lokasi.kode) p.set("regency_code", lokasi.kode);
      else if (lokasi.jenis === "province" && lokasi.kode) p.set("province_code", lokasi.kode);
      if (kategoriId !== "semua") p.set("category_id", kategoriId);
      if (qDebounce) p.set("q", qDebounce);
      p.set("sort", sort);

      const r = await fetch(`/api/v1/listings?${p.toString()}`, { cache: "no-store" });
      if (!r.ok) throw new Error("gagal");
      const j = (await r.json()) as { data: KartuListing[]; total: number };
      setData(j.data);
      setTotal(j.total);
    } catch {
      setGalat("Gagal memuat barang. Periksa koneksi lalu coba lagi.");
    } finally {
      setMemuat(false);
    }
  }, [lokasi, kategoriId, qDebounce, sort]);

  // Lewati fetch pertama (data awal sudah dari server)
  useEffect(() => {
    if (pertama.current) {
      pertama.current = false;
      return;
    }
    void muat();
  }, [muat]);

  const terapkanLokasi = (p: PilihanLokasi) => {
    setLokasi(p);
    setPanelBuka(false);
    if (p.jenis === "semua") {
      try {
        localStorage.removeItem(KUNCI_TERAKHIR);
      } catch {
        /* abaikan */
      }
      setTerakhir(null);
    } else {
      try {
        localStorage.setItem(KUNCI_TERAKHIR, JSON.stringify(p));
      } catch {
        /* abaikan */
      }
      setTerakhir(p);
    }
  };

  const adaFilter =
    kategoriId !== "semua" || qDebounce.length > 0 || lokasi.jenis !== "semua";

  return (
    <>
      {/* Header filter — sticky di mobile supaya selalu terjangkau */}
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-line bg-appbg/95 px-4 pb-3 pt-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:pb-4 md:pt-0 md:backdrop-blur-none">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center">
          {/* Tombol lokasi */}
          <button
            type="button"
            onClick={() => setPanelBuka((v) => !v)}
            aria-expanded={panelBuka}
            className={cn(
              "flex h-11 shrink-0 items-center justify-between gap-2 rounded-md border px-3 text-left transition-colors md:w-[260px]",
              lokasi.jenis === "semua"
                ? "border-line bg-surface hover:border-primary/40"
                : "border-primary bg-primary-soft",
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <IconPin
                size={16}
                className={lokasi.jenis === "semua" ? "text-ink-secondary" : "text-primary"}
              />
              <span className="min-w-0">
                <span className="block text-[10.5px] uppercase tracking-wide text-ink-secondary">
                  Lokasi
                </span>
                <span className="block truncate text-[13px] font-semibold text-ink">
                  {lokasi.label}
                </span>
              </span>
            </span>
            <IconChevronDown
              size={15}
              className={cn(
                "shrink-0 text-ink-secondary transition-transform",
                panelBuka && "rotate-180",
              )}
            />
          </button>

          <div className="relative flex-1">
            <IconSearch
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari barang atau patokan lokasi…"
              aria-label="Cari barang"
              className={cn(
                "h-11 w-full rounded-md border border-line bg-surface pl-10 pr-9",
                "text-[14px] text-ink placeholder:text-ink-secondary/70",
                "focus:border-primary focus:outline-none",
              )}
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Hapus pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-secondary hover:bg-appbg"
              >
                <IconX size={15} />
              </button>
            )}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="Urutkan"
            className="h-11 shrink-0 rounded-md border border-line bg-surface px-3 text-[13.5px] font-medium text-ink focus:border-primary focus:outline-none md:w-[190px]"
          >
            {OPSI_SORT.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <FilterPills kategori={kategori} aktif={kategoriId} onPilih={setKategoriId} />
      </div>

      {/* Panel pemilih lokasi */}
      {panelBuka && (
        <div className="mb-4">
          <LocationPicker
            wilayah={wilayah}
            nilai={lokasi}
            onPilih={terapkanLokasi}
            onTutup={() => setPanelBuka(false)}
          />
        </div>
      )}

      {/* Chip lokasi aktif + pintasan pilihan terakhir */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px]">
        <span className="text-ink-secondary">
          {memuat ? "Memuat…" : `${total} barang ditemukan`}
          {lokasi.jenis !== "semua" ? ` di ${lokasi.label}` : " di semua lokasi"}
          {qDebounce && !memuat ? ` untuk "${qDebounce}"` : ""}
        </span>

        {lokasi.jenis !== "semua" && (
          <button
            type="button"
            onClick={() => terapkanLokasi({ jenis: "semua", label: "Semua Lokasi" })}
            className="inline-flex items-center gap-1 rounded-pill border border-primary/30 bg-primary-soft px-2.5 py-1 text-[11.5px] font-medium text-primary-dark hover:bg-primary/15"
          >
            {lokasi.label}
            <IconX size={12} />
          </button>
        )}

        {/* Pintasan: harus ditekan, tidak pernah otomatis */}
        {terakhir && lokasi.jenis === "semua" && (
          <button
            type="button"
            onClick={() => terapkanLokasi(terakhir)}
            className="inline-flex items-center gap-1 rounded-pill border border-line bg-surface px-2.5 py-1 text-[11.5px] text-ink-secondary hover:border-primary hover:text-primary"
          >
            <IconPin size={12} />
            Pakai {terakhir.label} lagi
          </button>
        )}
      </div>

      {/* Konten */}
      {memuat ? (
        <SkeletonGrid jumlah={8} />
      ) : galat ? (
        <EmptyState
          judul="Gagal memuat barang"
          keterangan={galat}
          ikon={<IconInbox size={44} />}
          aksi={
            <Button varian="outline" onClick={() => void muat()}>
              Coba lagi
            </Button>
          }
        />
      ) : data.length === 0 ? (
        <EmptyState
          judul={
            qDebounce
              ? `Tidak ada hasil untuk "${qDebounce}"`
              : lokasi.jenis !== "semua"
                ? `Belum ada barang di ${lokasi.label}`
                : "Belum ada barang sama sekali"
          }
          keterangan={
            qDebounce
              ? "Coba kata kunci lain, atau lihat semua kategori."
              : lokasi.jenis !== "semua"
                ? "Coba lihat semua lokasi, atau jadilah yang pertama memasang barang di sini."
                : "Jadilah yang pertama memasang barang."
          }
          aksi={
            adaFilter ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {lokasi.jenis !== "semua" && (
                  <Button
                    varian="outline"
                    onClick={() => terapkanLokasi({ jenis: "semua", label: "Semua Lokasi" })}
                  >
                    Lihat semua lokasi
                  </Button>
                )}
                {(kategoriId !== "semua" || qDebounce) && (
                  <Button
                    varian="ghost"
                    onClick={() => {
                      setQ("");
                      setKategoriId("semua");
                    }}
                  >
                    Hapus filter lain
                  </Button>
                )}
              </div>
            ) : (
              <Link href="/pasang">
                <Button>+ Pasang Barang</Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {data.map((item) => (
            <ListingCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  );
}
