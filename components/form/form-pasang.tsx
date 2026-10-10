"use client";

import { useState } from "react";
import { PhotoUploader, type FotoSiap } from "./photo-uploader";
import { ConditionSegmented } from "./condition-segmented";
import { PriceWithGiveaway } from "./price-with-giveaway";
import { LivePreview } from "./live-preview";
import { Button } from "@/components/shared/button";
import { IconAlert } from "@/components/shared/icons";
import { SuksesPasang, type RingkasanListing } from "@/components/manage/sukses-pasang";
import { cn } from "@/lib/cn";
import { keYMD } from "@/lib/format";
import { WilayahPicker, type PilihanWilayah } from "./wilayah-picker";
import type { Kategori } from "@/components/feed/filter-pills";

const MAKS_HARI = 14;

type Galat = Record<string, string>;

/**
 * Form Pasang Listing (Layar 3).
 *
 * Alur dua langkah (lihat catatan di app/api/v1/listings/route.ts):
 *   1. POST /api/v1/listings        -> dapat id + secret_token
 *   2. POST /api/v1/listings/:id/images -> unggah foto
 * Kalau langkah 2 gagal, listing TETAP tayang dan pengguna dibawa ke
 * dashboard dengan peringatan — bukan kehilangan seluruh isian.
 */
