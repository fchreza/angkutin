/**
 * Validasi wilayah di SISI SERVER.
 *
 * KENAPA INI ADA — jangan dilewat:
 * Form pasang mengirim kode provinsi/kabupaten/kecamatan. Tanpa validasi,
 * siapa pun bisa mengirim kode palsu lewat API langsung, dan data lokasi jadi
 * kotor — akibatnya filter lokasi di katalog tidak bisa dipercaya.
 *
 * Berkas ini HANYA untuk server. Jangan diimpor dari komponen klien:
 * `kecamatan-server.json` berukuran 239 KB.
 */

import { PROVINSI, kabupatenDari } from "@/lib/wilayah";
import kecamatanServerJson from "@/lib/data/kecamatan-server.json";

const dataServer = kecamatanServerJson as unknown as {
  sumber: string;
  diperbarui: string;
  kecamatan: Record<string, [string, string]>;
};

/** Indeks kode kabupaten -> kode provinsi, dibangun sekali. */
const KABUPATEN_KE_PROVINSI = new Map<string, string>();
for (const p of PROVINSI) {
  for (const k of kabupatenDari(p.kode)) {
    KABUPATEN_KE_PROVINSI.set(k.kode, p.kode);
  }
}

export type WilayahTervalidasi = {
  provinceCode: string;
  provinceName: string;
  regencyCode: string;
  regencyName: string;
  districtCode: string;
  districtName: string;
};

export type HasilValidasi =
  | { ok: true; wilayah: WilayahTervalidasi }
  | { ok: false; pesan: string; detail?: Record<string, string> };

/**
 * Periksa rantai wilayah: provinsi -> kabupaten -> kecamatan.
 * Setiap tingkat harus benar-benar ada DAN cocok dengan tingkat di atasnya.
 */
export function validasiWilayah(
  provinceCode: string,
  regencyCode: string,
  districtCode: string,
): HasilValidasi {
  // 1. Provinsi
  const prov = PROVINSI.find((p) => p.kode === provinceCode);
  if (!prov) {
    return {
      ok: false,
      pesan: "Provinsi tidak dikenal.",
      detail: { province_code: "Pilih provinsi dari daftar." },
    };
  }

  // 2. Kabupaten/kota harus ada DI provinsi itu
  const kab = kabupatenDari(provinceCode).find((k) => k.kode === regencyCode);
  if (!kab) {
    return {
      ok: false,
      pesan: "Kabupaten/kota tidak cocok dengan provinsi yang dipilih.",
      detail: { regency_code: "Pilih kabupaten/kota dari daftar." },
    };
  }

  // 3. Kecamatan harus ada DI kabupaten itu
  const kec = dataServer.kecamatan[districtCode];
  if (!kec) {
    return {
      ok: false,
      pesan: "Kecamatan tidak dikenal.",
      detail: { district_code: "Pilih kecamatan dari daftar." },
    };
  }
  if (kec[0] !== regencyCode) {
    return {
      ok: false,
      pesan: "Kecamatan tidak berada di kabupaten/kota yang dipilih.",
      detail: { district_code: "Pilih kecamatan dari daftar." },
    };
  }

  return {
    ok: true,
    wilayah: {
      provinceCode: prov.kode,
      provinceName: prov.nama,
      regencyCode: kab.kode,
      regencyName: kab.nama,
      districtCode,
      districtName: kec[1],
    },
  };
}

/** Berapa kecamatan terdaftar? Dipakai untuk pemeriksaan kesehatan. */
export function jumlahKecamatanServer(): number {
  return Object.keys(dataServer.kecamatan).length;
}

/**
 * Daftar kecamatan di satu kabupaten, LENGKAP DENGAN KODE ASLI BPS.
 * Diurutkan menurut nama untuk tampilan.
 *
 * Dipakai endpoint /api/v1/wilayah/kecamatan. Kode TIDAK boleh ditebak dari
 * urutan: 70 dari 514 kabupaten punya kode melompat karena pemekaran.
 */
export function kecamatanKabupaten(
  regencyCode: string,
): { kode: string; nama: string }[] {
  const hasil: { kode: string; nama: string }[] = [];
  for (const [kode, [kab, nama]] of Object.entries(dataServer.kecamatan)) {
    if (kab === regencyCode) hasil.push({ kode, nama });
  }
  hasil.sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  return hasil;
}

export { KABUPATEN_KE_PROVINSI };
