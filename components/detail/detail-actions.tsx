"use client";

import { useState } from "react";
import { Button } from "@/components/shared/button";
import { IconWhatsApp, IconClock } from "@/components/shared/icons";
import { formatTanggalID } from "@/lib/format";
import { getUrgency } from "@/lib/urgency";
import { useToast } from "@/components/shared/toast";
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
  const { tampilkan } = useToast();
  const [memuat, setMemuat] = useState(false);
  const urgency = getUrgency(deadline);
  const mendesak = urgency === "urgent" || urgency === "today";
  const sudahDiambil = status === "TAKEN";

  const bukaWA = async () => {
    setMemuat(true);
    try {
      const r = await fetch(`/api/v1/listings/${listingId}/wa-click`, {
        method: "POST",
      });
      if (!r.ok) throw new Error();
      const j = (await r.json()) as { url: string };
      window.open(j.url, "_blank", "noopener,noreferrer");
    } catch {
      tampilkan("Gagal membuka WhatsApp. Coba lagi ya.", { jenis: "galat" });
    } finally {
      setMemuat(false);
    }
  };

  return (
    <div className="space-y-3">
      {/*
        Kartu tenggat.

        KENAPA gaya normalnya disamakan dengan kartu lain di kolom ini:
        versi sebelumnya memakai latar `appbg` (kanvas) dengan batas `line`,
        sementara dua kartu di atasnya memakai latar `surface` (putih). Jadi
        kartu ini terbaca sebagai kotak yang beda jenis, padahal isinya sama
        pentingnya. Sekarang ketiganya memakai latar dan batas yang sama, dan
        yang membedakan hanya WARNA saat tenggatnya benar-benar mendesak.

        Saat mendesak, barulah aksen terracotta muncul. Itu satu-satunya
        tempat aksen muncul di halaman ini, dan memang di situ aksen dipakai:
        untuk menandai satu hal yang butuh perhatian.
      */}
      {!ringkas && (
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-md border px-3.5 py-3",
          mendesak
            ? "border-accent-bright bg-accent-soft"
            : "border-line bg-surface",
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
                ? "Segera, batas pengambilan dekat"
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

      {!ringkas && (
        <p className="text-center text-[11.5px] leading-relaxed text-ink-secondary">
          Alamat kamar tidak ditampilkan publik. Penjemputan dilakukan sendiri
          oleh pembeli.
        </p>
      )}
    </div>
  );
}
