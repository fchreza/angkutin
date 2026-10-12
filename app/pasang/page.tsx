import { db } from "@/db";
import { categories } from "@/db/schema";
import { asc } from "drizzle-orm";
import { FormPasang } from "@/components/form/form-pasang";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lepas Barang Pindahan — Angkutin",
  description:
    "Pasang listing tanpa daftar akun. Unggah foto, isi data, tayangkan.",
};

/**
 * Layar 3: Form Pasang Listing.
 *
 * Wilayah (provinsi/kabupaten/kecamatan) TIDAK diambil di sini. Form memuatnya
 * sendiri di sisi klien, dan hanya saat dibutuhkan:
 *  - provinsi + kabupaten: lib/data/wilayah.json (17 KB)
 *  - kecamatan: diambil dari GET /api/v1/wilayah/kecamatan saat kabupaten
 *    dipilih (~0,5 KB per permintaan). Kode kecamatan TIDAK bisa diturunkan
 *    dari urutan daftar, jadi sumbernya harus server.
 *
 * Alasannya: mengirim seluruh 7.285 kecamatan = 111 KB ke setiap pengunjung,
 * padahal hanya sebagian kecil yang membuka form ini.
 */
export default async function PasangPage() {
  const kategori = await db
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(categories)
    .orderBy(asc(categories.displayOrder));

  return (
    <>

      <main className="shell w-full pb-[130px] pt-4 md:pb-24 md:pt-6">
        <div className="mb-5">
          <h1 className="font-display text-[22px] font-bold tracking-tight text-ink md:text-[26px]">
            Lepas Barang Pindahan
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-secondary">
            Tanpa daftar akun — barang siap diambil sendiri.
          </p>
        </div>

        <FormPasang kategori={kategori} />
      </main>

    </>
  );
}
