"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconCamera, IconX, IconUpload } from "@/components/shared/icons";
import { cn } from "@/lib/cn";

/**
 * Unggah foto dengan KOMPRESI DI SISI KLIEN (FR-3 + NFR §11 no.1).
 *
 * Kenapa kompresi di klien:
 *  - Server Vercel membatasi body request 4.5 MB.
 *  - Pengguna di 3G tidak boleh mengunggah foto 4 MB dari kamera HP.
 *
 * Target: WebP, sisi terpanjang maks 1080px, < 500 KB per foto.
 * Memakai Canvas API bawaan browser — tanpa library tambahan.
 *
 * ---------------------------------------------------------------------------
 * KONSEP TAMPILAN DARI boardui.com/components/file-upload
 * ---------------------------------------------------------------------------
 * Komponen referensinya mengunggah SATU file dengan progres SIMULASI. Kita
 * butuh tiga hal yang berbeda, jadi yang diambil hanya teknik tampilannya:
 *
 *   1. PERMUKAAN DRAG-AND-DROP. Seluruh area foto menerima file yang
 *      dijatuhkan. Sebelumnya hanya bisa lewat tombol pilih file — di desktop
 *      menyeret foto dari folder adalah cara yang paling wajar.
 *
 *   2. CINCIN PROGRES KELILING. Sebuah path SVG menelusuri tepi kotak mulai
 *      dari tengah-atas searah jarum jam. Bukan progress bar lurus: cincinnya
 *      membingkai area yang sedang diproses, jadi terlihat menyatu.
 *      Teknik `pathLength={100}` membuat `stroke-dasharray` bisa langsung
 *      memakai angka persen, tanpa menghitung panjang path sebenarnya.
 *
 *   3. BADGE PERSEN yang melayang di tepi atas, muncul dengan naik dari blur.
 *
 *   4. REVEAL BERTAHAP: ikon, teks, lalu keterangan masuk berurutan dengan
 *      naik dari blur — bukan muncul serentak.
 *
 * YANG SENGAJA TIDAK DIPAKAI:
 *   `@remixicon/react` dari referensi (hanya untuk ikon; kita punya ikon
 *   sendiri) dan `template-copy` (sistem pelokalan mereka; UI kita Bahasa
 *   Indonesia langsung).
 *
 * PROGRESNYA NYATA, BUKAN SIMULASI:
 *   Referensinya mensimulasikan unggahan dengan timer. Di sini yang dilaporkan
 *   adalah kemajuan KOMPRESI yang sebenarnya — berapa file yang sudah selesai
 *   diproses dari berapa file yang dipilih. Jadi angkanya jujur.
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

/**
 * Path cincin mengelilingi kotak, mulai dari tengah-atas searah jarum jam.
 *
 * Titik awalnya sengaja di tengah-atas supaya progresnya terbaca seperti
 * jam: mulai dari puncak, berputar ke kanan. Kalau mulai dari sudut, mata
 * tidak punya titik acuan yang jelas.
 */
