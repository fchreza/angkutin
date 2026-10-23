'use client';

import { memo } from 'react';
import { useDialKit } from 'dialkit';
import type { CanvasVariant } from './registry';

/**
 * Kartu listing gaya Angkutin untuk canvas eksplorasi.
 *
 * Data uji SAMA PERSIS untuk ketiga varian — yang dibandingkan murni
 * layout-nya:
 * - compact : horizontal ringkas, thumbnail kecil di kiri.
 * - standar : vertikal seperti kartu katalog biasa.
 * - lebar   : horizontal lebar, area foto besar di kiri.
 *
 * Tiap varian mendaftarkan grup DialKit dengan nama persis nama
 * registry-nya, jadi panel DialKit mengelompokkan kontrol per varian
 * dan nilainya bisa dirujuk lewat percakapan ("Kartu listing · lebar,
 * radiusnya naikin").
 */

const JUDUL = 'Earphone Sony WH-CH710N (contoh)';
const HARGA = 'Rp 800.000';
const LOKASI = 'Medan Johor';

interface Props {
  /** Nama registry — sekaligus nama grup DialKit. */
  name: string;
  variant: CanvasVariant;
}

export const ListingCardVariant = memo(function ListingCardVariant({
  name,
  variant,
}: Props) {
  const kartu = useDialKit(name, {
    tampilan: {
      radius: [16, 0, 48],
      padding: [16, 0, 40],
      blurBayangan: [16, 0, 48],
      warnaAksen: '#f97316',
    },
  });

  const { radius, padding, blurBayangan, warnaAksen } = kartu.tampilan;
  const radiusDalam = Math.max(0, radius - 4);

  const gayaKartu: React.CSSProperties = {
    borderRadius: radius,
    padding,
    boxShadow: `0 10px ${blurBayangan}px rgba(0, 0, 0, 0.18)`,
  };
  const gayaTombol: React.CSSProperties = {
    backgroundColor: warnaAksen,
    borderRadius: radiusDalam,
  };
  const gayaHarga: React.CSSProperties = { color: warnaAksen };

  if (variant === 'compact') {
    return (
      <div
        className="flex w-full items-center gap-3 bg-white dark:bg-neutral-900"
        style={gayaKartu}
      >
        <div
          className="flex h-24 w-24 shrink-0 items-center justify-center bg-neutral-200 text-xs text-neutral-500 dark:bg-neutral-800"
          style={{ borderRadius: radiusDalam }}
        >
          Foto barang
        </div>
        <div className="flex min-w-0 flex-1 flex-col self-stretch py-0.5">
          <h3 className="truncate text-sm font-semibold">{JUDUL}</h3>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {LOKASI}
          </p>
          <p className="mt-auto text-base font-bold" style={gayaHarga}>
            {HARGA}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 px-3 py-1.5 text-xs font-semibold text-white"
          style={gayaTombol}
        >
          Chat Penjual
        </button>
      </div>
    );
  }

  if (variant === 'lebar') {
    return (
      <div
        className="flex w-full gap-4 bg-white dark:bg-neutral-900"
        style={gayaKartu}
      >
        <div
          className="flex h-44 w-52 shrink-0 items-center justify-center bg-neutral-200 text-sm text-neutral-500 dark:bg-neutral-800"
          style={{ borderRadius: radiusDalam }}
        >
          Foto barang
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="text-lg font-semibold">{JUDUL}</h3>
          <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
            {LOKASI}
          </p>
          <p className="mt-2 text-2xl font-bold" style={gayaHarga}>
            {HARGA}
          </p>
          <button
            type="button"
            className="mt-auto self-start px-5 py-2 font-semibold text-white"
            style={gayaTombol}
          >
            Chat Penjual
          </button>
        </div>
      </div>
    );
  }

  // standar — vertikal seperti kartu katalog biasa.
  return (
    <div className="w-full bg-white dark:bg-neutral-900" style={gayaKartu}>
      <div
        className="flex h-40 items-center justify-center bg-neutral-200 text-sm text-neutral-500 dark:bg-neutral-800"
        style={{ borderRadius: radiusDalam }}
      >
        Foto barang
      </div>
      <h3 className="mt-3 font-semibold">{JUDUL}</h3>
      <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
        {LOKASI}
      </p>
      <p className="mt-1 text-lg font-bold" style={gayaHarga}>
        {HARGA}
      </p>
      <button
        type="button"
        className="mt-3 w-full py-2 font-semibold text-white"
        style={gayaTombol}
      >
        Chat Penjual
      </button>
    </div>
  );
});
