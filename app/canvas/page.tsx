'use client';

import { DialRoot } from 'dialkit';
import 'dialkit/styles.css';
import { CanvasBoard } from './CanvasBoard';

/**
 * Halaman canvas eksplorasi UI (bukan bagian dari produk).
 *
 * Papan bebas berisi tiga varian kartu listing yang hidup berdampingan
 * untuk dibandingkan: layout-nya berbeda, datanya sama. Tiap varian
 * terdaftar di registry (app/canvas/registry.ts) dan punya grup DialKit
 * sendiri dengan nama yang sama, jadi saat diskusi tinggal sebut nama
 * kartunya — klik labelnya untuk menyalin nama itu persis.
 *
 * <DialRoot productionEnabled /> hanya dirender di halaman ini, sama
 * seperti halaman /dialkit-demo. Halaman lain tidak terpengaruh.
 */
export default function CanvasPage() {
  return (
    <main className="w-full">
      <header className="mx-auto w-full max-w-5xl px-4 pb-3 pt-6">
        <h1 className="text-2xl font-bold">Canvas Eksplorasi UI</h1>
        <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          Seret area kosong untuk menggeser papan (pan), tahan Ctrl/Cmd +
          roda tetikus untuk zoom, seret handle di samping nama untuk
          memindahkan kartu, dan klik nama kartu untuk menyalinnya. Atur
          tampilan tiap varian — radius, padding, bayangan, warna aksen —
          dari panel DialKit; tiap varian punya grup sendiri sesuai namanya.
        </p>
      </header>

      <CanvasBoard />

      <DialRoot productionEnabled />
    </main>
  );
}