function pathCincin(lebar: number, tinggi: number, inset: number, radius: number) {
  const x0 = inset;
  const y0 = inset;
  const x1 = lebar - inset;
  const y1 = tinggi - inset;
  const busur = (keX: number, keY: number) => `A ${radius} ${radius} 0 0 1 ${keX} ${keY}`;

  return [
    `M ${lebar / 2} ${y0}`,
    `H ${x1 - radius}`,
    busur(x1, y0 + radius),
    `V ${y1 - radius}`,
    busur(x1 - radius, y1),
    `H ${x0 + radius}`,
    busur(x0, y1 - radius),
    `V ${y0 + radius}`,
    busur(x0 + radius, y0),
    "Z",
  ].join(" ");
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
  const kotakRef = useRef<HTMLDivElement>(null);
  const [sedangKompres, setSedangKompres] = useState(false);
  const [kemajuan, setKemajuan] = useState(0);
  const [pesan, setPesan] = useState<string | null>(null);
  const [seretDiAtas, setSeretDiAtas] = useState(false);

  /**
   * Ukuran kotak dipantau supaya cincin SVG-nya bisa digambar mengikuti
   * ukuran sebenarnya. Tanpa ini pathnya akan salah saat lebar berubah
   * (mis. layar diputar atau jendela diubah ukurannya).
   */
  const [kotak, setKotak] = useState({ lebar: 0, tinggi: 0 });

  useEffect(() => {
    const el = kotakRef.current;
    if (!el) return;
    const pengamat = new ResizeObserver(([entri]) => {
      const { width, height } = entri.contentRect;
      if (width > 0) setKotak({ lebar: width, tinggi: height });
    });
    pengamat.observe(el);
    return () => pengamat.disconnect();
  }, []);

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
      setKemajuan(0);

      const hasil: FotoSiap[] = [];
      for (let i = 0; i < dipilih.length; i++) {
        const f = dipilih[i];
        if (!f.type.startsWith("image/")) {
          setPesan(`${f.name} bukan file gambar.`);
          // Tetap hitung sebagai selesai supaya cincinnya tidak menggantung.
          setKemajuan(Math.round(((i + 1) / dipilih.length) * 100));
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
        // Kemajuan NYATA: berapa file yang sudah selesai diproses.
        setKemajuan(Math.round(((i + 1) / dipilih.length) * 100));
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

  /** Terima file yang dijatuhkan ke area mana pun di dalam kotak. */
  const jatuhkan = (e: React.DragEvent) => {
    e.preventDefault();
    setSeretDiAtas(false);
    if (sedangKompres) return;
    void pilih(e.dataTransfer.files);
  };

  const totalKB = Math.round(foto.reduce((a, f) => a + f.file.size, 0) / 1024);
  const kosong = foto.length === 0;
  const pathProgres = kotak.lebar > 0 ? pathCincin(kotak.lebar, kotak.tinggi, 1, 12) : "";

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

      {/* Permukaan drag-and-drop. Seluruh area ini menerima file yang dijatuhkan. */}
      <div
        ref={kotakRef}
        onDragOver={(e) => {
          e.preventDefault();
          if (!sedangKompres) setSeretDiAtas(true);
        }}
        onDragLeave={(e) => {
          // Hanya lepas saat benar-benar keluar dari kotak, bukan saat
          // berpindah antar elemen di dalamnya.
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setSeretDiAtas(false);
        }}
        onDrop={jatuhkan}
        className={cn(
          "relative rounded-lg p-2.5 transition-colors duration-300",
          kosong ? "bg-appbg" : "bg-transparent",
        )}
      >
        {/*
         * Cincin progres. Dua lapis:
         *  - `rect` abu-abu = jalur yang belum dilalui (hanya saat sibuk)
         *  - `path` emerald  = bagian yang sudah dilalui
         *
         * `pathLength={100}` menormalkan panjang path jadi 100, jadi
         * strokeDasharray bisa langsung memakai angka persen.
         */}
        <svg
          aria-hidden
          viewBox={`0 0 ${kotak.lebar || 1} ${kotak.tinggi || 1}`}
          preserveAspectRatio="none"
          className={cn(
            "pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-300",
            sedangKompres ? "opacity-100" : "opacity-0",
          )}
        >
          {pathProgres && (
            <>
              <rect
                x={1}
                y={1}
                width={Math.max(0, kotak.lebar - 2)}
                height={Math.max(0, kotak.tinggi - 2)}
                rx={12}
                fill="none"
                stroke="rgb(var(--w-line))"
                strokeWidth={2}
              />
              <path
                d={pathProgres}
                fill="none"
                stroke="rgb(var(--w-primary))"
                strokeWidth={2}
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={`${kemajuan} 200`}
                className="transition-[stroke-dasharray] duration-200 ease-linear"
              />
            </>
          )}
        </svg>

        {/* Badge persen — melayang di tepi atas, naik dari blur saat muncul. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -top-2.5 left-1/2 -translate-x-1/2",
            "rounded-pill bg-primary px-2 py-[2px] text-[10.5px] font-bold",
            "tabular-nums text-primary-teks whitespace-nowrap",
            "[transition:opacity_160ms_ease-out,filter_160ms_ease-out,translate_300ms_ease-out]",
            sedangKompres
              ? "translate-y-0 opacity-100 blur-0"
              : "-translate-y-2.5 opacity-0 blur-[2px]",
          )}
        >
          {kemajuan}%
        </div>

        {/* Grid foto */}
        {!kosong && (
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
                  <span className="absolute left-1.5 top-1.5 rounded-pill bg-scrim-kuat/90 px-2 py-[2px] text-[10px] font-bold text-white">
                    UTAMA
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => hapus(i)}
                  aria-label={`Hapus foto ${i + 1}`}
                  className="press absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-scrim-kuat/85 text-white hover:bg-danger"
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
                <IconCamera size={22} />
                <span className="text-[11px] font-medium">Tambah</span>
              </button>
            )}
          </div>
        )}

        {/*
         * Keadaan kosong. Ketiga barisnya masuk BERTAHAP dengan naik dari blur
         * (ikon, lalu teks, lalu keterangan) — bukan muncul serentak.
         */}
        {kosong && !sedangKompres && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2.5 rounded-md border-2 border-dashed border-line px-4 py-7 text-center"
          >
            <span className="baris-muncul flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft">
              <IconUpload size={20} className="text-primary" />
            </span>
            <span
              className="baris-muncul text-[13px] font-medium text-ink-secondary"
              style={{ "--d": "60ms" } as React.CSSProperties}
            >
              Seret foto ke sini, atau <span className="text-primary">pilih file</span>
            </span>
            <span
              className="baris-muncul text-[11.5px] text-ink-mono"
              style={{ "--d": "120ms" } as React.CSSProperties}
            >
              JPG atau PNG · maks {MAKS_FOTO} foto · dikompresi otomatis
            </span>
          </button>
        )}

        {/* Saat sedang kompresi dan belum ada foto: penanda proses */}
        {kosong && sedangKompres && (
          <div className="flex w-full flex-col items-center justify-center gap-2 px-4 py-7 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft">
              <IconUpload size={20} className="text-primary" />
            </span>
            <span className="text-[13px] font-medium text-ink-secondary">
              Memproses foto…
            </span>
          </div>
        )}

        {/* Lapisan saat file diseret di atas area ini */}
        {seretDiAtas && !sedangKompres && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary-soft/90">
            <span className="text-[13px] font-semibold text-primary-dark">
              Lepas untuk menambahkan
            </span>
          </div>
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
