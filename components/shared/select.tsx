"use client";

import { useId, useRef, useState } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@/lib/cn";
import { IconCheck, IconChevronDown } from "./icons";

/**
 * Dropdown (select) dengan menu melayang.
 *
 * KONSEP DARI uiarc.dev/components/select.
 *
 * APA YANG DIAMBIL DARI REFERENSI:
 *   - Menunya MELAYANG di atas halaman (portal), bukan daftar bawaan sistem.
 *     Lebarnya persis selebar pemicunya, jadi tidak ada menu yang lebih lebar
 *     atau lebih sempit dari kotaknya.
 *   - Nilai yang tampil BERGULIR mengikuti arah daftar: memilih opsi yang
 *     lebih bawah -> teks baru masuk dari bawah; memilih yang lebih atas ->
 *     masuk dari atas. Arah ini yang membuat perpindahannya terasa seperti
 *     satu gerakan, bukan sekadar teks yang berganti.
 *   - Panah berputar 180 derajat saat menu terbuka.
 *   - Tanda centang pada opsi terpilih muncul dengan sedikit membesar.
 *   - Tombol gulir di atas/bawah untuk daftar panjang.
 *   - `collisionPadding`: menu menjauh 12px dari tepi layar, dan Radix
 *     membalik arahnya sendiri kalau ruang di bawah tidak cukup.
 *
 * KENAPA MEMAKAI @radix-ui/react-select:
 *   <select> bawaan tidak bisa digayakan menunya — daftar opsinya digambar
 *   sistem operasi, jadi mustahil dibuat modern. Untuk punya menu sendiri
 *   dengan tampilan yang bisa diatur, kita harus membangun listbox sendiri.
 *   Itu bagian yang paling mudah salah: peran ARIA, navigasi panah,
 *   ketikan-untuk-mencari, fokus terkunci di dalam menu, pengembalian fokus
 *   saat ditutup, dan penempatan yang tidak terpotong tepi layar.
 *   Radix sudah menyelesaikan semuanya dan teruji; yang kita tulis hanya
 *   tampilannya. Memakai ulang itu lebih baik daripada menulis listbox
 *   setengah benar sendiri.
 *
 * YANG SENGAJA TIDAK DIPAKAI:
 *   - `motion` (framer-motion) dan `lucide-react` dari referensi. Keduanya
 *     hanya dipakai untuk animasi dan ikon, dan kita sudah punya keduanya
 *     dalam bentuk CSS keyframes serta komponen ikon sendiri. Menambah
 *     ~1,1 MB untuk itu tidak sepadan — animasinya sama, hasilnya sama.
 *
 * CATATAN PENTING SOAL UKURAN:
 *   Pemicunya TIDAK boleh mengecil saat ditekan. Radix membuka menu pada
 *   `pointerdown` dan MENGUKUR kotak pemicu saat itu juga; kalau ada animasi
 *   skala, ukuran yang terukur ikut berubah dan menunya jadi tidak pas.
 *   Karena itu umpan balik tekan di sini hanya perubahan warna.
 */

type Opsi = { value: string; label: string };

