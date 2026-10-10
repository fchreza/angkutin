"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { IconChevronDown, IconAlert } from "@/components/shared/icons";
import { PROVINSI, kabupatenDari } from "@/lib/wilayah";

export type PilihanWilayah = {
  province_code: string;
  province_name: string;
  regency_code: string;
  regency_name: string;
  district_code: string;
  district_name: string;
};

type Kecamatan = { kode: string; nama: string };

/**
 * Pemilih wilayah berjenjang untuk FORM PASANG.
 *
 *   Provinsi -> Kabupaten/Kota -> Kecamatan
 *
 * KENAPA KECAMATAN DIAMBIL DARI API, BUKAN BERKAS DI BROWSER:
 * Kode kecamatan TIDAK bisa diturunkan dari urutan daftar — 70 dari 514
 * kabupaten punya kode melompat karena pemekaran (mis. Aceh Tengah:
 * 11.04.07, 11.04.08, 11.04.10). Kalau browser menebak kode dari posisi,
 * server akan menolak kiriman yang sebenarnya sah.
 *
 * Dulu dicoba: mengirim seluruh 7.285 kecamatan (111 KB) ke setiap pengunjung.
 * Sekarang: satu permintaan ~0,5 KB saat kabupaten dipilih. Kode yang diterima
 * browser adalah kode asli BPS — sama persis dengan yang divalidasi server.
 *
 * Provinsi & kabupaten tetap dari berkas (wilayah.json, 17 KB) karena kode
 * keduanya sederhana dan tidak punya masalah lompatan.
 */
