/**
 * Integrasi WhatsApp (FR-5).
 *
 * Aturan dari PRD-Enhanced §FR-5:
 * - Simpan nomor dalam format `62xxxxxxxxxx` (tanpa +, tanpa spasi/strip).
 * - URL: `https://wa.me/{digit}?text={encodeURIComponent(pesan)}`.
 * - Nomor penjual TIDAK PERNAH ditampilkan sebagai teks di UI publik;
 *   hanya dipakai untuk membangun link ini.
 */

export const WA_REGEX = /^(\+62|62|0)8[1-9][0-9]{6,11}$/;

/** "0812-3456-7890" / "+62 812 3456 7890" -> "6281234567890" */
export function normalizeWhatsApp(input: string): string {
  let d = (input || "").replace(/[^0-9]/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (!d.startsWith("62")) d = "62" + d;
  return d;
}

export function isValidWhatsApp(input: string): boolean {
  return WA_REGEX.test((input || "").replace(/[\s-]/g, ""));
}

/** "6281234567890" -> "0812-3456-7890" (hanya untuk tampilan internal/penjual). */
export function tampilkanWhatsApp(nomor: string): string {
  const d = normalizeWhatsApp(nomor);
  if (!d.startsWith("62") || d.length < 10) return nomor;
  const lokal = "0" + d.slice(2);
  return lokal.replace(/(\d{4})(\d{4})(\d+)/, "$1-$2-$3");
}

export type OpsiLinkWA = {
  sellerName: string;
  itemTitle: string;
  wilayahNama: string;
  sellerWhatsapp: string;
  planDay?: string;
  planTime?: string;
  /**
   * Catatan akses logistik dari penjual.
   *
   * KENAPA DI SINI, BUKAN DI HALAMAN PUBLIK:
   * Isinya bisa menunjuk lokasi kamar ("Kamar lantai 3, tangga sempit"), dan
   * PRD §11 no.2 melarang alamat spesifik tampil di antarmuka publik. Tapi
   * catatan ini justru paling dibutuhkan oleh orang yang akan mengangkat
   * barangnya, jadi ia dikirim lewat pesan yang hanya dibaca orang yang
   * sudah menekan tombol hubungi.
   *
   * Batasnya jelas: yang membaca pesan ini sudah punya niat menghubungi
   * penjual, sedangkan halaman publik bisa dibaca siapa pun termasuk
   * pengindeks mesin pencari.
   */
  catatanAkses?: string | null;
};

/**
 * Template pesan dari PRD §FR-5, dengan satu tambahan di akhir: catatan
 * akses logistik bila penjual mengisinya.
 *
 * Kalimat pembukanya tidak diubah karena microcopy-nya sudah disepakati
 * dengan desain. Tambahannya diletakkan di akhir supaya tidak memotong
 * kalimat yang sudah disetujui itu.
 */
export function buildWhatsAppLink(opts: OpsiLinkWA): string {
  let msg =
    `Halo kak ${opts.sellerName}, saya lihat postingan ${opts.itemTitle} ` +
    `di Angkutin area ${opts.wilayahNama}. Apakah barangnya masih bisa ` +
    `diambil? Saya berencana ambil hari ${opts.planDay ?? "[Hari]"} jam ` +
    `${opts.planTime ?? "[Jam]"}. Terima kasih.`;

  const catatan = opts.catatanAkses?.trim();
  if (catatan) {
    msg += `\n\nCatatan dari penjual soal akses: ${catatan}`;
  }

  const digits = normalizeWhatsApp(opts.sellerWhatsapp);
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

/** Link untuk penjual menyimpan tautan kelola ke WhatsApp sendiri (Risiko 3). */
export function buildWhatsAppSelfLink(
  sellerWhatsapp: string,
  manageUrl: string,
): string {
  const msg =
    `Tautan pengelolaan listing Angkutin saya:\n${manageUrl}\n\n` +
    `Simpan pesan ini untuk menandai barang sudah diambil atau menghapusnya nanti.`;
  return `https://wa.me/${normalizeWhatsApp(sellerWhatsapp)}?text=${encodeURIComponent(msg)}`;
}
