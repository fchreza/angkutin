"use client";

import { useState } from "react";
import { Button } from "@/components/shared/button";
import { IconCopy, IconCheck, IconWhatsApp, IconTrash } from "@/components/shared/icons";
import { cn } from "@/lib/cn";

/** Kotak tautan rahasia + tombol salin & kirim ke WA sendiri (Layar 4). */
export function SecretLinkBox({
  manageUrl,
  sellerWhatsapp,
}: {
  manageUrl: string;
  sellerWhatsapp: string;
}) {
  const [tersalin, setTersalin] = useState(false);

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(manageUrl);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2200);
    } catch {
      // Fallback untuk browser tanpa clipboard API (mis. HTTP non-secure)
      const ta = document.createElement("textarea");
      ta.value = manageUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2200);
    }
  };

  const kirimWA = () => {
    const pesan =
      `Tautan pengelolaan listing Angkutin saya:\n${manageUrl}\n\n` +
      `Simpan pesan ini untuk menandai barang sudah diambil atau menghapusnya nanti.`;
    const digit = sellerWhatsapp.replace(/[^0-9]/g, "");
    window.open(
      `https://wa.me/${digit}?text=${encodeURIComponent(pesan)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="rounded-md border border-primary/25 bg-primary-soft p-4">
      <h2 className="text-[13.5px] font-bold text-primary-dark">
        Simpan tautan ini
      </h2>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-secondary">
        Simpan tautan ini untuk menandai barang jika sudah laku atau untuk
        menghapusnya nanti.
      </p>

      <div className="mt-3 flex gap-2">
        <input
          readOnly
          value={manageUrl}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Tautan pengelolaan"
          className="h-11 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 font-mono text-[11.5px] text-ink-secondary focus:border-primary focus:outline-none"
        />
        <Button
          type="button"
          varian={tersalin ? "outline" : "primary"}
          onClick={() => void salin()}
          className="shrink-0"
        >
          {tersalin ? <IconCheck size={15} /> : <IconCopy size={15} />}
          {tersalin ? "Tersalin" : "Salin"}
        </Button>
      </div>

      <button
        type="button"
        onClick={kirimWA}
        className={cn(
          "mt-2.5 inline-flex items-center gap-2 rounded-md px-3 py-2",
          "text-[13px] font-semibold text-primary-dark hover:bg-primary/10",
        )}
      >
        <IconWhatsApp size={16} />
        Kirim Tautan ke WhatsApp Sendiri
      </button>
    </div>
  );
}

/** Panel kontrol status + modal konfirmasi hapus. */
export function StatusControls({
  listingId,
  token,
  status,
  onBerubah,
}: {
  listingId: string;
  token: string;
  status: string;
  onBerubah: (s: string) => void;
}) {
  const [memuat, setMemuat] = useState<string | null>(null);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const ubah = async (baru: string) => {
    setMemuat(baru);
    setGalat(null);
    try {
      const r = await fetch(`/api/v1/listings/manage/${listingId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, status: baru }),
      });
      if (!r.ok) throw new Error();
      onBerubah(baru);
      setKonfirmasiHapus(false);
    } catch {
      setGalat("Gagal memperbarui status. Coba lagi.");
    } finally {
      setMemuat(null);
    }
  };

  const sudahDiambil = status === "TAKEN";

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          varian="outline"
          penuh
          memuat={memuat === (sudahDiambil ? "AVAILABLE" : "TAKEN")}
          onClick={() => void ubah(sudahDiambil ? "AVAILABLE" : "TAKEN")}
        >
          {sudahDiambil ? "Tandai Tersedia Lagi" : "Tandai Sudah Diambil"}
        </Button>

        <Button
          varian="danger"
          penuh
          onClick={() => setKonfirmasiHapus(true)}
        >
          <IconTrash size={15} />
          Hapus Postingan
        </Button>
      </div>

      {galat && <p className="text-[12.5px] text-danger">{galat}</p>}

      {/* Modal konfirmasi — aksi destruktif WAJIB dikonfirmasi */}
      {konfirmasiHapus && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="judul-hapus"
        >
          <div className="animate-pop w-full max-w-[400px] rounded-md bg-surface p-5 shadow-modal">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft">
              <IconTrash size={20} className="text-danger" />
            </div>
            <h3 id="judul-hapus" className="font-display text-[17px] font-bold text-ink">
              Hapus postingan ini?
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
              Postingan akan hilang dari katalog dan fotonya dihapus. Tindakan
              ini tidak bisa dibatalkan.
            </p>

            <div className="mt-5 flex gap-2">
              <Button
                varian="outline"
                penuh
                onClick={() => setKonfirmasiHapus(false)}
                disabled={memuat === "DELETED"}
              >
                Batal
              </Button>
              <button
                type="button"
                onClick={() => void ubah("DELETED")}
                disabled={memuat === "DELETED"}
                className={cn(
                  "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md",
                  "bg-danger font-semibold text-white transition-colors hover:brightness-95",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                {memuat === "DELETED" && (
                  <span className="spin inline-block h-[14px] w-[14px] rounded-full border-2 border-white border-r-transparent" />
                )}
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
