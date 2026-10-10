/**
 * Format angka & tanggal untuk antarmuka Bahasa Indonesia.
 * Semua fungsi murni (tanpa efek samping) supaya mudah diuji.
 */

export const formatRupiah = (n: number | string): string => {
  const num = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(num)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
};

/** "Rp 150.000" — versi ringkas tanpa spasi, untuk badge harga. */
export const formatRupiahRingkas = (n: number | string): string =>
  formatRupiah(n).replace(/\s/g, " ");

export const formatTanggalID = (d: Date | string): string => {
  const date = typeof d === "string" ? parseTanggalLokal(d) : d;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

export const formatTanggalPendek = (d: Date | string): string => {
  const date = typeof d === "string" ? parseTanggalLokal(d) : d;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
};

/**
 * Parse "YYYY-MM-DD" sebagai tanggal LOKAL, bukan UTC.
 * `new Date("2026-10-17")` menghasilkan tengah malam UTC, yang di WIB (UTC+7)
 * masih tanggal 17 — tapi di zona barat akan mundur sehari. Karena deadline
 * bersifat tanggal (bukan waktu), selalu pakai tengah malam lokal.
 */
export const parseTanggalLokal = (ymd: string): Date => {
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

/** Format Date -> "YYYY-MM-DD" untuk dikirim ke API / database. */
export const keYMD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

/** Jumlah hari dari sekarang ke tanggal (negatif = sudah lewat). */
export const selisihHari = (target: Date | string, now = new Date()): number => {
  const t = typeof target === "string" ? parseTanggalLokal(target) : target;
  const a = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
};

/** "2 jam lalu", "3 hari lalu" — untuk timeline di dashboard penjual. */
export const waktuRelatif = (d: Date | string): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  const detik = Math.floor((Date.now() - date.getTime()) / 1000);
  if (detik < 60) return "baru saja";
  const menit = Math.floor(detik / 60);
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 30) return `${hari} hari lalu`;
  const bulan = Math.floor(hari / 30);
  return `${bulan} bulan lalu`;
};
