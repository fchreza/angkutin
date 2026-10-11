"use client";

import { useState } from "react";
import { Button } from "@/components/shared/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/shared/toast";
import {
  IconCopy,
  IconCheck,
  IconWhatsApp,
  IconTrash,
} from "@/components/shared/icons";
import { cn } from "@/lib/cn";

/** Kotak tautan rahasia + tombol salin & kirim ke WA sendiri (Layar 4). */
export function SecretLinkBox({
  manageUrl,
  sellerWhatsapp,
}: {
  manageUrl: string;
  sellerWhatsapp: string;
}) {
  const { tampilkan } = useToast();
  const [tersalin, setTersalin] = useState(false);

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(manageUrl);
    } catch {
      // Fallback untuk browser tanpa clipboard API (mis. HTTP non-secure)
      const ta = document.createElement("textarea");
      ta.value = manageUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setTersalin(true);
    tampilkan("Tautan pengelolaan disalin.");
    setTimeout(() => setTersalin(false), 2200);
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
          sukses={tersalin}
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
          "press mt-2.5 inline-flex items-center gap-2 rounded-md px-3 py-2",
          "text-[13px] font-semibold text-primary-dark hover:bg-primary/10",
        )}
      >
        <IconWhatsApp size={16} />
        Kirim Tautan ke WhatsApp Sendiri
      </button>
    </div>
  );
}

/** Panel kontrol status + konfirmasi hapus. */
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
  const { tampilkan } = useToast();
  const [memuat, setMemuat] = useState<string | null>(null);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false);

  const ubah = async (baru: string) => {
    setMemuat(baru);
    try {
      const r = await fetch(`/api/v1/listings/manage/${listingId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, status: baru }),
      });
      if (!r.ok) throw new Error();
      onBerubah(baru);
      setKonfirmasiHapus(false);

      // Beri tahu hasilnya — sebelumnya halaman berubah tanpa penjelasan.
      if (baru === "DELETED") {
        tampilkan("Postingan dihapus dari katalog.");
      } else if (baru === "TAKEN") {
        tampilkan("Ditandai sudah diambil.");
      } else if (baru === "AVAILABLE") {
        tampilkan(
          habisWaktu
            ? "Ditayangkan lagi. Ubah batas pengambilannya di Ubah Listing."
            : "Ditandai tersedia lagi.",
        );
      }
    } catch {
      tampilkan("Gagal memperbarui status. Coba lagi.", { jenis: "galat" });
    } finally {
      setMemuat(null);
    }
  };

  const sudahDiambil = status === "TAKEN";
  /**
   * Listing yang tenggatnya sudah lewat.
   *
   * TIDAK ada tombol "ubah status" untuk kasus ini. Percobaan pertama saya
   * menambahkan tombol "Tayangkan Lagi" yang mengubah status jadi AVAILABLE —
   * dan itu TERBUKTI TIDAK BERGUNA: status di database berubah (HTTP 200),
   * tapi karena tenggatnya masih lewat, status efektifnya langsung kembali
   * jadi "Waktu Habis" dan katalog tetap tidak menampilkannya. Penjual
   * menekan tombol dan tidak ada yang berubah.
   *
   * Yang benar: membuka form agar penjual bisa MEMPERPANJANG tenggatnya.
   * Saat disimpan, server mengembalikan status EXPIRED ke AVAILABLE
   * (lihat PATCH /api/v1/listings/manage/:id). Itu satu-satunya jalan keluar
   * yang benar-benar berfungsi.
   */
  const habisWaktu = status === "EXPIRED";

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          varian="outline"
          penuh
          memuat={memuat === (sudahDiambil ? "AVAILABLE" : "TAKEN")}
          onClick={() => void ubah(sudahDiambil ? "AVAILABLE" : "TAKEN")}
          disabled={habisWaktu}
        >
          {sudahDiambil ? "Tandai Tersedia Lagi" : "Tandai Sudah Diambil"}
        </Button>

        <Button varian="danger" penuh onClick={() => setKonfirmasiHapus(true)}>
          <IconTrash size={15} />
          Hapus Postingan
        </Button>
      </div>

      {/* Tombol "Perpanjang Waktu Tayang" TIDAK dibuat di sini.
          Tombol utama di atas kartu sudah menanganinya ("Ubah Listing" berubah
          jadi "Perpanjang Waktu Tayang"). Sebelumnya keduanya ada, dan penjual
          melihat dua tombol kembar dengan fungsi yang sama. */}

      {/* Aksi merusak WAJIB dikonfirmasi — lihat ConfirmDialog. */}
      <ConfirmDialog
        buka={konfirmasiHapus}
        judul="Hapus postingan ini?"
        keterangan="Postingan akan hilang dari katalog dan fotonya dihapus. Tindakan ini tidak bisa dibatalkan."
        labelKonfirmasi="Ya, Hapus"
        sedangProses={memuat === "DELETED"}
        onKonfirmasi={() => void ubah("DELETED")}
        onBatal={() => setKonfirmasiHapus(false)}
      />
    </div>
  );
}
