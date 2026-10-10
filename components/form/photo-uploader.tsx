"use client";

import { useCallback, useRef, useState } from "react";
import { IconCamera, IconX } from "@/components/shared/icons";
import { Spinner } from "@/components/shared/spinner";
import { cn } from "@/lib/cn";

/**
 * Unggah foto dengan KOMPRESI DI SISI KLIEN (FR-3 + NFR §11 no.1).
 *
 * Kenapa kompresi di klien:
 *  - Server Vercel membatasi body request 4.5 MB.
 *  - Pengguna di 3G tidak boleh mengunggah foto 4 MB dari kamera HP.
 *
 * Target: WebP, sisi terpanjang maks 1080px, < 500 KB per foto.
 * Memakai Canvas API bawaan browser — tanpa library tambahan supaya
 * bundel tetap kecil (FCP < 1.8s).
 */

const MAKS_FOTO = 3;
const MAKS_BYTE = 500 * 1024;
const SISI_MAKS = 1080;

export type FotoSiap = {
  file: File;
  preview: string;
  ukuranAwal: number;
};

/** Kompres satu gambar memakai canvas. Mengembalikan File WebP. */
async function kompres(file: File): Promise<File> {
  // Kalau sudah kecil dan sudah webp, lewati kompresi
  if (file.size <= MAKS_BYTE && file.type === "image/webp") return file;

  const bitmap = await createImageBitmap(file);
  const skala = Math.min(1, SISI_MAKS / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * skala);
  const h = Math.round(bitmap.height * skala);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  // Turunkan kualitas bertahap sampai di bawah 500 KB
  let kualitas = 0.82;
  let blob: Blob | null = null;

  for (let i = 0; i < 5; i++) {
    blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), "image/webp", kualitas),
    );
    if (blob && blob.size <= MAKS_BYTE) break;
    kualitas -= 0.14;
    if (kualitas < 0.3) break;
  }

  if (!blob) return file;

  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", {
    type: "image/webp",
  });
}

export function PhotoUploader({
  foto,
  setFoto,
  galat,
}: {
  foto: FotoSiap[];
  setFoto: (f: FotoSiap[]) => void;
  galat?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sedangKompres, setSedangKompres] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  const pilih = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setPesan(null);

      const sisaSlot = MAKS_FOTO - foto.length;
      if (sisaSlot <= 0) {
        setPesan(`Maksimal ${MAKS_FOTO} foto.`);
        return;
      }

      const dipilih = Array.from(files).slice(0, sisaSlot);
      setSedangKompres(true);

      const hasil: FotoSiap[] = [];
      for (const f of dipilih) {
        if (!f.type.startsWith("image/")) {
          setPesan(`${f.name} bukan file gambar.`);
          continue;
        }
        try {
          const kecil = await kompres(f);
          hasil.push({
            file: kecil,
            preview: URL.createObjectURL(kecil),
            ukuranAwal: f.size,
          });
        } catch {
          setPesan(`Gagal memproses ${f.name}.`);
        }
      }

      setFoto([...foto, ...hasil]);
      setSedangKompres(false);
      if (inputRef.current) inputRef.current.value = "";
    },
    [foto, setFoto],
  );

  const hapus = (i: number) => {
    URL.revokeObjectURL(foto[i].preview);
    setFoto(foto.filter((_, idx) => idx !== i));
  };

  const totalKB = Math.round(foto.reduce((a, f) => a + f.file.size, 0) / 1024);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label className="text-[13px] font-semibold text-ink">
          Foto barang <span className="text-danger">*</span>
        </label>
        <span className="text-[11.5px] text-ink-secondary">
          {foto.length}/{MAKS_FOTO} foto
          {foto.length > 0 && ` · ${totalKB} KB`}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {foto.map((f, i) => (
          <div
            key={f.preview}
            className="animate-pop group relative aspect-square overflow-hidden rounded-md border border-line bg-appbg"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={f.preview}
              alt={`Foto ${i + 1}`}
              className="h-full w-full object-cover"
            />
            {i === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded-pill bg-primary px-2 py-[2px] text-[10px] font-bold text-white">
                UTAMA
              </span>
            )}
            <button
              type="button"
              onClick={() => hapus(i)}
              aria-label={`Hapus foto ${i + 1}`}
              className="press absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink/75 text-white hover:bg-danger"
            >
              <IconX size={13} />
            </button>
          </div>
        ))}

        {foto.length < MAKS_FOTO && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={sedangKompres}
            className={cn(
              "press flex aspect-square flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-line",
              "bg-appbg text-ink-secondary hover:border-primary hover:text-primary",
              "disabled:cursor-wait disabled:opacity-60",
            )}
          >
            {sedangKompres ? (
              <Spinner ukuran={20} className="text-primary" />
            ) : (
              <>
                <IconCamera size={22} />
                <span className="text-[11px] font-medium">Tambah</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void pilih(e.target.files)}
      />

      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-secondary">
        Foto dikompresi otomatis di perangkatmu (maks 500 KB). Foto pertama
        jadi foto utama.
      </p>

      {(pesan || galat) && (
        <p className="mt-1.5 text-[12px] text-danger">{pesan || galat}</p>
      )}
    </div>
  );
}
