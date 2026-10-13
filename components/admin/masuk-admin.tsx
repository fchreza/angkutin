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
    <form onSubmit={kirim} className="mx-auto max-w-sm space-y-5 py-16">
      <div>
        <h1 className="judul-sedang">Masuk admin</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          Halaman ini hanya untuk pemilik situs.
        </p>
      </div>

      <div>
        <label
          htmlFor="sandi-admin"
          className="block text-sm font-medium text-ink"
        >
          Sandi
        </label>
        <input
          id="sandi-admin"
          type="password"
          value={sandi}
          onChange={(e) => setSandi(e.target.value)}
          autoComplete="current-password"
          className="mt-2 w-full rounded-md border border-line bg-surface px-4 py-3 text-base text-ink outline-none focus:border-primary"
          required
        />
      </div>

      {galat && (
        <p role="alert" className="text-sm font-medium text-danger">
          {galat}
        </p>
      )}

      <Button type="submit" disabled={memuat} className="w-full">
        {memuat ? "Memeriksa..." : "Masuk"}
      </Button>
    </form>
  );
}
