"use client";

import { useRef, useState } from "react";
import { IconCamera, IconX, IconChevronRight } from "@/components/shared/icons";
import { Spinner } from "@/components/shared/spinner";
import { useToast } from "@/components/shared/toast";
import { cn } from "@/lib/cn";

/**
 * Pengelola foto untuk listing yang SUDAH tayang.
 *
 * BEDA dengan PhotoUploader (form pasang):
 *  - PhotoUploader memegang berkas di memori; belum ada apa pun di server.
 *  - Komponen ini memegang foto yang SUDAH tersimpan, dan setiap perubahan
 *    langsung dikirim ke server.
 *
 * KENAPA HARUS DIKIRIM SEKETIKA, BUKAN DITUNDA SAMPAI "SIMPAN":
 * Endpoint foto bekerja dengan cara MENUKAR seluruh daftar foto: foto lama
 * dihapus dari penyimpanan, foto baru diunggah. Kalau ditunda dan dicampur
 * dengan perubahan teks, satu kegagalan di tengah bisa membuat penjual
 * kehilangan foto tanpa tahu mana yang tersimpan. Mengirim per aksi membuat
 * setiap perubahan punya hasil yang jelas.
 *
 * Semua aksi lewat satu endpoint POST /api/v1/listings/:id/images dengan
 * `keep` untuk foto yang dipertahankan dan `images` untuk yang baru.
 */
const MAKS_FOTO = 3;

export type FotoTersimpan = { image_url: string; display_order: number };

