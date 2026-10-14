"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { FilterPills, type Kategori } from "@/components/feed/filter-pills";
import { SearchControl } from "@/components/feed/search-control";
import { ListingCard } from "@/components/feed/listing-card";
import { Reveal } from "@/components/shared/skeleton-card";
import { MuatHalaman } from "@/components/shared/apple-breathe";
import { Select } from "@/components/shared/select";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/shared/button";
import {
  LocationPicker,
  type WilayahAdaBarang,
  type PilihanLokasi,
} from "@/components/feed/location-picker";
import {
  IconInbox,
  IconX,
  IconPin,
} from "@/components/shared/icons";
import type { KartuListing } from "@/lib/listing-query";
import { bacaCacheFeed, simpanCacheFeed } from "@/lib/feed-cache";

type Sort = "mendesak" | "terbaru" | "termurah" | "gratis";

const OPSI_SORT: { id: Sort; label: string }[] = [
  { id: "mendesak", label: "Paling Mendesak" },
  { id: "terbaru", label: "Terbaru" },
  { id: "termurah", label: "Harga Terendah" },
  { id: "gratis", label: "Gratis dulu" },
];

const KUNCI_TERAKHIR = "angkutin:lokasi-terakhir";

/**
 * Jumlah barang per pemuatan.
 *
 * Harus SAMA dengan `limit` di app/page.tsx dan di lib/listing-query.ts
 * (batas maksimum 60). Kalau berbeda, penambahan berikutnya akan melewatkan
 * atau mengulang barang.
 */
const UKURAN_HALAMAN = 24;

