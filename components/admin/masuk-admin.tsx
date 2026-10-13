"use client";

import { useState } from "react";
import { Button } from "@/components/shared/button";

/**
 * Form masuk admin.
 *
 * Sengaja dibuat sederhana: satu kolom sandi, satu tombol. Tidak ada "ingat
 * saya", tidak ada "lupa sandi", tidak ada pendaftaran. Hanya ada satu orang
 * yang perlu masuk, dan alur pemulihan sandi yang rumit untuk satu pengguna
 * justru menambah permukaan serangan tanpa menambah manfaat.
 *
 * Lebarnya dibatasi dan diletakkan di tengah: kolom isian selebar layar
 * membuatnya terbaca sebagai paragraf, bukan sebagai satu bidang yang harus
 * diisi.
 */
export function MasukAdmin() {
  const [sandi, setSandi] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    if (memuat) return;
    setMemuat(true);
    setGalat(null);
    try {
      const r = await fetch("/api/v1/admin/masuk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sandi }),
      });
      if (r.ok) {
        /*
         * Muat ulang penuh, bukan navigasi klien: cookie baru dipasang oleh
         * respons ini, dan halaman perlu dirender server dengan cookie itu.
         * Navigasi klien akan memakai data yang sudah dirender sebelumnya.
         */
        window.location.reload();
        return;
      }
      const j = await r.json().catch(() => ({}));
      setGalat(j?.error || "Gagal masuk.");
    } catch {
      setGalat("Tidak bisa menghubungi server.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <div className="mx-auto max-w-[26rem]">
      <header>
        <h1 className="font-display text-judul-besar font-bold text-ink">
          Masuk admin
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-secondary">
          Halaman ini hanya untuk pemilik situs.
        </p>
      </header>

      <form onSubmit={kirim} className="mt-8">
        <label
          htmlFor="sandi-admin"
          className="block text-[14px] font-medium text-ink"
        >
          Sandi
        </label>
        <input
          id="sandi-admin"
          type="password"
          value={sandi}
          onChange={(e) => setSandi(e.target.value)}
          autoComplete="current-password"
          className="mt-2 w-full rounded-md border border-line-kuat bg-surface px-4 py-3 text-base text-ink outline-none transition-colors focus:border-primary"
          required
        />

        {galat && (
          <p
            role="alert"
            className="mt-3 rounded-md bg-danger-soft px-4 py-3 text-[14px] leading-relaxed text-danger"
          >
            {galat}
          </p>
        )}

        <Button type="submit" disabled={memuat} className="mt-6 w-full">
          {memuat ? "Memeriksa..." : "Masuk"}
        </Button>
      </form>
    </div>
  );
}