export function Select({
  nilai,
  onUbah,
  opsi,
  placeholder,
  salah = false,
  disabled = false,
  id,
  className,
  "aria-label": ariaLabel,
}: {
  nilai: string;
  onUbah: (v: string) => void;
  /** Opsi dropdown. */
  opsi: Opsi[];
  /** Teks saat belum ada yang dipilih. */
  placeholder?: string;
  /** true = border merah (validasi gagal). */
  salah?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const idOtomatis = useId();
  const kontrolId = id ?? idOtomatis;

  /**
   * Arah gulir teks nilai.
   *
   * Disimpan di state dan diperbarui SAAT RENDER (pola yang React izinkan
   * untuk menyesuaikan state terhadap prop): kalau indeks berubah, kita tahu
   * arahnya sebelum sempat digambar, jadi animasinya langsung benar dan tidak
   * ada satu frame yang menampilkan arah lama.
   */
  const indeks = opsi.findIndex((o) => o.value === nilai);
  const [indeksSebelumnya, setIndeksSebelumnya] = useState(indeks);
  const [arah, setArah] = useState(1);
  if (indeksSebelumnya !== indeks) {
    setIndeksSebelumnya(indeks);
    setArah(indeks > indeksSebelumnya ? 1 : -1);
  }

  const terpilih = nilai ? opsi[indeks] : undefined;

  /**
   * Radix memakai `value=""` untuk keadaan kosong, dan tidak boleh ada
   * SelectItem dengan value kosong (itu placeholder). Karena pemanggil kita
   * memakai string kosong untuk "belum dipilih", nilai itu kita ubah jadi
   * undefined supaya Radix menampilkan placeholder.
   */
  const nilaiRadix = nilai === "" ? undefined : nilai;

  return (
    <div className={cn("relative", className)}>
      <SelectPrimitive.Root
        value={nilaiRadix}
        disabled={disabled}
        onValueChange={onUbah}
      >
        <SelectPrimitive.Trigger
          id={kontrolId}
          aria-label={ariaLabel}
          aria-invalid={salah || undefined}
          className={cn(
            "group flex h-11 w-full items-center justify-between gap-3",
            "rounded-md border bg-surface pl-3 pr-3 text-left",
            "text-[14px] text-ink",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-primary/20",
            salah
              ? "border-danger focus:border-danger"
              : "border-line hover:border-line-kuat focus:border-primary",
            "data-[state=open]:border-primary",
            disabled &&
              "cursor-not-allowed border-line bg-appbg text-ink-secondary",
            disabled && "hover:border-line",
          )}
        >
          {/*
           * Nilai asli tetap ada untuk pembaca layar (teksnya disembunyikan
           * secara visual). Teks yang terlihat di bawahnya yang dianimasikan,
           * jadi pengumuman ke pembaca layar tidak ikut berkedip.
           */}
          <span className="sr-only">
            <SelectPrimitive.Value placeholder={placeholder ?? ""} />
          </span>

          <span
            className="flex-1 min-w-0 overflow-hidden"
            aria-hidden
          >
            {/*
             * `key` berubah saat nilainya berganti -> React memasang ulang
             * elemen ini -> animasi masuknya berjalan lagi. Arahnya dari
             * data-arah, jadi teks baru datang dari sisi yang benar.
             */}
            <span
              key={nilai || "__kosong"}
              data-arah={arah === 1 ? "bawah" : "atas"}
              className={cn(
                "nilai-pilihan block truncate",
                !terpilih && "text-ink-mono",
              )}
            >
              {terpilih ? terpilih.label : (placeholder ?? "")}
            </span>
          </span>

          <SelectPrimitive.Icon asChild>
            <span
              className={cn(
                "shrink-0 transition-transform duration-300",
                "ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                "group-data-[state=open]:rotate-180",
                disabled ? "text-ink-secondary/50" : "text-ink-secondary",
              )}
            >
              <IconChevronDown size={15} />
            </span>
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            collisionPadding={12}
            className={cn(
              "menu-pilihan z-[1000] overflow-hidden",
              "w-[var(--radix-select-trigger-width)]",
              "max-h-[min(320px,var(--radix-select-content-available-height))]",
              "rounded-md border border-line bg-surface p-1.5",
              "text-ink shadow-lg",
            )}
          >
            <SelectPrimitive.ScrollUpButton className="flex h-7 items-center justify-center text-ink-secondary">
              <IconChevronDown size={15} className="rotate-180" />
            </SelectPrimitive.ScrollUpButton>

            <SelectPrimitive.Viewport>
              {opsi.map((o) => (
                <SelectPrimitive.Item
                  key={o.value}
                  value={o.value}
                  className={cn(
                    "relative flex min-h-9 cursor-default select-none items-center",
                    "rounded-[4px] py-2 pl-2.5 pr-8 text-[14px] text-ink",
                    "outline-none",
                    "data-[highlighted]:bg-surface2",
                    "data-[disabled]:opacity-45",
                  )}
                >
                  <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-2.5 inline-flex items-center text-primary">
                    <IconCheck size={15} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>

            <SelectPrimitive.ScrollDownButton className="flex h-7 items-center justify-center text-ink-secondary">
              <IconChevronDown size={15} />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}
