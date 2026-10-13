import { keYMD, selisihHari, tanggalHariIniID } from "./format";

/**
 * Urgensi tenggat (FR-6). Ambang PERSIS dari PRD:
 *   > 3 hari  -> normal  ("Tersedia sampai ...", abu-abu)
 *   <= 2 hari -> urgent  ("Mendesak: sisa X hari", amber + ikon jam)
 *   hari-H    -> today   ("Berakhir hari ini", amber)
 *   < 0       -> expired
 */
export type Urgency = "normal" | "urgent" | "today" | "expired";

export function getUrgency(deadline: Date | string, now = new Date()): Urgency {
  const hari = hariTersisaID(deadline, now);
  if (hari < 0) return "expired";
  if (hari === 0) return "today";
  if (hari <= 2) return "urgent";
  return "normal";
}

/** Teks badge tenggat — microcopy dari PRD §15. */
export function labelTenggat(deadline: Date | string, now = new Date()): string {
  const u = getUrgency(deadline, now);
  const hari = hariTersisaID(deadline, now);

  if (u === "expired") return "Kedaluwarsa";
  if (u === "today") return "Berakhir hari ini";
  if (u === "urgent") return `Mendesak: sisa ${hari} hari`;

  // normal -> "Tersedia sampai Jumat, 17 Okt"
  //
  // Tanggal diikat ke tengah malam UTC dan diformat dengan timeZone UTC.
  // Kalau memakai tengah malam lokal lalu diformat UTC (atau sebaliknya),
  // hasilnya bergeser sehari — dan server (UTC) akan berbeda dengan browser
  // penjual (WIB), memicu ketidakcocokan hidrasi React.
  const ymd =
    typeof deadline === "string" ? deadline.slice(0, 10) : keYMD(deadline);
  const tgl = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${ymd}T00:00:00Z`));
  return `Tersedia sampai ${tgl}`;
}

/** Warna badge sesuai urgensi (token dari design-tokens.json). */
export const gayaUrgency: Record<Urgency, string> = {
  normal: "bg-appbg text-ink-secondary border-line",
  urgent: "bg-accent-soft text-accent-text border-accent-bright",
  today: "bg-accent-soft text-accent-text border-accent-bright",
  expired: "bg-appbg text-ink-secondary border-line",
};

export const LABEL_KONDISI: Record<string, string> = {
  SEPERTI_BARU: "Seperti Baru",
  MINUS_PEMAKAIAN: "Minus Pemakaian",
  PERLU_SERVIS_RINGAN: "Perlu Servis Ringan",
};

export const LABEL_STATUS: Record<string, string> = {
  AVAILABLE: "Tersedia",
  TAKEN: "Sudah Diambil",
  EXPIRED: "Kedaluwarsa",
  DELETED: "Dihapus",
};

/**
 * Sisa hari sampai tenggat, dihitung dari tanggal kalender WIB.
 *
 * Memakai aritmetika tanggal murni (YYYY-MM-DD) yang diikat ke tengah malam
 * UTC, jadi hasilnya sama persis di server (UTC) maupun di browser penjual
 * (WIB). Memakai `new Date()` lokal akan membuat server dan browser berbeda
 * pendapat selama 7 jam setiap hari — dan itu memicu ketidakcocokan hidrasi
 * di React.
 *
 * Negatif = sudah lewat.
 */
export function hariTersisaID(deadline: Date | string, now = new Date()): number {
  const d = typeof deadline === "string" ? deadline.slice(0, 10) : keYMD(deadline);
  const a = Date.parse(`${d}T00:00:00Z`);
  const b = Date.parse(`${tanggalHariIniID(now)}T00:00:00Z`);
  if (Number.isNaN(a)) return 0;
  return Math.round((a - b) / 86_400_000);
}

/**
 * Status yang BENAR-BENAR berlaku sekarang.
 *
 * KENAPA INI PERLU ADA:
 * Kolom `status` di database hanya berubah jadi EXPIRED kalau cron berjalan.
 * Vercel Hobby hanya boleh 1 cron/hari dan jamnya tidak presisi, jadi ada
 * jeda sampai ~24 jam antara tenggat lewat dan status di database ikut
 * berubah. Tanpa perhitungan ini, penjual melihat listingnya masih "Tersedia"
 * padahal katalog sudah menyembunyikannya — membingungkan.
 *
 * Katalog sendiri TIDAK bergantung pada cron: query-nya sudah menyaring
 * `deadline_date >= hari ini`. Jadi tenggat selalu menang atas kolom status.
 * Aturan yang sama dipakai di sini supaya tampilan dan kenyataan cocok.
 *
 * Status yang sudah final (TAKEN, DELETED) tidak pernah ditimpa.
 */
export function statusEfektif(
  status: string,
  deadline: Date | string,
  now = new Date(),
): string {
  if (status !== "AVAILABLE") return status;
  return hariTersisaID(deadline, now) < 0 ? "EXPIRED" : status;
}

/** true kalau listing masih bisa diperbarui penjual. */
export function bisaDiubah(status: string): boolean {
  return status === "AVAILABLE";
}

/** Keterangan sisa waktu untuk dashboard penjual. */
export function keteranganSisaWaktu(deadline: Date | string, now = new Date()): string {
  const h = hariTersisaID(deadline, now);
  if (h < 0) {
    const lewat = Math.abs(h);
    return lewat === 1 ? "Tenggat lewat kemarin" : `Tenggat lewat ${lewat} hari lalu`;
  }
  if (h === 0) return "Tenggat hari ini, ini hari terakhir";
  if (h === 1) return "Tersisa 1 hari lagi";
  return `Tersisa ${h} hari lagi`;
}

/**
 * Terjemahan status ke bahasa penjual.
 *
 * "Kedaluwarsa" adalah istilah sistem yang membingungkan di dashboard —
 * penjual tidak merasa barangnya "kedaluwarsa", dia hanya kehabisan waktu.
 * Katalog tetap memakai LABEL_STATUS apa adanya.
 */
export const LABEL_STATUS_PENJUAL: Record<string, string> = {
  AVAILABLE: "Tersedia",
  TAKEN: "Sudah Diambil",
  EXPIRED: "Waktu Habis",
  DELETED: "Dihapus",
};
