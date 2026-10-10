"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  IconPin,
  IconChevronDown,
  IconChevronRight,
  IconX,
  IconAlert,
  IconCheck,
} from "@/components/shared/icons";
import { PROVINSI, kabupatenDari, type Wilayah } from "@/lib/wilayah";
import { deteksiLokasi } from "@/lib/geo";

export type KlusterRingkas = {
  id: string;
  name: string;
  city: string;
  province_code: string | null;
  province_name: string | null;
  regency_code: string | null;
  regency_name: string | null;
  latitude: string | null;
  longitude: string | null;
  jumlah_aktif: number;
};

export type PilihanLokasi = {
  /** "semua" | kode kabupaten | kode provinsi */
  jenis: "semua" | "regency" | "province";
  kode?: string;
  label: string;
};

/**
 * Panel pemilih lokasi (Fase 1-4).
 *
 * Aturan yang dipegang:
 *  - Default "Semua Lokasi" — seluruh katalog terlihat.
 *  - Pilihan TIDAK diterapkan otomatis dari kunjungan sebelumnya; hanya
 *    muncul sebagai chip cepat yang harus ditekan.
 *  - Tombol "Gunakan Lokasi Saya" hanya jalan saat ditekan, tidak pernah
 *    otomatis. Kalau izin ditolak, katalog tetap seperti semula.
 *  - Wilayah tanpa kluster ditandai, supaya pengguna tidak memilih wilayah
 *    mati lalu melihat katalog kosong tanpa penjelasan.
 */
