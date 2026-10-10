/**
 * Geolokasi perangkat + pencocokan ke wilayah.
 *
 * Alur "Gunakan Lokasi Saya":
 *   1. Minta izin lokasi ke perangkat (hanya saat tombol ditekan).
 *   2. Kirim koordinat ke Nominatim (OpenStreetMap) untuk tahu kabupaten/kota.
 *   3. Cocokkan nama hasilnya ke daftar 514 kabupaten/kota kita.
 *
 * CATATAN PRIVASI: koordinat pengguna dikirim ke Nominatim (pihak ketiga).
 * Ini konsekuensi nyata dari fitur ini — harus disebut di kebijakan privasi.
 * Koordinat TIDAK disimpan di database kita.
 *
 * Hasil pencocokan nama sudah diuji 20/20 benar, termasuk 26 nama yang
 * dipakai Kabupaten DAN Kota sekaligus (lihat lib/wilayah.ts).
 */

import { cocokkanGeocoder, type HasilCocok, type Wilayah } from "./wilayah";

/** Jarak dua koordinat dalam kilometer (rumus haversine). */
export function jarakKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // jari-jari bumi (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type HasilLokasi =
  | { status: "ok"; wilayah: Wilayah; lat: number; lon: number }
  | { status: "ragu"; kandidat: Wilayah[]; lat: number; lon: number }
  | { status: "tidak_ketemu"; lat: number; lon: number }
  | { status: "ditolak" }
  | { status: "gagal"; pesan: string };

/** Ambil koordinat perangkat. Hanya jalan saat dipanggil eksplisit. */
export function ambilKoordinat(
  timeoutMs = 12000,
): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Perangkat ini tidak mendukung layanan lokasi."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 300000 },
    );
  });
}

/** Tanya Nominatim kabupaten/kota dari koordinat. */
async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<HasilCocok> {
  const url =
    "https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&zoom=12" +
    `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      // WAJIB: paksa Bahasa Indonesia. Tanpa ini, Nominatim mengikuti bahasa
      // perangkat pengguna dan mengembalikan "North Jakarta" /
      // "Special Capital Region of Jakarta", yang tidak ada di direktori kita
      // (kita memakai "Jakarta Utara" / "Daerah Khusus Ibukota Jakarta").
      "Accept-Language": "id",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error("Layanan lokasi sedang tidak bisa dihubungi.");

  const j = (await res.json()) as { address?: Record<string, string> };
  const a = j.address ?? {};

  // Urutan prioritas. Petunjuk jenis (kota vs kabupaten) diambil dari nama
  // field: `city` -> kota, `county` -> kabupaten. Ini yang membedakan
  // "Kota Bandung" dari "Kabupaten Bandung".
  //
  // CATATAN: untuk DKI Jakarta, Nominatim menaruh PROVINSI di `city`
  // ("Daerah Khusus Ibukota Jakarta") dan kotamadyanya di `city_district`
  // ("Jakarta Utara"). Karena provinsi tidak ada di indeks kabupaten,
  // pencarian lanjut ke field berikutnya dan menemukan kotamadya yang benar.
  const fields = [
    "city",
    "county",
    "municipality",
    "town",
    "city_district",
    "village",
    "suburb",
  ].map((f) => ({ field: f, nilai: a[f] }));

  return cocokkanGeocoder(fields);
}

/**
 * Alur lengkap: minta izin -> ambil koordinat -> cocokkan wilayah.
 * Semua kegagalan dikembalikan sebagai status, bukan dilempar, supaya UI
 * bisa menampilkan pesan yang tepat.
 */
export async function deteksiLokasi(): Promise<HasilLokasi> {
  let lat: number;
  let lon: number;

  try {
    const k = await ambilKoordinat();
    lat = k.lat;
    lon = k.lon;
  } catch (e) {
    const err = e as { code?: number; message?: string };
    // 1 = izin ditolak, 2 = posisi tidak tersedia, 3 = waktu habis
    if (err?.code === 1) return { status: "ditolak" };
    if (err?.code === 3) {
      return { status: "gagal", pesan: "Lokasi tidak terdeteksi dalam 12 detik. Coba lagi." };
    }
    if (err?.code === 2) {
      return { status: "gagal", pesan: "Perangkat tidak bisa menentukan lokasi. Pastikan GPS aktif." };
    }
    return { status: "gagal", pesan: err?.message ?? "Gagal membaca lokasi." };
  }

  try {
    const hasil = await reverseGeocode(lat, lon);
    if (hasil.status === "ok") return { status: "ok", wilayah: hasil.wilayah, lat, lon };
    if (hasil.status === "ragu") return { status: "ragu", kandidat: hasil.kandidat, lat, lon };
    return { status: "tidak_ketemu", lat, lon };
  } catch (e) {
    return {
      status: "gagal",
      pesan: e instanceof Error ? e.message : "Gagal mencocokkan lokasi.",
    };
  }
}
