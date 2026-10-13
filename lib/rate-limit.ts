import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { hashIp } from "@/lib/token";

/**
 * Rate limiting berbasis database.
 *
 * Kenapa di database, bukan di memori: Vercel menjalankan banyak instance
 * serverless yang tidak berbagi memori, jadi penghitung in-memory tidak
 * akan akurat. Tabel `rate_limits` dibagi semua instance.
 *
 * IP TIDAK disimpan mentah — hanya hash SHA-256 (privasi, NFR §11 no.2).
 *
 * BATAS PER AKSI, BUKAN SATU BATAS UNTUK SEMUA.
 * Setiap aksi punya pola pemakaian yang berbeda, jadi satu angka tidak bisa
 * benar untuk semuanya. Memakai 5/jam untuk semua aksi akan memblokir pembeli
 * yang wajar; memakai 60/jam untuk semua aksi tidak akan menahan spam listing
 * sama sekali. Karena itu batasnya jadi parameter.
 */

type KonfigurasiBatas = {
  /** Jumlah maksimum dalam satu jendela. */
  batas: number;
  /** Panjang jendela dalam jam. */
  jendelaJam: number;
};

/**
 * Batas per aksi.
 *
 * `create_listing`: 5 per jam, dari PRD §11 ENHANCED. Angka ini kecil dengan
 * sengaja karena satu penjual wajar memasang paling banyak beberapa barang.
 *
 * `wa_click`: 60 per jam. Jauh lebih longgar, dan itu keputusan sadar:
 * mahasiswa di satu kampus sering keluar lewat SATU alamat IP bersama (NAT),
 * jadi batas ketat justru akan memblokir pembeli sungguhan di tempat produk
 * ini paling banyak dipakai. 60 per jam tetap memotong pengambilan otomatis
 * yang mencoba memanen nomor penjual, tanpa menghalangi pemakaian wajar.
 */
const BATAS_AKSI: Record<string, KonfigurasiBatas> = {
  create_listing: { batas: 5, jendelaJam: 1 },
  wa_click: { batas: 60, jendelaJam: 1 },
  /**
   * `admin_login`: 10 percobaan per jam.
   *
   * Aksi ini TERPISAH dari yang lain, dan itu disengaja: kalau ia ikut memakai
   * jatah `create_listing`, seseorang yang salah mengetik sandi admin 5 kali
   * akan memblokir dirinya sendiri saat memasang barang dari jaringan yang
   * sama. Dua hal yang tidak berhubungan tidak boleh saling memakan kuota.
   *
   * 10 per jam cukup longgar untuk salah ketik beberapa kali, dan terlalu
   * sempit untuk menebak sandi.
   */
  admin_login: { batas: 10, jendelaJam: 1 },
  /**
   * `admin_tautan`: 300 pengambilan tautan per jam.
   *
   * Sangat longgar, dan itu disengaja. Ini bukan endpoint publik: hanya sesi
   * admin yang bisa memakainya, dan satu sesi dukungan wajar membuka beberapa
   * tautan berturut-turut. Batas ketat di sini hanya akan menghalangi pemilik
   * situs mengerjakan pekerjaannya.
   *
   * Tujuannya bukan membatasi pemakaian normal, melainkan menahan pengambilan
   * otomatis kalau sesi admin sampai bocor — 300/jam cukup untuk bekerja,
   * terlalu lambat untuk memanen seluruh isi database.
   */
  admin_tautan: { batas: 300, jendelaJam: 1 },
};

const BAWAAN: KonfigurasiBatas = { batas: 5, jendelaJam: 1 };

function konfigurasi(aksi: string): KonfigurasiBatas {
  return BATAS_AKSI[aksi] ?? BAWAAN;
}

/**
 * Periksa kuota TANPA memakainya.
 *
 * PENTING — kenapa dipisah dari `catatRateLimit`:
 * Dulu fungsi ini langsung mencatat percobaan. Akibatnya pengguna yang salah
 * mengetik nomor WhatsApp 5 kali akan terkunci 1 jam, padahal tidak satu pun
 * listing-nya tersimpan. Sekarang kuota hanya dipotong setelah listing BENAR
 * tersimpan (lihat catatRateLimit).
 */
export async function cekRateLimit(
  ip: string,
  aksi = "create_listing",
): Promise<{ boleh: boolean; sisa: number }> {
  const { batas, jendelaJam } = konfigurasi(aksi);
  const ipHash = await hashIp(ip);
  const sejak = new Date(Date.now() - jendelaJam * 3600_000);

  const [{ jumlah }] = await db
    .select({ jumlah: sql<number>`count(*)::int` })
    .from(rateLimits)
    .where(
      and(
        eq(rateLimits.ipHash, ipHash),
        eq(rateLimits.action, aksi),
        gte(rateLimits.createdAt, sejak),
      ),
    );

  if (jumlah >= batas) return { boleh: false, sisa: 0 };
  return { boleh: true, sisa: batas - jumlah };
}

/** Catat satu percobaan yang BERHASIL. Panggil setelah data tersimpan. */
export async function catatRateLimit(
  ip: string,
  aksi = "create_listing",
): Promise<void> {
  const ipHash = await hashIp(ip);
  await db.insert(rateLimits).values({ ipHash, action: aksi });
}

/**
 * Bersihkan catatan lama (dipanggil dari cron harian).
 *
 * Jendela terpanjang yang dipakai adalah 1 jam, jadi menyimpan catatan 24 jam
 * sudah lebih dari cukup. Pembersihan ini penting karena tabel ini tumbuh
 * setiap kali ada orang memasang barang ATAU menekan tombol WhatsApp, dan
 * tanpa pembersihan ia akan jadi tabel terbesar di database ini.
 */
export async function bersihkanRateLimit(): Promise<number> {
  const batas = new Date(Date.now() - 24 * 3600_000);
  const hasil = await db
    .delete(rateLimits)
    .where(lt(rateLimits.createdAt, batas))
    .returning({ id: rateLimits.id });
  return hasil.length;
}