export function LocationPicker({
  kluster,
  nilai,
  onPilih,
  onTutup,
}: {
  kluster: KlusterRingkas[];
  nilai: PilihanLokasi;
  onPilih: (p: PilihanLokasi) => void;
  onTutup: () => void;
}) {
  const [cari, setCari] = useState("");
  const [provinsiTerbuka, setProvinsiTerbuka] = useState<string | null>(null);
  const [gps, setGps] = useState<
    | { status: "diam" }
    | { status: "memuat" }
    | { status: "pesan"; jenis: "galat" | "info"; teks: string }
  >({ status: "diam" });
  const [ragu, setRagu] = useState<Wilayah[] | null>(null);

  // Hitung jumlah kluster + listing per wilayah, sekali saja.
  const perKabupaten = useMemo(() => {
    const m = new Map<string, { kluster: number; listing: number }>();
    for (const k of kluster) {
      if (!k.regency_code) continue;
      const s = m.get(k.regency_code) ?? { kluster: 0, listing: 0 };
      s.kluster += 1;
      s.listing += k.jumlah_aktif;
      m.set(k.regency_code, s);
    }
    return m;
  }, [kluster]);

  const perProvinsi = useMemo(() => {
    const m = new Map<string, { kluster: number; listing: number }>();
    for (const k of kluster) {
      if (!k.province_code) continue;
      const s = m.get(k.province_code) ?? { kluster: 0, listing: 0 };
      s.kluster += 1;
      s.listing += k.jumlah_aktif;
      m.set(k.province_code, s);
    }
    return m;
  }, [kluster]);

  const totalListing = useMemo(
    () => kluster.reduce((a, k) => a + k.jumlah_aktif, 0),
    [kluster],
  );

  // Provinsi diurutkan: yang punya kluster lebih dulu, lalu abjad.
  const provinsiUrut = useMemo(() => {
    return [...PROVINSI].sort((a, b) => {
      const ka = perProvinsi.get(a.kode)?.kluster ?? 0;
      const kb = perProvinsi.get(b.kode)?.kluster ?? 0;
      if (ka !== kb) return kb - ka;
      return a.nama.localeCompare(b.nama, "id");
    });
  }, [perProvinsi]);

  // Pencarian: cocokkan nama kabupaten/kota di seluruh Indonesia.
  const hasilCari = useMemo(() => {
    const t = cari.trim().toLowerCase();
    if (t.length < 2) return [];
    const out: { kode: string; nama: string; provinsi: string; provKode: string }[] = [];
    for (const p of PROVINSI) {
      for (const k of kabupatenDari(p.kode)) {
        if (k.nama.toLowerCase().includes(t)) {
          out.push({ kode: k.kode, nama: k.nama, provinsi: p.nama, provKode: p.kode });
          if (out.length >= 40) return out;
        }
      }
    }
    return out;
  }, [cari]);

  // Esc menutup panel
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") onTutup();
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onTutup]);

  async function pakaiLokasiSaya() {
    setRagu(null);
    setGps({ status: "memuat" });
    const h = await deteksiLokasi();

    if (h.status === "ok") {
      const hit = perKabupaten.get(h.wilayah.kabupatenKode);
      if (!hit || hit.kluster === 0) {
        setGps({
          status: "pesan",
          jenis: "info",
          teks: `Lokasimu terdeteksi di ${h.wilayah.kabupatenNama}, tapi belum ada barang di sana.`,
        });
        return;
      }
      onPilih({
        jenis: "regency",
        kode: h.wilayah.kabupatenKode,
        label: h.wilayah.kabupatenNama,
      });
      return;
    }

    if (h.status === "ragu") {
      setRagu(h.kandidat);
      setGps({
        status: "pesan",
        jenis: "info",
        teks: "Lokasimu terdeteksi di nama wilayah yang ambigu. Pilih yang benar:",
      });
      return;
    }

    if (h.status === "ditolak") {
      setGps({
        status: "pesan",
        jenis: "galat",
        teks: "Izin lokasi ditolak. Kamu tetap bisa memilih wilayah manual di bawah.",
      });
      return;
    }

    if (h.status === "tidak_ketemu") {
      setGps({
        status: "pesan",
        jenis: "info",
        teks: "Lokasimu tidak cocok dengan daftar wilayah Indonesia. Pilih manual saja ya.",
      });
      return;
    }

    setGps({ status: "pesan", jenis: "galat", teks: h.pesan });
  }

  return (
    <div className="rounded-md border border-line bg-surface shadow-card">
      {/* Kepala */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-ink-secondary">
          Pilih lokasi
        </h2>
        <button
          type="button"
          onClick={onTutup}
          aria-label="Tutup"
          className="rounded-full p-1.5 text-ink-secondary hover:bg-appbg"
        >
          <IconX size={16} />
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-4">
        {/* Semua lokasi */}
        <button
          type="button"
          onClick={() => onPilih({ jenis: "semua", label: "Semua Lokasi" })}
          className={cn(
            "mb-3 flex w-full items-center justify-between rounded-md border px-3.5 py-3 text-left transition-colors",
            nilai.jenis === "semua"
              ? "border-primary bg-primary-soft"
              : "border-line bg-surface hover:border-primary/40",
          )}
        >
          <span className="flex items-center gap-2.5">
            <IconPin size={16} className="text-primary" />
            <span className="text-[13.5px] font-semibold text-ink">Semua Lokasi</span>
          </span>
          <span className="text-[12px] text-ink-secondary">{totalListing} barang</span>
        </button>

        {/* Gunakan lokasi saya */}
        <button
          type="button"
          onClick={() => void pakaiLokasiSaya()}
          disabled={gps.status === "memuat"}
          className={cn(
            "mb-2 flex w-full items-center justify-center gap-2 rounded-md px-3.5 py-3",
            "bg-primary text-[13.5px] font-semibold text-white transition-colors",
            "hover:bg-primary-dark disabled:cursor-wait disabled:opacity-70",
          )}
        >
          {gps.status === "memuat" ? (
            <>
              <span className="spin inline-block h-[15px] w-[15px] rounded-full border-2 border-white border-r-transparent" />
              Mencari lokasimu…
            </>
          ) : (
            <>
              <IconPin size={16} />
              Gunakan Lokasi Saya
            </>
          )}
        </button>

        <p className="mb-3 text-center text-[11px] leading-relaxed text-ink-secondary">
          Lokasi hanya dibaca saat kamu menekan tombol ini.
        </p>

        {/* Pesan hasil GPS */}
        {gps.status === "pesan" && (
          <div
            className={cn(
              "mb-3 flex items-start gap-2 rounded-md border px-3 py-2.5 text-[12.5px] leading-relaxed",
              gps.jenis === "galat"
                ? "border-danger/30 bg-danger-soft text-danger"
                : "border-accent-bright bg-accent-soft text-accent-text",
            )}
          >
            <IconAlert size={15} className="mt-[2px] shrink-0" />
            <span>{gps.teks}</span>
          </div>
        )}

        {/* Kalau ambigu: tanyakan */}
        {ragu && (
          <div className="mb-3 space-y-1.5">
            {ragu.map((w) => (
              <button
                key={w.kabupatenKode}
                type="button"
                onClick={() =>
                  onPilih({
                    jenis: "regency",
                    kode: w.kabupatenKode,
                    label: w.kabupatenNama,
                  })
                }
                className="flex w-full items-center justify-between rounded-md border border-line px-3 py-2.5 text-left text-[13px] hover:border-primary"
              >
                <span className="text-ink">{w.kabupatenNama}</span>
                <IconChevronRight size={14} className="text-ink-secondary" />
              </button>
            ))}
          </div>
        )}

        {/* Pencarian wilayah */}
        <label className="mb-1.5 block text-[12px] font-semibold text-ink">
          Cari kabupaten/kota
        </label>
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Contoh: Sleman, Bandung, Depok…"
          className="mb-3 h-10 w-full rounded-md border border-line px-3 text-[13.5px] focus:border-primary focus:outline-none"
        />

        {hasilCari.length > 0 && (
          <div className="mb-3 max-h-[240px] space-y-1 overflow-y-auto">
            {hasilCari.map((h) => {
              const s = perKabupaten.get(h.kode);
              return (
                <button
                  key={h.kode}
                  type="button"
                  onClick={() =>
                    onPilih({ jenis: "regency", kode: h.kode, label: h.nama })
                  }
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-appbg"
                >
                  <span>
                    <span className="block text-[13px] font-medium text-ink">{h.nama}</span>
                    <span className="block text-[11px] text-ink-secondary">{h.provinsi}</span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-[11px]",
                      s ? "font-medium text-primary" : "text-ink-secondary",
                    )}
                  >
                    {s ? `${s.listing} barang` : "belum ada"}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Daftar provinsi */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[12px] font-semibold text-ink">Atau pilih provinsi</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="space-y-1">
          {provinsiUrut.map((p) => {
            const s = perProvinsi.get(p.kode);
            const terbuka = provinsiTerbuka === p.kode;
            const kab = terbuka ? kabupatenDari(p.kode) : [];

            return (
              <div key={p.kode}>
                <button
                  type="button"
                  onClick={() => setProvinsiTerbuka(terbuka ? null : p.kode)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left transition-colors",
                    terbuka ? "bg-appbg" : "hover:bg-appbg",
                  )}
                >
                  <span className="flex items-center gap-2">
                    {terbuka ? (
                      <IconChevronDown size={14} className="text-ink-secondary" />
                    ) : (
                      <IconChevronRight size={14} className="text-ink-secondary" />
                    )}
                    <span className="text-[13px] font-medium text-ink">{p.nama}</span>
                  </span>
                  {s ? (
                    <span className="shrink-0 text-[11px] font-medium text-primary">
                      {s.kluster} kluster · {s.listing} barang
                    </span>
                  ) : (
                    <span className="shrink-0 text-[11px] text-ink-secondary">belum ada</span>
                  )}
                </button>

                {terbuka && (
                  <div className="ml-6 mt-1 space-y-0.5 border-l border-line pl-3">
                    <button
                      type="button"
                      onClick={() =>
                        onPilih({ jenis: "province", kode: p.kode, label: p.nama })
                      }
                      className="block w-full rounded-sm px-2 py-1.5 text-left text-[12.5px] font-medium text-primary hover:bg-appbg"
                    >
                      Seluruh {p.nama}
                    </button>
                    {kab.map((k) => {
                      const ks = perKabupaten.get(k.kode);
                      return (
                        <button
                          key={k.kode}
                          type="button"
                          onClick={() =>
                            onPilih({ jenis: "regency", kode: k.kode, label: k.nama })
                          }
                          className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left hover:bg-appbg"
                        >
                          <span className="text-[12.5px] text-ink">{k.nama}</span>
                          <span
                            className={cn(
                              "shrink-0 text-[10.5px]",
                              ks ? "font-medium text-primary" : "text-ink-secondary",
                            )}
                          >
                            {ks ? `${ks.kluster} kluster` : "—"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Kaki: chip pilihan terakhir (tidak diterapkan otomatis) */}
      {nilai.jenis !== "semua" && (
        <div className="flex items-center justify-between border-t border-line px-4 py-3">
          <span className="flex items-center gap-2 text-[12.5px] text-ink-secondary">
            <IconCheck size={14} className="text-primary" />
            Aktif: <b className="text-ink">{nilai.label}</b>
          </span>
          <button
            type="button"
            onClick={() => onPilih({ jenis: "semua", label: "Semua Lokasi" })}
            className="text-[12.5px] font-medium text-primary hover:underline"
          >
            Hapus
          </button>
        </div>
      )}
    </div>
  );
}
