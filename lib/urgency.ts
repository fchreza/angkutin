import { selisihHari } from "./format";

/**
 * Urgensi tenggat (FR-6). Ambang PERSIS dari PRD:
 *   > 3 hari  -> normal  ("Tersedia sampai ...", abu-abu)
 *   <= 2 hari -> urgent  ("Mendesak: sisa X hari", amber + ikon jam)
 *   hari-H    -> today   ("Berakhir hari ini", amber)
 *   < 0       -> expired
 */
export type Urgency = "normal" | "urgent" | "today" | "expired";

export function getUrgency(deadline: Date | string, now = new Date()): Urgency {
  const hari = selisihHari(deadline, now);
  if (hari < 0) return "expired";
  if (hari === 0) return "today";
  if (hari <= 2) return "urgent";
  return "normal";
}

/** Teks badge tenggat — microcopy dari PRD §15. */
export function labelTenggat(deadline: Date | string, now = new Date()): string {
  const u = getUrgency(deadline, now);
  const hari = selisihHari(deadline, now);

  if (u === "expired") return "Kedaluwarsa";
  if (u === "today") return "Berakhir hari ini";
  if (u === "urgent") return `Mendesak: sisa ${hari} hari`;

  // normal -> "Tersedia sampai Jumat, 17 Okt"
  const d = typeof deadline === "string" ? new Date(deadline) : deadline;
  const tgl = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
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
