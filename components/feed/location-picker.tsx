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
import { PROVINSI, kabupatenDari } from "@/lib/wilayah";
import { deteksiLokasi } from "@/lib/geo";

/** Wilayah yang punya barang, dari GET /api/v1/wilayah. */
export type WilayahAdaBarang = {
  province_code: string;
  province_name: string;
  jumlah: number;
  kabupaten: { regency_code: string; regency_name: string; jumlah: number }[];
};

export type PilihanLokasi = {
  /** "semua" | kode kabupaten | kode provinsi */
  jenis: "semua" | "regency" | "province";
  kode?: string;
  label: string;
};

/**
 * Panel pemilih lokasi.
 *
 * Aturan yang dipegang:
 *  - Default "Semua Lokasi" — seluruh katalog terlihat.
 *  - Pilihan TIDAK diterapkan otomatis dari kunjungan sebelumnya; hanya
 *    muncul sebagai chip cepat yang harus ditekan.
 *  - "Gunakan Lokasi Saya" hanya jalan saat ditekan, tidak pernah otomatis.
 *  - Hanya wilayah yang PUNYA barang yang ditampilkan, supaya pengguna tidak
 *    memilih wilayah kosong lalu bingung. Wilayah kosong tetap bisa dicari.
 *  - Filter berhenti di KABUPATEN/KOTA. Kecamatan tidak ditampilkan di sini —
 *    pembeli mencari barang, bukan alamat.
 */
