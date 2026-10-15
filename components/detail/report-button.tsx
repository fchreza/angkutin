"use client";

import { useState } from "react";
import { Button } from "@/components/shared/button";
import { useToast } from "@/components/shared/toast";

/**
 * Tombol "Laporkan" di halaman detail barang.
 *
 * KENAPA ADA: marketplace tanpa akun tidak punya identitas yang bisa
 * diblokir, jadi satu-satunya pertahanan terhadap spam/penipuan adalah
 * laporan pengguna + tinjauan admin. Sebelum komponen ini ada, tidak ada
 * saluran resmi sama sekali untuk melaporkan listing bermasalah.
 *
 * KENAPA BENTUKNYA DIALOG SEDERHANA, bukan halaman baru: pelapor sedang
 * melihat barang yang bermasalah — memindahkannya ke halaman lain memutus
 * konteks dan menurunkan kemungkinan laporan terkirim.
 *
 * Laporan TIDAK langsung menindak: ia masuk antrian OPEN yang ditinjau admin
 * di /admin, karena laporan bisa salah atau jahat.
 */

const ALASAN: { nilai: string; label: string }[] = [
  { nilai: "SPAM", label: "Spam / iklan tidak relevan" },
  { nilai: "PENIPUAN", label: "Indikasi penipuan" },
  { nilai: "BARANG_SUDAH_TIDAK_ADA", label: "Barang sebenarnya sudah tidak ada" },
  { nilai: "KONTEN_TIDAK_PANTAS", label: "Konten tidak pantas" },
  { nilai: "LAINNYA", label: "Lainnya" },
];

export function ReportButton({ listingId }: { listingId: string }) {
  const { tampilkan } = useToast();
  const [terbuka, setTerbuka] = useState(false);
  const [alasan, setAlasan] = useState(ALASAN[0].nilai);
  const [detail, setDetail] = useState("");
  const [mengirim, setMengirim] = useState(false);
  const [terkirim, setTerkirim] = useState(false);

  const kirim = async () => {
    setMengirim(true);
    try {
      const r = await fetch("/api/v1/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listingId,
          reason: alasan,
          detail: detail.trim() || undefined,
        }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Gagal mengirim laporan. Coba lagi ya.");
      }
      setTerkirim(true);
      setTerbuka(false);
      tampilkan("Laporan terkirim. Terima kasih sudah membantu menjaga Angkutin.", {
        jenis: "sukses",
      });
    } catch (e) {
      tampilkan(
        e instanceof Error ? e.message : "Gagal mengirim laporan. Coba lagi ya.",
        { jenis: "galat" },
      );
    } finally {
      setMengirim(false);
    }
  };

  return (
    <div className="mt-6">
      {terkirim ? (
        <p className="text-[13px] text-ink-secondary">
          Laporanmu sudah kami terima dan akan ditinjau. Terima kasih.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setTerbuka((v) => !v)}
          className="text-[13px] text-ink-secondary underline decoration-dotted underline-offset-4 transition-colors hover:text-ink"
          aria-expanded={terbuka}
        >
          Laporkan listing ini
        </button>
      )}

      {terbuka && !terkirim && (
        <div className="mt-3 rounded-lg border border-line bg-surface2 p-4">
          <label
            htmlFor="alasan-lapor"
            className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-mono"
          >
            Alasan laporan
          </label>
          <select
            id="alasan-lapor"
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-line bg-surface px-3 text-[14px] text-ink"
          >
            {ALASAN.map((a) => (
              <option key={a.nilai} value={a.nilai}>
                {a.label}
              </option>
            ))}
          </select>

          <label
            htmlFor="detail-lapor"
            className="mt-3 block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-mono"
          >
            Keterangan tambahan <span className="font-normal normal-case">(opsional)</span>
          </label>
          <textarea
            id="detail-lapor"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Contoh: nomor WA tidak aktif, foto bukan barang aslinya…"
            className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-[14px] text-ink placeholder:text-ink-mono"
          />

          <div className="mt-3 flex gap-2">
            <Button
              varian="primary"
              ukuran="md"
              onClick={kirim}
              disabled={mengirim}
            >
              {mengirim ? "Mengirim…" : "Kirim laporan"}
            </Button>
            <Button
              varian="ghost"
              ukuran="md"
              onClick={() => setTerbuka(false)}
              disabled={mengirim}
            >
              Batal
            </Button>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-secondary">
            Laporanmu anonim dan hanya dipakai untuk ditinjau oleh tim Angkutin.
          </p>
        </div>
      )}
    </div>
  );
}