function lokasiDariFilter(
  wilayah: WilayahAdaBarang[],
  regency: string,
  province: string,
): PilihanLokasi {
  if (regency) {
    for (const prov of wilayah) {
      const kab = prov.kabupaten.find((k) => k.regency_code === regency);
      if (kab) return { jenis: "regency", kode: regency, label: `${kab.regency_name}, ${prov.province_name}` };
    }
  }
  if (province) {
    const prov = wilayah.find((p) => p.province_code === province);
    if (prov) return { jenis: "province", kode: province, label: prov.province_name };
  }
  return { jenis: "semua", label: "Semua Lokasi" };
}

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
  kategoriAwal = "semua",
  regencyAwal = "",
  provinsiAwal = "",
  queryAwal = "",
  sortAwal = "mendesak",
}: {
  wilayah: WilayahAdaBarang[];
  kategori: Kategori[];
  feedAwal: KartuListing[];
  totalAwal: number;
  /** Filter awal dari URL (?kategori=) — dipakai remah navigasi. */
  kategoriAwal?: string;
  /** Filter awal dari URL (?regency=) — dipakai remah navigasi. */
  regencyAwal?: string;
  provinsiAwal?: string;
  queryAwal?: string;
  sortAwal?: Sort;
}) {
  const [lokasi, setLokasi] = useState<PilihanLokasi>(() => lokasiDariFilter(wilayah, regencyAwal, provinsiAwal));
  const [panelBuka, setPanelBuka] = useState(false);
  const [terakhir, setTerakhir] = useState<PilihanLokasi | null>(null);

  const [kategoriId, setKategoriId] = useState(kategoriAwal);
  const [sort, setSort] = useState<Sort>(sortAwal);
  const [q, setQ] = useState(queryAwal);
  const [qDebounce, setQDebounce] = useState(queryAwal.trim());

  const [data, setData] = useState<KartuListing[]>(feedAwal);
  const [total, setTotal] = useState(totalAwal);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  /*
   * `memuatLagi` dipisah dari `memuat`.
   *
   * KENAPA: keduanya menandai hal yang berbeda. `memuat` berarti hasilnya
   * diganti (filter berubah), jadi gridnya boleh hilang dan loader besar
   * muncul. `memuatLagi` berarti hasilnya DITAMBAH, jadi grid yang sudah ada
   * harus tetap terlihat dan hanya tombolnya yang berubah. Memakai satu state
   * untuk keduanya akan membuat grid berkedip hilang setiap kali menekan
   * "muat lebih banyak".
   */
  const [memuatLagi, setMemuatLagi] = useState(false);
  const [galatLagi, setGalatLagi] = useState<string | null>(null);

  const pertama = useRef(true);

  // Kalau filter awal datang dari URL, data awalnya juga sudah tersaring di
  // server — jadi fetch pertama tetap boleh dilewati. Tapi penanda "pertama"
  // harus tetap benar saat URL berubah tanpa mount ulang.
  const filterAwalRef = useRef(`${kategoriAwal}|${regencyAwal}|${provinsiAwal}|${queryAwal}|${sortAwal}`);
  useEffect(() => {
    const sekarang = `${kategoriAwal}|${regencyAwal}|${provinsiAwal}|${queryAwal}|${sortAwal}`;
    if (sekarang !== filterAwalRef.current) {
      filterAwalRef.current = sekarang;
      setKategoriId(kategoriAwal);
      setLokasi(lokasiDariFilter(wilayah, regencyAwal, provinsiAwal));
      setQ(queryAwal);
      setQDebounce(queryAwal.trim());
      setSort(sortAwal);
    }
  }, [kategoriAwal, regencyAwal, provinsiAwal, queryAwal, sortAwal, wilayah]);

  // Tombol Back/Forward memulihkan semua filter dan mengulang query feed.
  useEffect(() => {
    const pulihkan = () => {
      const p = new URLSearchParams(window.location.search);
      const kategoriUrl = p.get("kategori") ?? "semua";
      const regencyUrl = p.get("regency") ?? "";
      const provinsiUrl = p.get("provinsi") ?? "";
      const queryUrl = p.get("q") ?? "";
      const sortUrl = p.get("sort") ?? "mendesak";
      setKategoriId(kategoriUrl);
      setLokasi(lokasiDariFilter(wilayah, regencyUrl, provinsiUrl));
      setQ(queryUrl);
      setQDebounce(queryUrl.trim());
      setSort(((["mendesak", "terbaru", "termurah", "gratis"].includes(sortUrl) ? sortUrl : "mendesak") as Sort));
    };
    window.addEventListener("popstate", pulihkan);
    return () => window.removeEventListener("popstate", pulihkan);
  }, [wilayah]);

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

  // Cache hasil per filter dibatasi TTL 15 dtk dan jumlah entri; mutasi
  // listing mengosongkannya melalui invalidasi global.
  // Permintaan yang sedang jalan — dibatalkan kalau filter berubah lagi,
  // supaya balasan lama tidak menimpa hasil filter yang lebih baru.
  const abortRef = useRef<AbortController | null>(null);
  // Skeleton hanya muncul kalau pemuatan benar-benar lambat. Tanpa ini,
  // pemuatan 200 ms tetap memunculkan skeleton sekejap — justru terasa
  // berkedip dan lebih lambat daripada tidak ada indikator sama sekali.
  const timerSkeleton = useRef<ReturnType<typeof setTimeout> | null>(null);

  const kunciFilter = useMemo(() => {
    const p = new URLSearchParams();
    if (lokasi.jenis === "regency" && lokasi.kode) p.set("regency_code", lokasi.kode);
    else if (lokasi.jenis === "province" && lokasi.kode) p.set("province_code", lokasi.kode);
    if (kategoriId !== "semua") p.set("category_id", kategoriId);
    if (qDebounce) p.set("q", qDebounce);
    p.set("sort", sort);
    return p.toString();
  }, [lokasi, kategoriId, qDebounce, sort]);
  // Hasil SSR hanya cocok untuk filter yang dipakai saat server membuatnya.
  // Jangan gunakan `kunciFilter` aktif di efek cache di bawah: saat pengguna
  // mengubah filter, itu akan menaruh feed awal di bawah kunci filter baru.
  const kunciFeedAwal = useMemo(() => {
    const p = new URLSearchParams();
    if (regencyAwal) p.set("regency_code", regencyAwal);
    else if (provinsiAwal) p.set("province_code", provinsiAwal);
    if (kategoriAwal !== "semua") p.set("category_id", kategoriAwal);
    const kueri = queryAwal.trim();
    if (kueri) p.set("q", kueri);
    p.set("sort", sortAwal);
    return p.toString();
  }, [regencyAwal, provinsiAwal, kategoriAwal, queryAwal, sortAwal]);
  const filterAktifRef = useRef(kunciFilter);
  filterAktifRef.current = kunciFilter;

  // URL menjadi state yang dapat dibagikan/bookmark, tanpa navigasi full page.
  useEffect(() => {
    const p = new URLSearchParams();
    if (kategoriId !== "semua") p.set("kategori", kategoriId);
    if (lokasi.jenis === "regency" && lokasi.kode) p.set("regency", lokasi.kode);
    if (lokasi.jenis === "province" && lokasi.kode) p.set("provinsi", lokasi.kode);
    if (qDebounce) p.set("q", qDebounce);
    if (sort !== "mendesak") p.set("sort", sort);
    const query = p.toString();
    const href = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", href);
  }, [kategoriId, lokasi, qDebounce, sort]);

  // Cache SSR awal agar kembali ke filter asal tidak memanggil endpoint lagi.
  useEffect(() => {
    simpanCacheFeed(kunciFeedAwal, { data: feedAwal, total: totalAwal });
  }, [kunciFeedAwal, feedAwal, totalAwal]);

  const muat = useCallback(async () => {
    const kunci = kunciFilter;

    abortRef.current?.abort();
    if (timerSkeleton.current) clearTimeout(timerSkeleton.current);
    const ac = new AbortController();
    abortRef.current = ac;
    setMemuatLagi(false);
    setGalatLagi(null);

    // 1. Hasil sudah ada di cache -> tampilkan seketika, tidak ada skeleton.
    const tersimpan = bacaCacheFeed(kunci);
    if (tersimpan) {
      setData(tersimpan.data);
      setTotal(tersimpan.total);
      setGalat(null);
      setMemuat(false);
      if (abortRef.current === ac) abortRef.current = null;
      return;
    }

    // 3. Skeleton baru muncul setelah 150 ms. Pemuatan yang lebih cepat dari
    //    itu tidak perlu indikator apa pun.
    if (timerSkeleton.current) clearTimeout(timerSkeleton.current);
    timerSkeleton.current = setTimeout(() => {
      if (abortRef.current === ac) setMemuat(true);
    }, 150);
    setGalat(null);

    try {
      const r = await fetch(`/api/v1/listings?${kunci}`, {
        signal: ac.signal,
        cache: "no-store",
      });
      if (!r.ok) throw new Error("gagal");
      const j = (await r.json()) as { data: KartuListing[]; total: number };
      if (ac.signal.aborted || filterAktifRef.current !== kunci) return;
      simpanCacheFeed(kunci, { data: j.data, total: j.total });
      setData(j.data);
      setTotal(j.total);
    } catch (e) {
      // Abort bukan kegagalan — permintaan yang lebih baru sudah menggantikan.
      if (ac.signal.aborted || (e as { name?: string })?.name === "AbortError") return;
      setGalat("Gagal memuat barang. Periksa koneksi lalu coba lagi.");
    } finally {
      if (abortRef.current === ac) {
        if (timerSkeleton.current) clearTimeout(timerSkeleton.current);
        setMemuat(false);
        abortRef.current = null;
      }
    }
  }, [kunciFilter]);

  /**
   * Muat halaman BERIKUTNYA dan tambahkan ke daftar yang sudah ada.
   *
   * KENAPA DITAMBAH, BUKAN DIGANTI: pengguna sudah menggulir dan sudah
   * menemukan barang yang dia minati. Kalau daftarnya diganti, posisi
   * gulirnya melompat dan barang yang tadi dia lihat hilang dari layar.
   *
   * KENAPA TIDAK MEMAKAI CACHE: cache di atas menyimpan hasil PER FILTER,
   * bukan per halaman. Menambahkan halaman ke cache akan membuat pemuatan
   * berikutnya menampilkan sebagian saja tanpa penanda, jadi hasil
   * gabungannya sengaja tidak dimasukkan ke cache. Yang di-cache tetap
   * halaman pertama, dan itu yang paling sering dipakai ulang.
   */
  const muatLagi = useCallback(async () => {
    if (memuatLagi || data.length >= total) return;
    setMemuatLagi(true);
    setGalatLagi(null);

    const p = new URLSearchParams(kunciFilter);
    p.set("offset", String(data.length));
    p.set("limit", String(UKURAN_HALAMAN));

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const r = await fetch(`/api/v1/listings?${p.toString()}`, {
        signal: ac.signal,
        cache: "no-store",
      });
      if (!r.ok) throw new Error("gagal");
      const j = (await r.json()) as { data: KartuListing[]; total: number };
      if (ac.signal.aborted || filterAktifRef.current !== kunciFilter) return;

      /*
       * Saring barang yang sudah ada berdasarkan id.
       *
       * KENAPA PERLU: barang bisa ditambahkan orang lain di antara dua
       * pemuatan. Kalau itu terjadi, pergeseran hasil membuat satu barang
       * yang sama muncul di dua halaman berturut-turut, dan React akan
       * mengeluh karena ada dua elemen dengan key yang sama.
       */
      setData((lama) => {
        const sudahAda = new Set(lama.map((x) => x.id));
        return [...lama, ...j.data.filter((x) => !sudahAda.has(x.id))];
      });
      setTotal(j.total);
    } catch {
      if (ac.signal.aborted) return;
      setGalatLagi("Gagal memuat barang berikutnya.");
    } finally {
      if (abortRef.current === ac) {
        setMemuatLagi(false);
        abortRef.current = null;
      }
    }
  }, [kunciFilter, data.length, total, memuatLagi]);

  // Lewati fetch pertama (data awal sudah dari server)
  useEffect(() => {
    if (pertama.current) {
      pertama.current = false;
      return;
    }
    void muat();
  }, [muat]);

  // Bersihkan timer & batalkan permintaan saat komponen dilepas.
  useEffect(() => {
    return () => {
      if (timerSkeleton.current) clearTimeout(timerSkeleton.current);
      abortRef.current?.abort();
    };
  }, []);

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
      {/* relative: jangkar untuk panel lokasi yang mengambang */}
      <div className="relative">
      {/* Header katalog: pencarian terpadu dan navigasi kategori. */}
      <div className="sticky top-[64px] z-20 -mx-4 mb-4 border-b border-line bg-appbg/95 px-4 pb-2 pt-2 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:pb-4 md:pt-0 md:backdrop-blur-none">
        <SearchControl
          q={q}
          onQueryChange={setQ}
          onCari={() => setQDebounce(q.trim())}
          lokasi={lokasi}
          panelBuka={panelBuka}
          onToggleLokasi={() => setPanelBuka((v) => !v)}
          kategori={kategori}
          kategoriId={kategoriId}
          onKategoriChange={setKategoriId}
        />
        <div className="mt-2">
          <FilterPills kategori={kategori} aktif={kategoriId} onPilih={setKategoriId} />
        </div>
      </div>

      {/* Panel pemilih lokasi.
          PENTING: panel ini MENGAMBANG di atas konten, tidak mendorongnya.
          Sebelumnya panel ikut mengalir di dalam tata letak, sehingga membuka
          pemilih lokasi menggeser seluruh katalog turun ~384px dan membuat
          layar terasa "bergerak" (CLS 0,18 — di atas ambang buruk Google).
          Dengan posisi absolut, katalog tidak bergerak sama sekali. */}
      {panelBuka && (
        <>
          {/* Penutup transparan: klik di luar panel menutupnya. */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setPanelBuka(false)}
            aria-hidden
          />
          <div className="absolute left-4 right-4 top-[168px] z-40 animate-slide-down md:left-0 md:right-auto md:top-[128px] md:w-[380px]">
            <LocationPicker
              wilayah={wilayah}
              nilai={lokasi}
              onPilih={terapkanLokasi}
              onTutup={() => setPanelBuka(false)}
            />
          </div>
        </>
      )}

      {/* Ringkasan hasil, pintasan lokasi, dan urutan. */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-[12.5px]">
          <span className="text-ink-secondary" aria-live="polite">
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

          {/* Pintasan lokasi terakhir tetap memerlukan tindakan eksplisit. */}
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

        <Select
          nilai={sort}
          onUbah={(v) => setSort(v as Sort)}
          aria-label="Urutkan"
          opsi={OPSI_SORT.map((o) => ({ value: o.id, label: o.label }))}
          className="ml-auto w-[176px] shrink-0"
          triggerClassName="h-10 rounded-full border-line bg-surface px-3 text-[12.5px] font-semibold"
        />
      </div>

      {/* Konten */}
      {memuat ? (
        /*
         * Memakai loader "napas", bukan skeleton grid.
         *
         * Skeleton grid menjanjikan tata letak: jumlah dan posisi kotaknya
         * seolah-olah menggambarkan hasil yang akan datang. Padahal filter
         * bisa menghasilkan 3 kartu atau 0 kartu, jadi skeleton dengan 8
         * kotak justru membuat tata letak melompat saat data asli tiba —
         * dan itu lebih terasa mengganggu daripada indikator yang jujur
         * tidak menjanjikan apa pun.
         */
        <MuatHalaman teks="Memuat barang…" />
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
        <Reveal kunci={`${lokasi.jenis}-${lokasi.kode ?? ""}-${kategoriId}-${qDebounce}-${sort}-${data.length}`}>
          <div className="grid-katalog">
            {data.map((item, i) => (
              <div
                key={item.id}
                className="animate-list-in"
                // Stagger dibatasi 8 item pertama; lebih dari itu animasinya
                // terasa lambat dan tidak berguna karena sudah di luar layar.
                style={{ "--d": `${Math.min(i, 8) * 35}ms` } as React.CSSProperties}
              >
                <ListingCard item={item} />
              </div>
            ))}
          </div>

          {/*
            Tombol muat berikutnya.

            KENAPA TOMBOL, BUKAN GULIR TAK TERBATAS:
            Gulir tak terbatas menghilangkan kemampuan melihat akhir daftar,
            dan itu merugikan di katalog barang pindahan yang justru penting
            untuk ditelusuri sampai habis. Tombol memberi tahu dengan jujur
            bahwa masih ada sisa, dan berapa banyak.

            Tombol ini juga satu-satunya jalan melihat barang ke-25 dan
            seterusnya: sebelumnya katalog dipotong di 24 tanpa cara apa pun
            untuk melanjutkan.
          */}
          {data.length < total && (
            <div className="mt-8 flex flex-col items-center gap-3">
              {galatLagi && (
                <p className="text-[14px] text-danger" role="alert">
                  {galatLagi}
                </p>
              )}
              <Button
                varian="outline"
                ukuran="lg"
                memuat={memuatLagi}
                onClick={() => void muatLagi()}
              >
                {memuatLagi
                  ? "Memuat…"
                  : `Tampilkan ${Math.min(UKURAN_HALAMAN, total - data.length)} barang lagi`}
              </Button>
              <p className="text-[14px] text-ink-secondary" aria-live="polite">
                Menampilkan {data.length} dari {total} barang
              </p>
            </div>
          )}
        </Reveal>
      )}
      </div>
    </>
  );
}