export function PhotoManager({
  listingId,
  token,
  foto,
  onBerubah,
  nonaktif = false,
}: {
  listingId: string;
  token: string;
  foto: FotoTersimpan[];
  onBerubah: (f: FotoTersimpan[]) => void;
  /** true saat status listing tidak memungkinkan diubah (mis. sudah diambil). */
  nonaktif?: boolean;
}) {
  const { tampilkan } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [sedang, setSedang] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  /**
   * Kirim daftar foto final ke server.
   * `pertahankan` = URL foto lama yang tetap dipakai (urutannya menentukan
   * urutan tampil). `baru` = berkas yang baru dipilih.
   */
  async function simpan(pertahankan: string[], baru: File[]) {
    setSedang(true);
    setPesan(null);
    try {
      const fd = new FormData();
      fd.append("token", token);
      pertahankan.forEach((url) => fd.append("keep", url));
      baru.forEach((f) => fd.append("images", f));

      const r = await fetch(`/api/v1/listings/${listingId}/images`, {
        method: "POST",
        body: fd,
      });

      const j = (await r.json().catch(() => ({}))) as {
        images?: FotoTersimpan[];
        error?: string;
      };

      if (!r.ok) {
        setPesan(j.error ?? "Gagal menyimpan foto. Coba lagi.");
        return false;
      }

      if (j.images) onBerubah(j.images);
      return true;
    } catch {
      setPesan("Gagal menghubungi server. Periksa koneksi lalu coba lagi.");
      return false;
    } finally {
      setSedang(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  /** Kompres di perangkat dulu, sama seperti form pasang. */
  async function kompres(file: File): Promise<File> {
    const MAKS = 500 * 1024;
    const SISI = 1080;
    if (file.size <= MAKS && file.type === "image/webp") return file;

    const bitmap = await createImageBitmap(file);
    const skala = Math.min(1, SISI / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * skala);
    const h = Math.round(bitmap.height * skala);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    let kualitas = 0.82;
    let blob: Blob | null = null;
    for (let i = 0; i < 5; i++) {
      blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob((b) => res(b), "image/webp", kualitas),
      );
      if (blob && blob.size <= MAKS) break;
      kualitas -= 0.14;
      if (kualitas < 0.3) break;
    }
    if (!blob) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", {
      type: "image/webp",
    });
  }

  async function tambah(files: FileList | null) {
    if (!files || files.length === 0) return;
    const sisa = MAKS_FOTO - foto.length;
    if (sisa <= 0) {
      setPesan(`Maksimal ${MAKS_FOTO} foto.`);
      return;
    }

    setSedang(true);
    setPesan(null);
    const baru: File[] = [];
    for (const f of Array.from(files).slice(0, sisa)) {
      if (!f.type.startsWith("image/")) {
        setPesan(`${f.name} bukan file gambar.`);
        continue;
      }
      try {
        baru.push(await kompres(f));
      } catch {
        setPesan(`Gagal memproses ${f.name}.`);
      }
    }
    setSedang(false);

    if (baru.length === 0) return;

    // Foto lama dipertahankan (urutannya tetap), foto baru ditambahkan di akhir.
    const ok = await simpan(
      foto.map((f) => f.image_url),
      baru,
    );
    if (ok) tampilkan(baru.length === 1 ? "Foto ditambahkan." : `${baru.length} foto ditambahkan.`);
  }

  async function hapus(url: string) {
    if (foto.length <= 1) {
      setPesan("Minimal 1 foto. Tambahkan foto pengganti dulu.");
      return;
    }
    const sisa = foto.filter((f) => f.image_url !== url).map((f) => f.image_url);
    const ok = await simpan(sisa, []);
    if (ok) tampilkan("Foto dihapus.");
  }

  /** Tukar posisi: `arah` -1 = maju, +1 = mundur. Foto pertama = foto utama. */
  async function geser(i: number, arah: -1 | 1) {
    const j = i + arah;
    if (j < 0 || j >= foto.length) return;
    const urut = [...foto];
    [urut[i], urut[j]] = [urut[j], urut[i]];
    const ok = await simpan(
      urut.map((f) => f.image_url),
      [],
    );
    if (ok) tampilkan(arah === -1 ? "Foto dijadikan lebih utama." : "Urutan foto diubah.");
  }

  const terkunci = sedang || nonaktif;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label className="text-[13px] font-semibold text-ink">Foto barang</label>
        <span className="text-[11.5px] text-ink-secondary">
          {foto.length}/{MAKS_FOTO} foto
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {foto.map((f, i) => (
          <div
            key={f.image_url}
            className="group relative aspect-square overflow-hidden rounded-md border border-line bg-appbg"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={f.image_url}
              alt={`Foto ${i + 1}`}
              className="h-full w-full object-cover"
            />

            {i === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded-pill bg-primary px-2 py-[2px] text-[10px] font-bold text-white">
                UTAMA
              </span>
            )}

            {!terkunci && (
              <>
                <button
                  type="button"
                  onClick={() => void hapus(f.image_url)}
                  aria-label={`Hapus foto ${i + 1}`}
                  className="press absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink/75 text-white hover:bg-danger"
                >
                  <IconX size={13} />
                </button>

                {/* Geser urutan. Foto pertama otomatis jadi foto utama kartu. */}
                <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between">
                  <button
                    type="button"
                    onClick={() => void geser(i, -1)}
                    disabled={i === 0}
                    aria-label="Jadikan lebih utama"
                    className="press flex h-6 w-6 items-center justify-center rounded-full bg-ink/75 text-white hover:bg-primary disabled:opacity-30"
                  >
                    <IconChevronRight size={13} className="rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void geser(i, 1)}
                    disabled={i === foto.length - 1}
                    aria-label="Geser ke belakang"
                    className="press flex h-6 w-6 items-center justify-center rounded-full bg-ink/75 text-white hover:bg-primary disabled:opacity-30"
                  >
                    <IconChevronRight size={13} />
                  </button>
                </div>
              </>
            )}

            {terkunci && sedang && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                <Spinner ukuran={18} className="text-primary" />
              </div>
            )}
          </div>
        ))}

        {foto.length < MAKS_FOTO && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={terkunci}
            className={cn(
              "press flex aspect-square flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-line",
              "bg-appbg text-ink-secondary hover:border-primary hover:text-primary",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {sedang ? (
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
        onChange={(e) => void tambah(e.target.files)}
      />

      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-secondary">
        Foto pertama jadi foto utama di katalog. Foto dikompresi otomatis di
        perangkatmu (maks 500 KB).
      </p>

      {pesan && <p className="mt-1.5 text-[12px] text-danger">{pesan}</p>}
    </div>
  );
}
