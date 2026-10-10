"use client";

import { useEffect } from "react";

/**
 * Pendaftaran service worker (PWA).
 *
 * - Hanya di produksi: di mode pengembangan, setiap perubahan berkas akan
 *   memicu siklus pembaruan SW dan cache chunk lama, yang membuat
 *   hot-reload tampak rusak.
 * - Didaftarkan setelah `load` supaya tidak bersaing dengan aset kritis
 *   (FCP/LCP).
 * - Kalau chunk gagal dimuat (gejala klasik setelah deploy baru), cache
 *   dibersihkan dan halaman dimuat ulang sekali — supaya pengguna tidak
 *   melihat layar putih.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Pemulihan ChunkLoadError: bersihkan cache lalu muat ulang sekali.
    const onError = (e: ErrorEvent) => {
      const pesan = e.message || "";
      if (
        pesan.includes("ChunkLoadError") ||
        pesan.includes("Loading chunk") ||
        pesan.includes("Loading CSS chunk")
      ) {
        if (!("caches" in window)) return;
        void caches
          .keys()
          .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
          .then(() => window.location.reload());
      }
    };
    window.addEventListener("error", onError);

    if (!("serviceWorker" in navigator)) {
      return () => window.removeEventListener("error", onError);
    }
    if (process.env.NODE_ENV !== "production") {
      return () => window.removeEventListener("error", onError);
    }

    const daftar = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (err) {
        // Service worker adalah peningkatan bertahap — kegagalannya tidak
        // boleh mengganggu penggunaan aplikasi.
        console.warn("[SW] gagal mendaftar:", err);
      }
    };

    if (document.readyState === "complete") {
      void daftar();
    } else {
      window.addEventListener("load", daftar, { once: true });
    }

    return () => window.removeEventListener("error", onError);
  }, []);

  return null;
}
