import { db } from "@/db";
import { categories, clusters } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { FormPasang } from "@/components/form/form-pasang";
import { TopNav, MobileAppBar, MobileTabBar } from "@/components/layout/nav";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lepas Barang Pindahan — Angkutin",
  description:
    "Pasang listing tanpa daftar akun. Unggah foto, isi data, tayangkan.",
};

/** Layar 3: Form Pasang Listing. */
export default async function PasangPage() {
  const [kluster, kategori] = await Promise.all([
    db
      .select({ id: clusters.id, name: clusters.name, city: clusters.city })
      .from(clusters)
      .where(eq(clusters.isActive, true))
      .orderBy(asc(clusters.name)),
    db
      .select({ id: categories.id, name: categories.name, slug: categories.slug })
      .from(categories)
      .orderBy(asc(categories.displayOrder)),
  ]);

  return (
    <>
      <TopNav />
      <MobileAppBar />

      <main className="mx-auto w-full max-w-[1200px] px-4 pb-[130px] pt-4 md:px-6 md:pb-24 md:pt-6">
        <div className="mb-5">
          <h1 className="font-display text-[22px] font-bold tracking-tight text-ink md:text-[26px]">
            Lepas Barang Pindahan
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-secondary">
            Tanpa daftar akun — barang siap diambil sendiri.
          </p>
        </div>

        <FormPasang kluster={kluster} kategori={kategori} />
      </main>

      <MobileTabBar />
    </>
  );
}
