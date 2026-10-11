"use client";

import { useState } from "react";
import { PhotoUploader, type FotoSiap } from "./photo-uploader";
import { LivePreview } from "./live-preview";
import {
  FormListingFields,
  GalatUmum,
  nilaiAwal,
  payloadDari,
  rapikanGalatServer,
  validasiForm,
  type Galat,
  type NilaiForm,
} from "./form-fields";
import { Button } from "@/components/shared/button";
import { SuksesPasang, type RingkasanListing } from "@/components/manage/sukses-pasang";
import type { Kategori } from "@/components/feed/filter-pills";

/**
 * Form Pasang Listing (Layar 3).
 *
 * Alur dua langkah (lihat catatan di app/api/v1/listings/route.ts):
 *   1. POST /api/v1/listings        -> dapat id + secret_token
 *   2. POST /api/v1/listings/:id/images -> unggah foto
 * Kalau langkah 2 gagal, listing TETAP tayang dan pengguna dibawa ke
 * dashboard dengan peringatan — bukan kehilangan seluruh isian.
 *
 * Isian bersama dengan form edit ada di `form-fields.tsx`, supaya aturan
 * validasi keduanya tidak mungkin menyimpang.
 */
export function FormPasang({ kategori }: { kategori: Kategori[] }) {
  const [foto, setFoto] = useState<FotoSiap[]>([]);
  const [nilai, setNilai] = useState<NilaiForm>(() =>
    nilaiAwal(kategori[0]?.id ?? ""),
  );
  const [galat, setGalat] = useState<Galat>({});
  const [galatUmum, setGalatUmum] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);

  // Hasil setelah listing tersimpan. Selama ini terisi, layar persetujuan
  // yang tampil — bukan dashboard — supaya berkas foto masih ada di memori
  // dan bisa diunggah ulang kalau gagal.
  const [hasil, setHasil] = useState<{
    id: string;
    token: string;
    fotoGagal: boolean;
    pesanFoto?: string;
  } | null>(null);
  const [sedangUlang, setSedangUlang] = useState(false);

  const ubah = <K extends keyof NilaiForm>(k: K, v: NilaiForm[K]) =>
    setNilai((s) => ({ ...s, [k]: v }));

  const wilayahNama = [nilai.wilayah.district_name, nilai.wilayah.regency_name]
    .filter(Boolean)
    .join(", ");

  const angkaHarga = Number((nilai.harga || "0").replace(/\./g, ""));

  const tenggatTampil = nilai.tenggat
    ? new Intl.DateTimeFormat("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(new Date(`${nilai.tenggat}T00:00:00`))
    : "";

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setGalat({});
    setGalatUmum(null);

    const g = validasiForm(nilai, { wajibFoto: true, jumlahFoto: foto.length });

    if (Object.keys(g).length > 0) {
      setGalat(g);
      setGalatUmum("Masih ada isian yang perlu diperbaiki.");
      document
        .querySelector("[data-galat='1']")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setMengirim(true);
    try {
      const r1 = await fetch("/api/v1/listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payloadDari(nilai)),
      });

      if (!r1.ok) {
        const j = (await r1.json().catch(() => ({}))) as {
          error?: string;
          detail?: Galat;
        };
        if (j.detail) setGalat(rapikanGalatServer(j.detail));
        setGalatUmum(j.error ?? "Gagal menayangkan listing. Coba lagi.");
        setMengirim(false);
        return;
      }

      const { id, secret_token } = (await r1.json()) as {
        id: string;
        secret_token: string;
        manage_url: string;
      };

      // Langkah 2: unggah foto. Kegagalan di sini TIDAK membatalkan listing.
      const { gagal: gagalFoto, pesan: pesanFoto } = await unggahFoto(
        id,
        secret_token,
      );

      setHasil({ id, token: secret_token, fotoGagal: gagalFoto, pesanFoto });
      setMengirim(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setGalatUmum("Gagal menghubungi server. Periksa koneksi lalu coba lagi.");
      setMengirim(false);
    }
  }

  /** Unggah foto ke listing yang sudah tersimpan. Dipakai juga saat coba ulang. */
  async function unggahFoto(
    id: string,
    token: string,
  ): Promise<{ gagal: boolean; pesan?: string }> {
    try {
      const fd = new FormData();
      fd.append("token", token);
      foto.forEach((f) => fd.append("images", f.file));

      const r = await fetch(`/api/v1/listings/${id}/images`, {
        method: "POST",
        body: fd,
      });

      if (r.ok) return { gagal: false };

      const j = (await r.json().catch(() => ({}))) as { error?: string };
      return { gagal: true, pesan: j.error };
    } catch {
      return { gagal: true };
    }
  }

  /** Tombol "coba unggah lagi" di layar persetujuan. */
  async function cobaUlangFoto() {
    if (!hasil) return;
    setSedangUlang(true);
    const { gagal: gagalFoto, pesan: pesanFoto } = await unggahFoto(
      hasil.id,
      hasil.token,
    );
    setHasil({ ...hasil, fotoGagal: gagalFoto, pesanFoto });
    setSedangUlang(false);
  }

  // Setelah listing tersimpan, tampilkan layar persetujuan.
  if (hasil) {
    const ringkasan: RingkasanListing = {
      id: hasil.id,
      token: hasil.token,
      title: nilai.judul.trim(),
      price: nilai.gratis ? "0" : String(angkaHarga),
      isFree: nilai.gratis,
      condition: nilai.kondisi,
      wilayahNama,
      pickupLandmark: nilai.patokan.trim(),
      deadlineDate: nilai.tenggat,
      jumlahFoto: hasil.fotoGagal ? 0 : foto.length,
    };

    return (
      <SuksesPasang
        data={ringkasan}
        manageUrl={`${window.location.origin}/manage/${hasil.id}?token=${encodeURIComponent(hasil.token)}`}
        fotoGagal={hasil.fotoGagal}
        pesanFoto={hasil.pesanFoto}
        onCobaUlang={() => void cobaUlangFoto()}
        sedangUlang={sedangUlang}
      />
    );
  }

  return (
    <form onSubmit={kirim} className="grid gap-6 md:grid-cols-[1fr_360px] md:gap-8">
      <div className="space-y-5">
        {galatUmum && <GalatUmum pesan={galatUmum} />}

        <section
          data-galat={galat.foto ? "1" : "0"}
          className="rounded-md border border-line bg-surface p-4"
        >
          <PhotoUploader foto={foto} setFoto={setFoto} galat={galat.foto} />
        </section>

        <FormListingFields
          nilai={nilai}
          onUbah={ubah}
          galat={galat}
          kategori={kategori}
        />

        <div className="sticky bottom-[76px] z-10 md:static">
          <Button type="submit" ukuran="lg" penuh memuat={mengirim}>
            {mengirim ? "Menayangkan…" : "Tayangkan Sekarang"}
          </Button>
          <p className="mt-2.5 text-center text-[11.5px] text-ink-secondary">
            Tanpa daftar akun — barang siap diambil sendiri.
          </p>
        </div>
      </div>

      <aside className="hidden md:block">
        <LivePreview
          foto={foto}
          judul={nilai.judul}
          harga={nilai.harga}
          gratis={nilai.gratis}
          kondisi={nilai.kondisi}
          wilayahNama={wilayahNama}
          patokan={nilai.patokan}
          tenggat={tenggatTampil}
        />
      </aside>
    </form>
  );
}
