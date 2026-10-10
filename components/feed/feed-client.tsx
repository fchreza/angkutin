"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { ClusterSelector, type Kluster } from "@/components/feed/cluster-selector";
import { FilterPills, type Kategori } from "@/components/feed/filter-pills";
import { ListingCard } from "@/components/feed/listing-card";
import { SkeletonGrid } from "@/components/shared/skeleton-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/shared/button";
import { IconSearch, IconInbox, IconX } from "@/components/shared/icons";
import { cn } from "@/lib/cn";
import type { KartuListing } from "@/lib/listing-query";

type Sort = "mendesak" | "terbaru" | "termurah" | "gratis";

const OPSI_SORT: { id: Sort; label: string }[] = [
  { id: "mendesak", label: "Paling Mendesak" },
  { id: "terbaru", label: "Terbaru" },
  { id: "termurah", label: "Harga Terendah" },
  { id: "gratis", label: "Gratis dulu" },
];

const KUNCI_KLUSTER = "angkutin:kluster";

/**
 * Feed Katalog (Layar 1) — komponen interaktif.
 *
 * Semua filter disimpan di state dan memicu fetch ke /api/v1/listings.
 * Kluster terakhir disimpan di localStorage (FR-1).
 *
 * Skeleton ditampilkan saat memuat — bukan halaman kosong — supaya
 * tata letak tidak melompat (checklist: semua state wajib ada).
 */
export function FeedClient({
  kluster,
  kategori,
  klusterAwal,
  feedAwal,
  totalAwal,
}: {
  kluster: Kluster[];
  kategori: Kategori[];
  klusterAwal: string;
  feedAwal: KartuListing[];
  totalAwal: number;
}) {
  const [klusterId, setKlusterId] = useState(klusterAwal);
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

  // Simpan preferensi kluster (FR-1: disimpan di local storage)
  useEffect(() => {
    try {
      localStorage.setItem(KUNCI_KLUSTER, klusterId);
    } catch {
      /* mode privat / storage penuh — abaikan */
    }
  }, [klusterId]);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);
    try {
      const p = new URLSearchParams();
      if (klusterId && klusterId !== "semua") p.set("cluster_id", klusterId);
      if (kategoriId !== "semua") p.set("category_id", kategoriId);
      if (qDebounce) p.set("q", qDebounce);
      p.set("sort", sort);

      const r = await fetch(`/api/v1/listings?${p.toString()}`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error("gagal");
      const j = (await r.json()) as { data: KartuListing[]; total: number };
      setData(j.data);
      setTotal(j.total);
    } catch {
      setGalat("Gagal memuat barang. Periksa koneksi lalu coba lagi.");
    } finally {
      setMemuat(false);
    }
  }, [klusterId, kategoriId, qDebounce, sort]);

  // Lewati fetch pertama (data awal sudah dari server)
  useEffect(() => {
    if (pertama.current) {
      pertama.current = false;
      return;
    }
    void muat();
  }, [muat]);

  const adaFilter = kategoriId !== "semua" || qDebounce.length > 0;

  return (
    <>
      {/* Header filter — sticky di mobile supaya selalu terjangkau */}
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-line bg-appbg/95 px-4 pb-3 pt-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:pb-4 md:pt-0 md:backdrop-blur-none">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center">
          <ClusterSelector
            kluster={kluster}
            aktif={klusterId}
            onPilih={setKlusterId}
            className="md:w-[280px]"
          />

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

      {/* Ringkasan hasil */}
      <div className="mb-3 flex items-center justify-between text-[12.5px] text-ink-secondary">
        <span>
          {memuat ? "Memuat…" : `${total} barang ditemukan`}
          {qDebounce && !memuat ? ` untuk "${qDebounce}"` : ""}
        </span>
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
              : "Belum ada barang di kluster ini"
          }
          keterangan={
            qDebounce
              ? "Coba kata kunci lain, atau lihat semua kategori."
              : "Jadilah yang pertama memasang barang di wilayah ini."
          }
          aksi={
            adaFilter ? (
              <Button
                varian="outline"
                onClick={() => {
                  setQ("");
                  setKategoriId("semua");
                }}
              >
                Hapus filter
              </Button>
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