export function LocationPicker({
  wilayah,
  nilai,
  onPilih,
  onTutup,
}: {
  wilayah: WilayahAdaBarang[];
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
  const [raguKandidat, setRaguKandidat] = useState<
    { kabupatenKode: string; kabupatenNama: string }[] | null
  >(null);

  const totalListing = useMemo(
    () => wilayah.reduce((a, w) => a + w.jumlah, 0),
    [wilayah],
  );

  /** Peta kode kabupaten -> jumlah barang (untuk hasil pencarian). */
  const perKabupaten = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of wilayah) {
      for (const k of p.kabupaten) m.set(k.regency_code, k.jumlah);
    }
    return m;
  }, [wilayah]);

  const adaBarang = totalListing > 0;

  // Pencarian: seluruh kabupaten/kota Indonesia (514). Wilayah yang sudah ada
  // barangnya didahulukan; wilayah kosong tetap muncul karena pengguna mungkin
  // ingin memasang barang pertama di sana.
  const hasilCari = useMemo(() => {
    const t = cari.trim().toLowerCase();
    if (t.length < 2) return [];
    const out: { kode: string; nama: string; provinsi: string; jumlah: number }[] = [];
    for (const p of PROVINSI) {
      for (const k of kabupatenDari(p.kode)) {
        if (k.nama.toLowerCase().includes(t)) {
          out.push({
            kode: k.kode,
            nama: k.nama,
            provinsi: p.nama,
            jumlah: perKabupaten.get(k.kode) ?? 0,
          });
        }
      }
    }
    out.sort((a, b) => {
      if (a.jumlah !== b.jumlah) return b.jumlah - a.jumlah;
      return a.nama.localeCompare(b.nama, "id");
    });
    return out.slice(0, 40);
  }, [cari, perKabupaten]);

  // Esc menutup panel
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") onTutup();
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onTutup]);

  async function pakaiLokasiSaya() {
    setRaguKandidat(null);
    setGps({ status: "memuat" });
    const h = await deteksiLokasi();

    if (h.status === "ok") {
      const jumlah = perKabupaten.get(h.wilayah.kabupatenKode) ?? 0;
      if (jumlah === 0) {
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
      // Nama wilayah ambigu (mis. "Bandung" bisa Kota atau Kabupaten).
      // Jangan menebak — tanyakan, dan dahulukan yang punya barang.
      const urut = [...h.kandidat].sort(
        (a, b) =>
          (perKabupaten.get(b.kabupatenKode) ?? 0) -
          (perKabupaten.get(a.kabupatenKode) ?? 0),
      );
      setGps({
        status: "pesan",
        jenis: "info",
        teks: "Lokasimu terdeteksi di nama wilayah yang ambigu. Pilih yang benar:",
      });
      setRaguKandidat(
        urut.map((w) => ({
          kabupatenKode: w.kabupatenKode,
          kabupatenNama: w.kabupatenNama,
        })),
      );
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

        {/* Nama wilayah ambigu: tanyakan, jangan menebak */}
        {raguKandidat && (
          <div className="mb-3 space-y-1.5">
            {raguKandidat.map((w) => (
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
          placeholder="Contoh: Sleman, Bandung, Jakarta Utara…"
          className="mb-3 h-10 w-full rounded-md border border-line px-3 text-[13.5px] focus:border-primary focus:outline-none"
        />

        {hasilCari.length > 0 && (
          <div className="mb-3 max-h-[240px] space-y-1 overflow-y-auto">
            {hasilCari.map((h) => (
              <button
                key={h.kode}
                type="button"
                onClick={() => onPilih({ jenis: "regency", kode: h.kode, label: h.nama })}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-appbg"
              >
                <span>
                  <span className="block text-[13px] font-medium text-ink">{h.nama}</span>
                  <span className="block text-[11px] text-ink-secondary">{h.provinsi}</span>
                </span>
                <span
                  className={cn(
                    "shrink-0 text-[11px]",
                    h.jumlah > 0 ? "font-medium text-primary" : "text-ink-secondary",
                  )}
                >
                  {h.jumlah > 0 ? `${h.jumlah} barang` : "belum ada barang"}
                </span>
              </button>
            ))}
          </div>
        )}

        {cari.trim().length >= 2 && hasilCari.length === 0 && (
          <p className="mb-3 rounded-md bg-appbg px-3 py-2 text-[12px] text-ink-secondary">
            Tidak ada kabupaten/kota yang cocok dengan &quot;{cari.trim()}&quot;.
          </p>
        )}

        {/* Daftar provinsi */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[12px] font-semibold text-ink">
            {adaBarang ? "Atau pilih provinsi" : "Provinsi"}
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>

        {!adaBarang && (
          <div className="rounded-md border border-line bg-appbg px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-secondary">
            <b className="text-ink">Belum ada barang di mana pun.</b>
            <br />
            Filter lokasi akan muncul di sini begitu ada yang memasang barang. Kamu
            bisa jadi yang pertama — pilih &quot;Pasang Barang&quot;.
          </div>
        )}

        <div className="space-y-1">
          {wilayah.map((p) => {
            const terbuka = provinsiTerbuka === p.province_code;
            return (
              <div key={p.province_code}>
                <button
                  type="button"
                  onClick={() => setProvinsiTerbuka(terbuka ? null : p.province_code)}
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
                    <span className="text-[13px] font-medium text-ink">
                      {p.province_name}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] font-medium text-primary">
                    {p.jumlah} barang
                  </span>
                </button>

                {terbuka && (
                  <div className="ml-6 mt-1 space-y-0.5 border-l border-line pl-3">
                    <button
                      type="button"
                      onClick={() =>
                        onPilih({
                          jenis: "province",
                          kode: p.province_code,
                          label: p.province_name,
                        })
                      }
                      className="block w-full rounded-sm px-2 py-1.5 text-left text-[12.5px] font-medium text-primary hover:bg-appbg"
                    >
                      Seluruh {p.province_name}
                    </button>
                    {p.kabupaten.map((k) => (
                      <button
                        key={k.regency_code}
                        type="button"
                        onClick={() =>
                          onPilih({
                            jenis: "regency",
                            kode: k.regency_code,
                            label: k.regency_name,
                          })
                        }
                        className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left hover:bg-appbg"
                      >
                        <span className="text-[12.5px] text-ink">{k.regency_name}</span>
                        <span className="shrink-0 text-[10.5px] font-medium text-primary">
                          {k.jumlah} barang
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

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
