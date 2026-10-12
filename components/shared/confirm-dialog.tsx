"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";
import { IconAlert } from "./icons";

/**
 * Modal konfirmasi untuk tindakan merusak (hapus, batalkan, timpa).
 *
 * ATURAN PRODUK: tindakan merusak tidak boleh pernah dijalankan tanpa
 * konfirmasi. Komponen ini yang menyediakannya, supaya tidak ada layar yang
 * perlu menulis modal sendiri dan lupa memasangnya.
 *
 * Perilaku penting:
 *  - Fokus dipindah ke dalam modal saat dibuka, dan dikembalikan setelah tutup.
 *  - Esc membatalkan; klik latar juga membatalkan.
 *  - Fokus terkunci di dalam modal (Tab tidak bisa keluar ke halaman belakang).
 *  - Selama proses berjalan, modal tidak bisa ditutup — supaya tidak ada
 *    permintaan yang setengah jalan.
 *  - Tombol batal menerima fokus awal, bukan tombol merusak.
 */
export function ConfirmDialog({
  buka,
  judul,
  keterangan,
  labelKonfirmasi = "Ya, Lanjutkan",
  labelBatal = "Batal",
  merusak = true,
  sedangProses = false,
  onKonfirmasi,
  onBatal,
}: {
  buka: boolean;
  judul: string;
  keterangan?: string;
  labelKonfirmasi?: string;
  labelBatal?: string;
  /** true = gaya merah (hapus). false = gaya biasa. */
  merusak?: boolean;
  sedangProses?: boolean;
  onKonfirmasi: () => void;
  onBatal: () => void;
}) {
  const refPanel = useRef<HTMLDivElement>(null);
  const refBatal = useRef<HTMLButtonElement>(null);
  const refPemicu = useRef<Element | null>(null);

  // Callback disimpan di ref supaya efek di bawah tidak ikut jalan ulang
  // setiap induknya render. Tanpa ini, fokus akan terus dilompatkan kembali
  // ke tombol Batal tiap kali status berubah — termasuk saat proses berjalan.
  const refBatalCb = useRef(onBatal);
  const refProses = useRef(sedangProses);
  refBatalCb.current = onBatal;
  refProses.current = sedangProses;

  useEffect(() => {
    if (!buka) return;

    // Simpan elemen yang membuka modal, untuk dikembalikan fokusnya nanti.
    refPemicu.current = document.activeElement;

    // Fokus awal ke tombol batal — BUKAN tombol merusak.
    const t = setTimeout(() => refBatal.current?.focus(), 30);

    // Kunci scroll latar supaya halaman tidak bergerak di balik modal.
    const overflowAsli = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !refProses.current) {
        refBatalCb.current();
        return;
      }
      if (e.key !== "Tab" || !refPanel.current) return;

      // Jaga fokus tetap di dalam modal.
      const fokusable = refPanel.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (fokusable.length === 0) return;
      const pertama = fokusable[0];
      const terakhir = fokusable[fokusable.length - 1];

      if (e.shiftKey && document.activeElement === pertama) {
        e.preventDefault();
        terakhir.focus();
      } else if (!e.shiftKey && document.activeElement === terakhir) {
        e.preventDefault();
        pertama.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowAsli;
      // Kembalikan fokus ke elemen pemicu.
      (refPemicu.current as HTMLElement | null)?.focus?.();
    };
  }, [buka]);

  if (!buka) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      onClick={() => {
        if (!sedangProses) onBatal();
      }}
    >
      <div
        ref={refPanel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="judul-konfirmasi"
        aria-describedby={keterangan ? "keterangan-konfirmasi" : undefined}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "animate-slide-up w-full max-w-[440px] rounded-t-lg bg-surface p-5 shadow-card",
          "sm:animate-pop sm:rounded-lg",
        )}
      >
        <div className="mb-3 flex items-start gap-3">
          {merusak && (
            <span className="mt-[2px] shrink-0 rounded-full bg-danger-soft p-2 text-danger">
              <IconAlert size={18} />
            </span>
          )}
          <div className="min-w-0">
            <h3
              id="judul-konfirmasi"
              className="font-display text-[17px] font-bold leading-snug text-ink"
            >
              {judul}
            </h3>
            {keterangan && (
              <p
                id="keterangan-konfirmasi"
                className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary"
              >
                {keterangan}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={refBatal}
            type="button"
            onClick={onBatal}
            disabled={sedangProses}
            className={cn(
              "press h-11 rounded-md border border-line bg-surface px-4",
              "text-[14px] font-semibold text-ink hover:bg-appbg",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {labelBatal}
          </button>

          <button
            type="button"
            onClick={onKonfirmasi}
            disabled={sedangProses}
            aria-busy={sedangProses || undefined}
            className={cn(
              "press inline-flex h-11 items-center justify-center gap-2 rounded-md px-4",
              "text-[14px] font-semibold text-surface",
              "disabled:cursor-not-allowed disabled:opacity-60",
              merusak ? "bg-danger hover:bg-[#b91c1c]" : "bg-primary hover:bg-primary-dark",
            )}
          >
            {sedangProses && <Spinner ukuran={14} />}
            {labelKonfirmasi}
          </button>
        </div>
      </div>
    </div>
  );
}