export function WilayahPicker({
  nilai,
  onUbah,
  galat,
}: {
  nilai: PilihanWilayah;
  onUbah: (w: PilihanWilayah) => void;
  galat?: string;
}) {
  const [kecamatan, setKecamatan] = useState<Kecamatan[]>([]);
  const [memuat, setMemuat] = useState(false);
  const [galatMuat, setGalatMuat] = useState<string | null>(null);

  const kabupaten = useMemo(
    () => (nilai.province_code ? kabupatenDari(nilai.province_code) : []),
    [nilai.province_code],
  );

  // Ambil kecamatan HANYA saat kabupaten dipilih.
  useEffect(() => {
    if (!nilai.regency_code) {
      setKecamatan([]);
      setGalatMuat(null);
      return;
    }

    let batal = false;
    setMemuat(true);
    setGalatMuat(null);
    setKecamatan([]);

    fetch(
      `/api/v1/wilayah/kecamatan?regency=${encodeURIComponent(nilai.regency_code)}`,
    )
      .then(async (r) => {
        if (!r.ok) throw new Error("gagal");
        return (await r.json()) as { data?: Kecamatan[] };
      })
      .then((j) => {
        if (batal) return;
        setKecamatan(j.data ?? []);
      })
      .catch(() => {
        if (batal) return;
        setGalatMuat("Gagal memuat daftar kecamatan. Periksa koneksi lalu coba lagi.");
      })
      .finally(() => {
        if (!batal) setMemuat(false);
      });

    return () => {
      batal = true;
    };
  }, [nilai.regency_code]);

  function pilihProvinsi(kode: string) {
    const p = PROVINSI.find((x) => x.kode === kode);
    onUbah({
      province_code: kode,
      province_name: p?.nama ?? "",
      // Kabupaten & kecamatan direset — tidak boleh ada kombinasi lintas provinsi.
      regency_code: "",
      regency_name: "",
      district_code: "",
      district_name: "",
    });
  }

  function pilihKabupaten(kode: string) {
    const k = kabupaten.find((x) => x.kode === kode);
    onUbah({
      ...nilai,
      regency_code: kode,
      regency_name: k?.nama ?? "",
      district_code: "",
      district_name: "",
    });
  }

  function pilihKecamatan(kode: string) {
    const d = kecamatan.find((x) => x.kode === kode);
    onUbah({ ...nilai, district_code: kode, district_name: d?.nama ?? "" });
  }

  const kelasSelect = (salah: boolean) =>
    cn(
      "h-11 w-full appearance-none rounded-md border bg-surface px-3 pr-9 text-[14px] focus:outline-none",
      salah ? "border-danger" : "border-line focus:border-primary",
    );

  const kecamatanSiap = Boolean(nilai.regency_code) && !memuat;

  return (
    <div className="space-y-4">
      {/* Provinsi */}
      <div>
        <label htmlFor="provinsi" className="mb-2 block text-[13px] font-semibold text-ink">
          Provinsi <span className="text-danger">*</span>
        </label>
        <div className="relative">
          <select
            id="provinsi"
            value={nilai.province_code}
            onChange={(e) => pilihProvinsi(e.target.value)}
            className={kelasSelect(false)}
          >
            <option value="">— Pilih provinsi —</option>
            {PROVINSI.map((p) => (
              <option key={p.kode} value={p.kode}>
                {p.nama}
              </option>
            ))}
          </select>
          <IconChevronDown
            size={15}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-secondary"
          />
        </div>
      </div>

      {/* Kabupaten/Kota — muncul setelah provinsi dipilih */}
      <div>
        <label htmlFor="kabupaten" className="mb-2 block text-[13px] font-semibold text-ink">
          Kabupaten/Kota <span className="text-danger">*</span>
        </label>
        <div className="relative">
          <select
            id="kabupaten"
            value={nilai.regency_code}
            disabled={!nilai.province_code}
            onChange={(e) => pilihKabupaten(e.target.value)}
            className={cn(
              kelasSelect(false),
              !nilai.province_code && "cursor-not-allowed bg-appbg text-ink-secondary",
            )}
          >
            <option value="">
              {nilai.province_code ? "— Pilih kabupaten/kota —" : "Pilih provinsi dulu"}
            </option>
            {kabupaten.map((k) => (
              <option key={k.kode} value={k.kode}>
                {k.nama}
              </option>
            ))}
          </select>
          <IconChevronDown
            size={15}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-secondary"
          />
        </div>
      </div>

      {/* Kecamatan — daftar diambil dari server setelah kabupaten dipilih */}
      <div>
        <label htmlFor="kecamatan" className="mb-2 block text-[13px] font-semibold text-ink">
          Kecamatan <span className="text-danger">*</span>
        </label>
        <div className="relative">
          <select
            id="kecamatan"
            value={nilai.district_code}
            disabled={!kecamatanSiap}
            onChange={(e) => pilihKecamatan(e.target.value)}
            className={cn(
              kelasSelect(Boolean(galat)),
              !kecamatanSiap && "cursor-not-allowed bg-appbg text-ink-secondary",
            )}
          >
            <option value="">
              {memuat
                ? "Memuat kecamatan…"
                : nilai.regency_code
                  ? "— Pilih kecamatan —"
                  : "Pilih kabupaten/kota dulu"}
            </option>
            {kecamatan.map((d) => (
              <option key={d.kode} value={d.kode}>
                {d.nama}
              </option>
            ))}
          </select>
          <IconChevronDown
            size={15}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-secondary"
          />
        </div>

        {galat ? (
          <p className="mt-1.5 flex items-start gap-1.5 text-[12px] text-danger">
            <IconAlert size={13} className="mt-[2px] shrink-0" />
            {galat}
          </p>
        ) : galatMuat ? (
          <p className="mt-1.5 flex items-start gap-1.5 text-[12px] text-danger">
            <IconAlert size={13} className="mt-[2px] shrink-0" />
            {galatMuat}
          </p>
        ) : (
          <p className="mt-1.5 text-[11.5px] text-ink-secondary">
            {kecamatan.length > 0
              ? `${kecamatan.length} kecamatan di ${nilai.regency_name}.`
              : "Kecamatan dipakai pembeli untuk tahu jarak barang."}
          </p>
        )}
      </div>
    </div>
  );
}
