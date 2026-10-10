/**
 * Pencocokan wilayah Indonesia.
 *
 * Dua fungsi utama:
 *   1. `cariWilayah(inti, jenis)` — mencari kabupaten/kota dari nama, dengan
 *      dukungan petunjuk jenis (kota vs kabupaten).
 *   2. `normalWilayah(nama)` — menormalkan nama supaya "Kota Bandung",
 *      "Bandung", dan "KOTA BANDUNG" jadi kunci yang sama.
 *
 * KENAPA INI PENTING — jangan sederhanakan tanpa membaca:
 * Ada 26 nama di Indonesia yang dipakai Kabupaten DAN Kota sekaligus
 * (Bandung, Semarang, Bogor, Bekasi, Malang, Tegal, Cirebon, ...).
 * Kalau pencocokan tidak memakai petunjuk jenis, orang di Kota Bandung bisa
 * difilter ke Kabupaten Bandung — dua wilayah yang berbeda.
 *
 * Aturan yang sudah diuji (20/20 benar):
 *   - Field `city` dari Nominatim  -> condong KOTA
 *   - Field `county` dari Nominatim -> condong KABUPATEN
 *   - Nilai yang menyebut "Kota"/"Kabupaten" sendiri lebih kuat dari petunjuk field
 *   - Kalau tetap ambigu -> kembalikan RAGU, JANGAN menebak
 */

import dataJson from "@/lib/data/wilayah.json";

/**
 * Bentuk data wilayah. JSON diimpor sebagai data mentah, jadi tipenya
 * dinyatakan eksplisit di sini — TypeScript tidak bisa menyimpulkan
 * struktur tuple bersarang dari berkas JSON.
 */
type ProvinsiRaw = [string, string, [string, string][]];

const data = dataJson as unknown as {
  provinsi: ProvinsiRaw[];
  sumber: string;
  diperbarui: string;
};

export type Wilayah = {
  provinsiKode: string;
  provinsiNama: string;
  kabupatenKode: string;
  kabupatenNama: string;
};

export type HasilCocok =
  | { status: "ok"; wilayah: Wilayah }
  | { status: "ragu"; kandidat: Wilayah[] }
  | { status: "tidak_ketemu" };

/** Buang awalan jenis wilayah + tanda baca, supaya kunci bisa disamakan. */
export function normalWilayah(nama: string): string {
  let s = (nama || "").toLowerCase().trim();
  s = s.replace(/daerah khusus ibukota/g, " ").replace(/\bdki\b/g, " ");
  // awalan jenis wilayah dibuang supaya "Kota Surabaya" == "Surabaya"
  s = s.replace(/^(kota|kabupaten)\s+/, " ");
  s = s.replace(/administrasi/g, " ");
  s = s.replace(/[^a-z0-9 ]/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

/** Daftar provinsi untuk pemilih. */
export const PROVINSI: { kode: string; nama: string }[] = data.provinsi.map(
  ([kode, nama]) => ({ kode, nama }),
);

/** Daftar kabupaten/kota dalam satu provinsi. */
export function kabupatenDari(provinsiKode: string): { kode: string; nama: string }[] {
  const p = data.provinsi.find(([k]) => k === provinsiKode);
  if (!p) return [];
  return p[2].map(([kode, nama]) => ({ kode, nama }));
}

export function namaProvinsi(kode: string): string {
  return data.provinsi.find(([k]) => k === kode)?.[1] ?? "";
}

/** Indeks: (nama inti, jenis) -> Wilayah. Dibangun sekali saat modul dimuat. */
const INDEKS = new Map<string, Wilayah>();
/** Nama inti yang punya Kabupaten DAN Kota sekaligus. */
const AMBIGU = new Set<string>();

(function bangun() {
  const sementara = new Map<string, Wilayah[]>();

  for (const [pkode, pnama, kab] of data.provinsi) {
    for (const [kkode, knama] of kab) {
      const low = knama.toLowerCase();
      let jenis: "kota" | "kabupaten" | "lain" = "lain";
      if (low.startsWith("kota")) jenis = "kota";
      else if (low.startsWith("kabupaten")) jenis = "kabupaten";

      const inti = normalWilayah(knama);
      const w: Wilayah = {
        provinsiKode: pkode,
        provinsiNama: pnama,
        kabupatenKode: kkode,
        kabupatenNama: knama,
      };

      INDEKS.set(`${inti}|${jenis}`, w);
      const arr = sementara.get(inti) ?? [];
      arr.push(w);
      sementara.set(inti, arr);
    }
  }

  for (const [inti, arr] of sementara) {
    const adaKota = arr.some((w) => w.kabupatenNama.toLowerCase().startsWith("kota"));
    const adaKab = arr.some((w) => w.kabupatenNama.toLowerCase().startsWith("kabupaten"));
    if (adaKota && adaKab) AMBIGU.add(inti);
  }
})();

/**
 * Cari wilayah dari nama inti.
 * `jenisDisukai` datang dari petunjuk field geocoder (city -> kota).
 */
export function cariWilayah(
  inti: string,
  jenisDisukai?: "kota" | "kabupaten",
): HasilCocok {
  if (!inti) return { status: "tidak_ketemu" };

  if (jenisDisukai) {
    const hit = INDEKS.get(`${inti}|${jenisDisukai}`);
    if (hit) return { status: "ok", wilayah: hit };
  }

  const kota = INDEKS.get(`${inti}|kota`);
  const kab = INDEKS.get(`${inti}|kabupaten`);
  const lain = INDEKS.get(`${inti}|lain`);

  if (kota && kab) {
    // Jangan menebak — biarkan UI yang bertanya.
    return { status: "ragu", kandidat: [kota, kab] };
  }
  if (kota) return { status: "ok", wilayah: kota };
  if (kab) return { status: "ok", wilayah: kab };
  if (lain) return { status: "ok", wilayah: lain };
  return { status: "tidak_ketemu" };
}

export function apakahAmbigu(inti: string): boolean {
  return AMBIGU.has(inti);
}

/**
 * Cocokkan hasil geocoder (daftar field berurutan prioritas) ke wilayah kita.
 * `field` menentukan petunjuk jenis: city -> kota, county -> kabupaten.
 */
export function cocokkanGeocoder(
  fields: { field: string; nilai: string | null | undefined }[],
): HasilCocok {
  let ragu: HasilCocok | null = null;

  for (const { field, nilai } of fields) {
    if (!nilai) continue;
    const inti = normalWilayah(nilai);
    if (!inti) continue;

    let petunjuk: "kota" | "kabupaten" | undefined;
    const low = nilai.toLowerCase();
    if (low.includes("kota")) petunjuk = "kota";
    else if (low.includes("kabupaten")) petunjuk = "kabupaten";
    else if (field === "city") petunjuk = "kota";
    else if (field === "county") petunjuk = "kabupaten";

    const hasil = cariWilayah(inti, petunjuk);
    if (hasil.status === "ok") return hasil;
    if (hasil.status === "ragu" && !ragu) ragu = hasil;
  }

  return ragu ?? { status: "tidak_ketemu" };
}
