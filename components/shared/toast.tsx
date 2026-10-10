"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";
import { IconCheck, IconAlert, IconX } from "@/components/shared/icons";

type JenisToast = "sukses" | "galat" | "info";

type Toast = {
  id: number;
  jenis: JenisToast;
  pesan: string;
  /** true = sedang dianimasikan keluar. */
  keluar?: boolean;
  /** Aksi opsional, mis. "Urungkan". */
  aksi?: { label: string; onClick: () => void };
};

type KonteksToast = {
  tampilkan: (
    pesan: string,
    opsi?: {
      jenis?: JenisToast;
      durasi?: number;
      aksi?: { label: string; onClick: () => void };
    },
  ) => void;
};

const Konteks = createContext<KonteksToast | null>(null);

/**
 * Notifikasi ringkas (toast).
 *
 * KENAPA INI ADA:
 * Sebelumnya setiap aksi yang berhasil hanya mengubah tampilan halaman tanpa
 * memberi tahu apa pun — mis. setelah menghapus postingan, halaman berubah
 * begitu saja. Pengguna tidak yakin aksinya berhasil.
 *
 * Aturan yang dipegang (dari Spectrum UI toast-stack + COSS UI toast):
 *  - Maksimal 3 toast terlihat; yang lebih lama dibuang.
 *  - Sukses hilang sendiri setelah 3 detik; galat 6 detik karena perlu dibaca.
 *  - Selalu bisa ditutup manual, dan bisa dijeda saat kursor di atasnya.
 *  - Aksi opsional (mis. "Urungkan") hanya pada galat/perubahan penting.
 *  - role="status" + aria-live supaya pembaca layar ikut tahu.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [daftar, setDaftar] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const timerRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const hapus = useCallback((id: number) => {
    // Tandai keluar dulu supaya ada animasi, baru dibuang.
    setDaftar((d) => d.map((t) => (t.id === id ? { ...t, keluar: true } : t)));
    setTimeout(() => {
      setDaftar((d) => d.filter((t) => t.id !== id));
      const tm = timerRef.current.get(id);
      if (tm) {
        clearTimeout(tm);
        timerRef.current.delete(id);
      }
    }, 180);
  }, []);

  const tampilkan = useCallback<KonteksToast["tampilkan"]>(
    (pesan, opsi) => {
      const id = ++idRef.current;
      const jenis = opsi?.jenis ?? "sukses";
      const durasi = opsi?.durasi ?? (jenis === "galat" ? 6000 : 3000);

      setDaftar((d) => {
        const baru = [...d, { id, jenis, pesan, aksi: opsi?.aksi }];
        // Maksimal 3: buang yang paling lama tanpa animasi keluar.
        return baru.length > 3 ? baru.slice(baru.length - 3) : baru;
      });

      const tm = setTimeout(() => hapus(id), durasi);
      timerRef.current.set(id, tm);
    },
    [hapus],
  );

  // Bersihkan timer saat provider dilepas.
  useEffect(() => {
    const timers = timerRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const nilai = useMemo(() => ({ tampilkan }), [tampilkan]);

  return (
    <Konteks.Provider value={nilai}>
      {children}

      {/* Tumpukan toast — di bawah tab bar mobile supaya tidak menutupinya */}
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4",
          "bottom-[calc(var(--tabbar-h)+12px)] md:bottom-6",
        )}
      >
        {daftar.map((t) => (
          <div
            key={t.id}
            onMouseEnter={() => {
              const tm = timerRef.current.get(t.id);
              if (tm) {
                clearTimeout(tm);
                timerRef.current.delete(t.id);
              }
            }}
            onMouseLeave={() => {
              if (!timerRef.current.has(t.id)) {
                const tm = setTimeout(() => hapus(t.id), 1600);
                timerRef.current.set(t.id, tm);
              }
            }}
            className={cn(
              "pointer-events-auto flex w-full max-w-[440px] items-start gap-2.5",
              "rounded-md border px-3.5 py-3 shadow-card",
              t.keluar ? "animate-slide-out" : "animate-slide-up",
              t.jenis === "sukses" && "border-primary/30 bg-primary-soft",
              t.jenis === "galat" && "border-danger/30 bg-danger-soft",
              t.jenis === "info" && "border-line bg-surface",
            )}
          >
            <span
              className={cn(
                "mt-[1px] shrink-0",
                t.jenis === "sukses" && "text-primary-dark",
                t.jenis === "galat" && "text-danger",
                t.jenis === "info" && "text-ink-secondary",
              )}
            >
              {t.jenis === "sukses" ? <IconCheck size={16} /> : <IconAlert size={16} />}
            </span>

            <span
              className={cn(
                "flex-1 text-[13px] leading-relaxed",
                t.jenis === "galat" ? "text-danger" : "text-ink",
              )}
            >
              {t.pesan}
            </span>

            {t.aksi && (
              <button
                type="button"
                onClick={() => {
                  t.aksi?.onClick();
                  hapus(t.id);
                }}
                className="press shrink-0 rounded-sm px-2 py-1 text-[12.5px] font-semibold text-primary-dark hover:bg-primary/15"
              >
                {t.aksi.label}
              </button>
            )}

            <button
              type="button"
              onClick={() => hapus(t.id)}
              aria-label="Tutup notifikasi"
              className="press -mr-1 shrink-0 rounded-full p-1 text-ink-secondary hover:bg-black/5"
            >
              <IconX size={14} />
            </button>
          </div>
        ))}
      </div>
    </Konteks.Provider>
  );
}

/** Pakai di komponen mana pun: const { tampilkan } = useToast(); */
export function useToast(): KonteksToast {
  const k = useContext(Konteks);
  if (!k) {
    throw new Error("useToast harus dipakai di dalam <ToastProvider>.");
  }
  return k;
}