export function FormPasang({ kategori }: { kategori: Kategori[] }) {
  const [foto, setFoto] = useState<FotoSiap[]>([]);
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [kategoriId, setKategoriId] = useState(kategori[0]?.id ?? "");
  const [kondisi, setKondisi] = useState("");
  const [gratis, setGratis] = useState(false);
  const [harga, setHarga] = useState("");
  const [wilayah, setWilayah] = useState<PilihanWilayah>({
    province_code: "",
    province_name: "",
    regency_code: "",
    regency_name: "",
    district_code: "",
    district_name: "",
  });
  const [patokan, setPatokan] = useState("");
  const [tenggat, setTenggat] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return keYMD(d);
  });
  const [catatan, setCatatan] = useState("");
  const [nama, setNama] = useState("");
  const [wa, setWa] = useState("");

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

  const hariIni = keYMD(new Date());
  const maksTenggat = (() => {
    const d = new Date();
    d.setDate(d.getDate() + MAKS_HARI);
    return keYMD(d);
  })();

  const wilayahNama = [wilayah.district_name, wilayah.regency_name].filter(Boolean).join(", ");
  const angkaHargaTerakhir = Number((harga || "0").replace(/\./g, ""));
  const tenggatTampil = tenggat
    ? new Intl.DateTimeFormat("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(new Date(`${tenggat}T00:00:00`))
    : "";

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setGalat({});
    setGalatUmum(null);

    // Validasi cepat di klien supaya umpan balik instan
    const g: Galat = {};
    if (foto.length === 0) g.foto = "Pilih minimal 1 foto.";
    if (judul.trim().length < 3) g.judul = "Judul minimal 3 karakter.";
    if (judul.trim().length > 50) g.judul = "Judul maksimal 50 karakter.";
    if (deskripsi.trim().length < 10) g.deskripsi = "Deskripsi minimal 10 karakter.";
    if (!kondisi) g.kondisi = "Pilih kondisi barang.";
    const angkaHarga = Number((harga || "0").replace(/\./g, ""));
    if (!gratis && angkaHarga <= 0) g.harga = "Isi harga, atau aktifkan Berikan Gratis.";
    if (!wilayah.province_code) g.wilayah = "Pilih provinsi.";
    else if (!wilayah.regency_code) g.wilayah = "Pilih kabupaten/kota.";
    else if (!wilayah.district_code) g.wilayah = "Pilih kecamatan.";
    if (patokan.trim().length < 5) g.patokan = "Patokan lokasi minimal 5 karakter.";
    if (!tenggat) g.tenggat = "Pilih batas pengambilan.";
    if (nama.trim().length < 2) g.nama = "Nama minimal 2 karakter.";
    if (!/^(\+62|62|0)8[1-9][0-9]{6,11}$/.test(wa.replace(/[\s-]/g, ""))) {
      g.wa = "Nomor WhatsApp tidak valid. Gunakan 08xx atau +62.";
    }

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
      // Langkah 1: buat listing
      const r1 = await fetch("/api/v1/listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: judul.trim(),
          description: deskripsi.trim(),
          category_id: kategoriId,
          condition: kondisi,
          is_free: gratis,
          price: gratis ? 0 : angkaHarga,
          province_code: wilayah.province_code,
          regency_code: wilayah.regency_code,
          district_code: wilayah.district_code,
          pickup_landmark: patokan.trim(),
          deadline_date: tenggat,
          access_notes: catatan.trim(),
          seller_name: nama.trim(),
          seller_whatsapp: wa.trim(),
        }),
      });

      if (!r1.ok) {
        const j = (await r1.json().catch(() => ({}))) as {
          error?: string;
          detail?: Galat;
        };
        if (j.detail) {
          // Server memakai kunci province_code/regency_code/district_code.
          // Form menampilkannya di satu tempat (bawah pilihan kecamatan),
          // jadi gabungkan dulu — kalau tidak, galatnya tidak terlihat.
          const d: Galat = { ...j.detail };
          const w =
            d.district_code ?? d.regency_code ?? d.province_code ?? undefined;
          if (w) {
            d.wilayah = w;
            delete d.district_code;
            delete d.regency_code;
            delete d.province_code;
          }
          setGalat(d);
        }
        setGalatUmum(j.error ?? "Gagal menayangkan listing. Coba lagi.");
        setMengirim(false);
        return;
      }

      const { id, secret_token, manage_url } = (await r1.json()) as {
        id: string;
        secret_token: string;
        manage_url: string;
      };

      // Langkah 2: unggah foto. Kegagalan di sini TIDAK membatalkan listing.
      const { gagal: gagalFoto, pesan: pesanFoto } = await unggahFoto(id, secret_token);

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
    const { gagal: gagalFoto, pesan: pesanFoto } = await unggahFoto(hasil.id, hasil.token);
    setHasil({ ...hasil, fotoGagal: gagalFoto, pesanFoto });
    setSedangUlang(false);
  }

  // Setelah listing tersimpan, tampilkan layar persetujuan.
  if (hasil) {
    const wilayahNamaHasil = [wilayah.district_name, wilayah.regency_name]
      .filter(Boolean)
      .join(", ");
    const ringkasan: RingkasanListing = {
      id: hasil.id,
      token: hasil.token,
      title: judul.trim(),
      price: gratis ? "0" : String(angkaHargaTerakhir),
      isFree: gratis,
      condition: kondisi,
      wilayahNama: wilayahNamaHasil,
      pickupLandmark: patokan.trim(),
      deadlineDate: tenggat,
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
      {/* Kolom kiri: isian */}
      <div className="space-y-5">
        {galatUmum && (
          <div className="flex items-start gap-2.5 rounded-md border border-danger/30 bg-danger-soft px-3.5 py-3 text-[13px] text-danger">
            <IconAlert size={16} className="mt-[1px] shrink-0" />
            <span>{galatUmum}</span>
          </div>
        )}

        {/* Foto */}
        <section
          data-galat={galat.foto ? "1" : "0"}
          className="rounded-md border border-line bg-surface p-4"
        >
          <PhotoUploader foto={foto} setFoto={setFoto} galat={galat.foto} />
        </section>

        {/* Detail barang */}
        <section className="space-y-4 rounded-md border border-line bg-surface p-4">
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-ink-secondary">
            Detail barang
          </h2>

          <div>
            <label htmlFor="judul" className="mb-2 block text-[13px] font-semibold text-ink">
              Judul barang <span className="text-danger">*</span>
            </label>
            <input
              id="judul"
              value={judul}
              onChange={(e) => setJudul(e.target.value.slice(0, 50))}
              placeholder="Contoh: Kasur spring bed 120x200"
              className={cn(
                "h-11 w-full rounded-md border px-3 text-[14px] focus:outline-none",
                galat.judul ? "border-danger" : "border-line focus:border-primary",
              )}
            />
            <div className="mt-1 flex justify-between">
              {galat.judul ? (
                <p className="text-[12px] text-danger">{galat.judul}</p>
              ) : (
                <span />
              )}
              <span className="text-[11.5px] text-ink-secondary">{judul.length}/50</span>
            </div>
          </div>

          <div>
            <label htmlFor="kategori" className="mb-2 block text-[13px] font-semibold text-ink">
              Kategori <span className="text-danger">*</span>
            </label>
            <select
              id="kategori"
              value={kategoriId}
              onChange={(e) => setKategoriId(e.target.value)}
              className="h-11 w-full rounded-md border border-line bg-surface px-3 text-[14px] focus:border-primary focus:outline-none"
            >
              {kategori.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </div>

          <ConditionSegmented nilai={kondisi} onUbah={setKondisi} galat={galat.kondisi} />

          <PriceWithGiveaway
            gratis={gratis}
            harga={harga}
            onGratis={setGratis}
            onHarga={setHarga}
            galat={galat.harga}
          />

          <div>
            <label htmlFor="deskripsi" className="mb-2 block text-[13px] font-semibold text-ink">
              Deskripsi &amp; kondisi jujur <span className="text-danger">*</span>
            </label>
            <textarea
              id="deskripsi"
              rows={4}
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value.slice(0, 500))}
              placeholder="Sebutkan minusnya apa adanya — mis. ada noda kecil di sudut, rangka masih kokoh."
              className={cn(
                "w-full resize-y rounded-md border px-3 py-2.5 text-[14px] leading-relaxed focus:outline-none",
                galat.deskripsi ? "border-danger" : "border-line focus:border-primary",
              )}
            />
            <div className="mt-1 flex justify-between">
              {galat.deskripsi ? (
                <p className="text-[12px] text-danger">{galat.deskripsi}</p>
              ) : (
                <span />
              )}
              <span className="text-[11.5px] text-ink-secondary">
                {deskripsi.length}/500
              </span>
            </div>
          </div>
        </section>

        {/* Penjemputan */}
        <section className="space-y-4 rounded-md border border-line bg-surface p-4">
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-ink-secondary">
            Penjemputan
          </h2>

          <div data-galat={galat.wilayah ? "1" : "0"}>
            <WilayahPicker nilai={wilayah} onUbah={setWilayah} galat={galat.wilayah} />
          </div>

          <div>
            <label htmlFor="patokan" className="mb-2 block text-[13px] font-semibold text-ink">
              Patokan lokasi penjemputan <span className="text-danger">*</span>
            </label>
            <input
              id="patokan"
              value={patokan}
              onChange={(e) => setPatokan(e.target.value.slice(0, 150))}
              placeholder="Contoh: Dekat Indomaret Point, gang sebelah warung Bu Ida"
              className={cn(
                "h-11 w-full rounded-md border px-3 text-[14px] focus:outline-none",
                galat.patokan ? "border-danger" : "border-line focus:border-primary",
              )}
            />
            {galat.patokan ? (
              <p className="mt-1.5 text-[12px] text-danger">{galat.patokan}</p>
            ) : (
              <p className="mt-1.5 text-[11.5px] text-ink-secondary">
                Cukup patokan umum — jangan tulis nomor kamar atau alamat lengkap.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="tenggat" className="mb-2 block text-[13px] font-semibold text-ink">
              Batas pengambilan <span className="text-danger">*</span>
            </label>
            <input
              id="tenggat"
              type="date"
              value={tenggat}
              min={hariIni}
              max={maksTenggat}
              onChange={(e) => setTenggat(e.target.value)}
              className={cn(
                "h-11 w-full rounded-md border px-3 text-[14px] focus:outline-none",
                galat.tenggat ? "border-danger" : "border-line focus:border-primary",
              )}
            />
            {galat.tenggat ? (
              <p className="mt-1.5 text-[12px] text-danger">{galat.tenggat}</p>
            ) : (
              <p className="mt-1.5 text-[11.5px] text-ink-secondary">
                Maksimal {MAKS_HARI} hari. Listing otomatis kedaluwarsa pada 00:01 WIB
                setelah tanggal ini.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="catatan" className="mb-2 block text-[13px] font-semibold text-ink">
              Catatan akses logistik{" "}
              <span className="text-ink-secondary">(opsional)</span>
            </label>
            <input
              id="catatan"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value.slice(0, 200))}
              placeholder="Contoh: Kamar lantai 3, tangga sempit, butuh 2 orang"
              className="h-11 w-full rounded-md border border-line px-3 text-[14px] focus:border-primary focus:outline-none"
            />
          </div>
        </section>

        {/* Kontak */}
        <section className="space-y-4 rounded-md border border-line bg-surface p-4">
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-ink-secondary">
            Kontak penjual
          </h2>

          <div>
            <label htmlFor="nama" className="mb-2 block text-[13px] font-semibold text-ink">
              Nama panggilan <span className="text-danger">*</span>
            </label>
            <input
              id="nama"
              value={nama}
              onChange={(e) => setNama(e.target.value.slice(0, 50))}
              placeholder="Contoh: Rina"
              className={cn(
                "h-11 w-full rounded-md border px-3 text-[14px] focus:outline-none",
                galat.nama ? "border-danger" : "border-line focus:border-primary",
              )}
            />
            {galat.nama && <p className="mt-1.5 text-[12px] text-danger">{galat.nama}</p>}
          </div>

          <div>
            <label htmlFor="wa" className="mb-2 block text-[13px] font-semibold text-ink">
              Nomor WhatsApp <span className="text-danger">*</span>
            </label>
            <input
              id="wa"
              inputMode="tel"
              value={wa}
              onChange={(e) => setWa(e.target.value.slice(0, 20))}
              placeholder="0812 3456 7890"
              className={cn(
                "h-11 w-full rounded-md border px-3 text-[14px] focus:outline-none",
                galat.wa ? "border-danger" : "border-line focus:border-primary",
              )}
            />
            {galat.wa ? (
              <p className="mt-1.5 text-[12px] text-danger">{galat.wa}</p>
            ) : (
              <p className="mt-1.5 text-[11.5px] text-ink-secondary">
                Nomor ini tidak ditampilkan di halaman publik — hanya dipakai
                saat pembeli menekan tombol WhatsApp.
              </p>
            )}
          </div>
        </section>

        {/* Tombol kirim */}
        <div className="sticky bottom-[76px] z-10 md:static">
          <Button type="submit" ukuran="lg" penuh memuat={mengirim}>
            {mengirim ? "Menayangkan…" : "Tayangkan Sekarang"}
          </Button>
          <p className="mt-2.5 text-center text-[11.5px] text-ink-secondary">
            Tanpa daftar akun — barang siap diambil sendiri.
          </p>
        </div>
      </div>

      {/* Kolom kanan: pratinjau (desktop) */}
      <aside className="hidden md:block">
        <LivePreview
          foto={foto}
          judul={judul}
          harga={harga}
          gratis={gratis}
          kondisi={kondisi}
          wilayahNama={wilayahNama}
          patokan={patokan}
          tenggat={tenggatTampil}
        />
      </aside>
    </form>
  );
}
