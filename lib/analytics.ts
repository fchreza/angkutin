import { db } from "@/db";
import { pageviews } from "@/db/schema";
import { and, gte, lt, sql } from "drizzle-orm";

/**
 * Analitik kunjungan halaman — milik sendiri, tanpa pihak ketiga.
 *
 * KENAPA DIBUAT SENDIRI, bukan memakai layanan:
 * Produk ini menjanjikan "tanpa daftar akun" dan pengguna tidak pernah
 * menandatangani apa pun. Memasang skrip pelacak pihak ketiga berarti
 * mengirim perilaku pengguna ke perusahaan lain tanpa mereka tahu, dan itu
 * bertentangan dengan janji produknya sendiri. Skrip pelacak juga menambah
 * berat halaman, sementara target PRD adalah muat di bawah 1,8 detik pada
 * koneksi lambat.
 *
 * YANG TIDAK PERNAH DISIMPAN: alamat IP, token pada URL, kata kunci
 * pencarian, isi kolom apa pun. Tidak ada cookie dan tidak ada penyimpanan
 * di perangkat, jadi dua kunjungan tidak bisa digabungkan menjadi satu orang.
 */

/** Lama data kunjungan disimpan. */
const SIMPAN_HARI = 90;

/**
 * Bersihkan kunjungan lama (dipanggil dari cron harian).
 *
 * KENAPA 90 HARI, bukan selamanya: satu-satunya pertanyaan yang perlu
 * dijawab data ini adalah "halaman mana yang dipakai bulan ini dan
 * sebelumnya". Menyimpan lebih lama dari itu tidak menambah jawaban, tapi
 * menambah risiko dan ukuran database.
 */
export async function bersihkanPageview(): Promise<number> {
  const batas = new Date(Date.now() - SIMPAN_HARI * 24 * 3600_000);
  const hasil = await db
    .delete(pageviews)
    .where(lt(pageviews.createdAt, batas))
    .returning({ id: pageviews.id });
  return hasil.length;
}

/**
 * Ringkasan kunjungan untuk N hari terakhir.
 *
 * Dikelompokkan per jalur, diurutkan dari yang paling banyak dibuka. Ini
 * bentuk yang menjawab pertanyaan sebenarnya: halaman mana yang dipakai
 * orang, dan halaman mana yang tidak pernah dibuka.
 *
 * Sengaja TIDAK mengembalikan deret waktu per jam. Data per jam hanya berguna
 * kalau ada cukup banyak kunjungan untuk membuat polanya terlihat, dan
 * produk ini belum sampai ke sana. Menampilkan grafik dari beberapa
 * kunjungan saja akan menyesatkan.
 */
export async function ringkasanKunjungan(hari = 30) {
  const sejak = new Date(Date.now() - hari * 24 * 3600_000);

  const perJalur = await db
    .select({
      path: pageviews.path,
      jumlah: sql<number>`count(*)::int`,
    })
    .from(pageviews)
    /*
     * `gte()` dipakai, BUKAN template `sql` dengan nilai Date di dalamnya.
     * Driver `postgres` menolak objek Date mentah yang disisipkan lewat
     * template: galatnya "The string argument must be of type string or an
     * instance of Buffer or ArrayBuffer. Received an instance of Date".
     * Operator Drizzle menerjemahkan Date dengan benar, jadi pakai itu.
     */
    .where(gte(pageviews.createdAt, sejak))
    .groupBy(pageviews.path)
    .orderBy(sql`count(*) desc`)
    .limit(50);

  const perRujukan = await db
    .select({
      referrer: pageviews.referrer,
      jumlah: sql<number>`count(*)::int`,
    })
    .from(pageviews)
    .where(gte(pageviews.createdAt, sejak))
    .groupBy(pageviews.referrer)
    .orderBy(sql`count(*) desc`);

  const [total] = await db
    .select({ jumlah: sql<number>`count(*)::int` })
    .from(pageviews)
    .where(gte(pageviews.createdAt, sejak));

  return {
    hari,
    total: total?.jumlah ?? 0,
    per_jalur: perJalur,
    per_rujukan: perRujukan,
  };
}
