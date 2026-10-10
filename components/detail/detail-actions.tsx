"use client";

import { useState } from "react";
import { Button } from "@/components/shared/button";
import { IconWhatsApp, IconClock } from "@/components/shared/icons";
import { formatTanggalID } from "@/lib/format";
import { getUrgency } from "@/lib/urgency";
import { cn } from "@/lib/cn";

/**
 * Kotak batas waktu + CTA WhatsApp (Layar 2).
 *
 * CTA memanggil POST /wa-click supaya:
 *  - nomor penjual tidak pernah sampai ke browser (anti-scraping)
 *  - klik tercatat untuk KPI CTR
 * Setelah dapat URL, buka di tab baru.
 */
export function DetailActions({
  listingId,
  deadline,
  status,
  ringkas = false,
}: {
  listingId: string;
  deadline: string;
  status: string;
  /** Versi ringkas untuk bar melekat di mobile: tanpa callout & catatan privasi. */
  ringkas?: boolean;
}) {
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const urgency = getUrgency(deadline);
  const mendesak = urgency === "urgent" || urgency === "today";
  const sudahDiambil = status === "TAKEN";

  const bukaWA = async () => {
    setMemuat(true);
    setGalat(null);
    try {
      const r = await fetch(`/api/v1/listings/${listingId}/wa-click`, {
        method: "POST",
      });
      if (!r.ok) throw new Error();
      const j = (await r.json()) as { url: string };
      window.open(j.url, "_blank", "noopener,noreferrer");
    } catch {
      setGalat("Gagal membuka WhatsApp. Coba lagi ya.");
    } finally {
      setMemuat(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Deadline callout — latar #FEF3C7, border #F59E0B (checklist desain) */}
      {!ringkas && (
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-md border px-3.5 py-3",
          mendesak
            ? "border-accent-bright bg-accent-soft"
            : "border-line bg-appbg",
        )}
      >
        <IconClock
          size={16}
          className={cn("mt-[1px] shrink-0", mendesak ? "text-accent" : "text-ink-secondary")}
        />
        <div className="text-[13px] leading-relaxed">
          <div className={cn("font-semibold", mendesak ? "text-accent-text" : "text-ink")}>
            {sudahDiambil
              ? "Barang ini sudah diambil"
              : mendesak
                ? "Segera — batas pengambilan dekat"
                : "Batas pengambilan"}
          </div>
          <div className={cn(mendesak ? "text-accent-text" : "text-ink-secondary")}>
            Barang harus diambil sebelum: {formatTanggalID(deadline)}
          </div>
        </div>
      </div>
      )}

      <Button
        varian="wa"
        ukuran="lg"
        penuh
        memuat={memuat}
        disabled={sudahDiambil}
        onClick={() => void bukaWA()}
      >
        {!memuat && <IconWhatsApp size={19} />}
        {sudahDiambil ? "Sudah Diambil" : "Ambil Barang via WhatsApp"}
      </Button>

      {galat && (
        <p className="text-center text-[12.5px] text-danger">{galat}</p>
      )}

      {!ringkas && (
        <p className="text-center text-[11.5px] leading-relaxed text-ink-secondary">
          Alamat kamar tidak ditampilkan publik. Penjemputan dilakukan sendiri
          oleh pembeli.
        </p>
      )}
    </div>
  );
}
