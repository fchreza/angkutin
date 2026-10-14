/**
 * Kotak pencarian barang di halaman admin.
 *
 * KENAPA FORM NATIF (method="get"), bukan komponen klien dengan onSubmit:
 * Form natif bekerja tanpa JavaScript sama sekali, dan pencariannya dikerjakan
 * server. Itu penting di sini karena pencarian memakai NOMOR WHATSAPP LENGKAP,
 * sedangkan nomor yang dikirim ke browser selalu bertopeng. Jadi pencocokan
 * memang harus terjadi di server, dan hasilnya sudah tersaring saat halaman
 * dikirim.
 *
 * Efek sampingnya menguntungkan: kata kunci yang dicari ikut masuk ke URL,
 * sehingga halaman hasil pencarian bisa dimuat ulang atau di-bookmark.
 */
import type { ListingStatus } from "@/db/schema";

export function CariBarang({
  nilaiAwal,
  status,
}: {
  nilaiAwal?: string;
  status?: ListingStatus;
}) {
  return (
    <form method="get" action="/admin" className="mt-4">
      <label htmlFor="cari-barang" className="block text-[14px] font-medium text-ink">
        Cari barang
      </label>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
        Ketik judul barang, nama penjual, atau nomor WhatsApp. Nomor boleh
        dalam format apa pun.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          id="cari-barang"
          name="q"
          type="search"
          defaultValue={nilaiAwal ?? ""}
          placeholder="Contoh: kasur, Budi, 0812"
          className="min-h-[44px] min-w-0 flex-1 rounded-md border border-line-kuat bg-surface px-4 text-base text-ink outline-none transition-colors focus:border-primary"
        />
        {status && <input type="hidden" name="status" value={status} />}
        <button
          type="submit"
          className="inline-flex min-h-[44px] shrink-0 items-center rounded-md bg-primary px-5 text-[15px] font-semibold text-primary-teks transition-colors hover:bg-primary-hover"
        >
          Cari
        </button>
      </div>
    </form>
  );
}
