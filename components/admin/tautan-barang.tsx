"use client";

import { useState } from "react";

/**
 * Panel tautan untuk satu barang di halaman admin.
 *
 * KENAPA TAUTAN BARU DIAMBIL SAAT TOMBOL DIKLIK, bukan dikirim bersama halaman:
 * Halaman admin dirender di server, jadi apa pun yang dikirim di HTML akan
 * sampai ke browser — dan "disembunyikan" hanya berlaku untuk mata. Kode
 * sumber, ekstensi browser, dan tangkapan layar tetap mendapat semuanya.
 * Satu-satunya cara menyembunyikan tautan dengan benar adalah tidak
 * mengirimkannya sampai benar-benar dibutuhkan.
 *
 * KENAPA DITUTUP LAGI SETELAH DIBUKA:
 * Supaya layar yang kebetulan terlihat orang lain tidak menampilkan tautan
 * selamanya. Menutupnya satu klik, dan itu jauh lebih murah daripada tautan
 * kelola yang berpindah tangan.
 */

type Tautan = {
  tautanPublik: string;
  tautanBarang: string;
  lapak: { id: string; tautan: string } | null;
};

/** Tautan dengan tombol salin. */
function BarisTautan({
  label,
  keterangan,
  nilai,
}: {
  label: string;
  keterangan: string;
  nilai: string;
}) {
  const [tersalin, setTersalin] = useState(false);

  async function salin() {
    try {
      await navigator.clipboard.writeText(nilai);
      setTersalin(true);
      window.setTimeout(() => setTersalin(false), 2000);
    } catch {
      /*
       * Clipboard API butuh konteks aman (HTTPS) dan izin. Kalau gagal,
       * tautannya tetap terlihat di layar sehingga admin bisa menyalinnya
       * manual. Tidak perlu menampilkan galat untuk hal yang bisa
       * diselesaikan sendiri oleh pengguna.
       */
    }
  }

  return (
    <div className="border-t border-line px-5 py-3.5 first:border-t-0 sm:px-6">
      <p className="text-[13px] font-semibold text-ink">{label}</p>
      <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-secondary">
        {keterangan}
      </p>
      <div className="mt-2 flex items-start gap-2">
        <code className="min-w-0 flex-1 break-all rounded-md border border-line-kuat bg-appbg px-2.5 py-2 text-[12px] text-ink">
          {nilai}
        </code>
        <button
          type="button"
          onClick={salin}
          /*
           * min-h-[44px]: area sentuh minimum untuk kontrol yang disentuh
           * dengan jempol. py-2 saja hanya menghasilkan 38px.
           */
          className="inline-flex min-h-[44px] shrink-0 items-center rounded-md border border-line-kuat bg-surface px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface2"
        >
          {tersalin ? "Tersalin" : "Salin"}
        </button>
      </div>
    </div>
  );
}

export function TautanBarang({ listingId }: { listingId: string }) {
  const [terbuka, setTerbuka] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [data, setData] = useState<Tautan | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  async function buka() {
    if (terbuka) {
      // Menutup sekaligus membuang datanya dari memori halaman, supaya
      // tautannya benar-benar hilang dari DOM, bukan hanya disembunyikan.
      setTerbuka(false);
      setData(null);
      setGalat(null);
      return;
    }

    // Kalau sudah pernah diambil, tidak perlu meminta lagi.
    if (data) {
      setTerbuka(true);
      return;
    }

    setMemuat(true);
    setGalat(null);
    try {
      const r = await fetch(`/api/v1/admin/tautan?id=${encodeURIComponent(listingId)}`);
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setGalat(j?.error || "Gagal mengambil tautan.");
        return;
      }
      setData(await r.json());
      setTerbuka(true);
    } catch {
      setGalat("Tidak bisa menghubungi server.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={buka}
        disabled={memuat}
        aria-expanded={terbuka}
        className="inline-flex min-h-[44px] items-center rounded-md border border-line-kuat bg-surface px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface2 disabled:opacity-60"
      >
        {memuat ? "Mengambil..." : terbuka ? "Tutup tautan" : "Tampilkan tautan"}
      </button>

      {galat && (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          {galat}
        </p>
      )}

      {terbuka && data && (
        <div className="mt-3 overflow-hidden rounded-md border border-line">
          <BarisTautan
            label="Tautan publik barang"
            keterangan="Boleh dibagikan ke siapa saja. Halaman ini yang dilihat pembeli."
            nilai={data.tautanPublik}
          />
          <BarisTautan
            label="Tautan kelola barang ini saja"
            keterangan="RAHASIA. Hanya untuk barang ini. Kirim ke penjual kalau dia kehilangan tautannya."
            nilai={data.tautanBarang}
          />
          {data.lapak && (
            <BarisTautan
              label="Tautan dashboard lapak"
              keterangan="RAHASIA. Membuka semua barang penjual ini sekaligus, plus tombol Tambah Barang."
              nilai={data.lapak.tautan}
            />
          )}
        </div>
      )}
    </div>
  );
}
