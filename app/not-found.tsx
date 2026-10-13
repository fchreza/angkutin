import Link from "next/link";
import { Button } from "@/components/shared/button";

export const metadata = { title: "Halaman tidak ditemukan, Angkutin" };

export default function NotFound() {
  return (
    <>

      <main className="mx-auto flex w-full max-w-[520px] flex-col items-center px-4 py-20 text-center md:px-6">
        <div className="font-display text-[56px] font-black leading-none text-line">
          404
        </div>
        <h1 className="mt-4 font-display text-[20px] font-bold text-ink">
          Barang ini sudah tidak ada
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">
          Mungkin sudah diambil, dihapus pemiliknya, atau tautannya salah.
        </p>
        <Link href="/" className="mt-6">
          <Button varian="outline">Kembali ke Katalog</Button>
        </Link>
      </main>

    </>
  );
}
