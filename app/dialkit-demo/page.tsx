'use client';

import { useState } from 'react';
import { DialRoot, useDialKit } from 'dialkit';
import 'dialkit/styles.css';
import { motion } from 'motion/react';

/**
 * Halaman ujicoba DialKit (bukan bagian dari produk).
 *
 * Panel kontrol DialKit melayang di halaman ini dan mengikat nilai-nilai
 * ke tampilan secara real-time: geser slider / ganti warna di panel,
 * kartu dan animasi di bawah langsung berubah tanpa reload.
 *
 * <DialRoot productionEnabled /> hanya dirender di halaman ini, supaya
 * panel tetap terlihat di produksi khusus untuk demo. Halaman lain
 * tidak terpengaruh.
 */
export default function DialKitDemoPage() {
  // Contoh 1 — kartu listing gaya Angkutin.
  // Kontrol dikelompokkan dalam folder "tampilan" (nested object).
  const kartu = useDialKit('Kartu Listing', {
    tampilan: {
      radius: [16, 0, 48],
      padding: [16, 0, 40],
      blurBayangan: [16, 0, 48],
      warnaAksen: '#f97316',
    },
  });

  // Contoh 2 — animasi spring dari Motion.
  // Tombol action "Putar Ulang" menaikkan `kunci` lewat onAction,
  // sehingga elemen animasi di-mount ulang dan animasi masuk berulang.
  const [kunciAnimasi, setKunciAnimasi] = useState(0);
  const animasi = useDialKit(
    'Animasi Spring',
    {
      transisi: { type: 'spring', visualDuration: 0.6, bounce: 0.3 },
      putarUlang: { type: 'action', label: 'Putar Ulang' },
    },
    {
      onAction: (path) => {
        if (path.endsWith('putarUlang')) {
          setKunciAnimasi((k) => k + 1);
        }
      },
    },
  );

  const transisiMotion =
    animasi.transisi.type === 'spring'
      ? { ...animasi.transisi }
      : { duration: animasi.transisi.duration, ease: animasi.transisi.ease };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">Demo DialKit</h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
        Ini halaman ujicoba DialKit di Angkutin. Panel kontrol yang melayang di
        halaman ini terhubung langsung ke tampilan: geser slider, ubah warna,
        atau atur pegas animasinya, dan hasilnya berubah saat itu juga tanpa
        perlu mengubah kode atau memuat ulang halaman.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">
          Contoh 1 — Kartu Listing (grup &ldquo;Kartu Listing&rdquo;)
        </h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Radius sudut, padding, blur bayangan, dan warna tombol kartu ini
          diatur dari panel.
        </p>

        <div
          className="mt-4 w-full max-w-sm bg-white dark:bg-neutral-900"
          style={{
            borderRadius: kartu.tampilan.radius,
            padding: kartu.tampilan.padding,
            boxShadow: `0 10px ${kartu.tampilan.blurBayangan}px rgba(0, 0, 0, 0.18)`,
          }}
        >
          <div
            className="flex h-40 items-center justify-center bg-neutral-200 text-sm text-neutral-500 dark:bg-neutral-800"
            style={{ borderRadius: Math.max(0, kartu.tampilan.radius - 4) }}
          >
            Foto barang
          </div>
          <h3 className="mt-4 font-semibold">
            Earphone Sony WH-CH710N (contoh)
          </h3>
          <p
            className="mt-1 text-lg font-bold"
            style={{ color: kartu.tampilan.warnaAksen }}
          >
            Rp 800.000
          </p>
          <button
            type="button"
            className="mt-3 w-full py-2 font-semibold text-white"
            style={{
              backgroundColor: kartu.tampilan.warnaAksen,
              borderRadius: Math.max(0, kartu.tampilan.radius - 4),
            }}
          >
            Chat Penjual
          </button>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">
          Contoh 2 — Animasi Spring (grup &ldquo;Animasi Spring&rdquo;)
        </h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Kotak ini masuk dengan animasi pegas dari Motion. Atur{' '}
          <em>visualDuration</em> dan <em>bounce</em> pada kontrol spring di
          panel, arahkan kursor ke kotaknya untuk efek membesar, lalu tekan
          tombol &ldquo;Putar Ulang&rdquo; di panel untuk mengulang animasi
          masuknya.
        </p>

        <div className="mt-4 flex h-56 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
          <motion.div
            key={kunciAnimasi}
            initial={{ opacity: 0, y: 32, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{ scale: 1.06 }}
            transition={transisiMotion}
            className="rounded-2xl px-8 py-6 font-semibold text-white"
            style={{ backgroundColor: kartu.tampilan.warnaAksen }}
          >
            Halo dari Motion + DialKit
          </motion.div>
        </div>
      </section>

      <DialRoot productionEnabled />
    </main>
  );
}
