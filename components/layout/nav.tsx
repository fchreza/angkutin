"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconPlus, IconUser } from "@/components/shared/icons";
import { cn } from "@/lib/cn";

/**
 * Top nav (desktop) + bottom tab bar (mobile).
 *
 * Mobile-first: tab bar di bawah dengan 3 aksi utama, karena jempol
 * lebih mudah menjangkau bawah layar.
 *
 * Logo memakai berkas mark (pin + titik oranye) dari public/brand, bukan
 * huruf — supaya identitasnya sama dengan ikon aplikasi di layar utama.
 * Nama ditulis "angkut" + "in" dengan "in" berwarna emerald, sesuai logo.
 */

function Logo({ ukuran = 30 }: { ukuran?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/mark.png"
      alt=""
      width={ukuran}
      height={ukuran}
      className="shrink-0 rounded-[7px]"
    />
  );
}

function NamaBrand({ kelas }: { kelas: string }) {
  return (
    <span className={kelas}>
      angkut<span className="text-primary">in</span>
    </span>
  );
}

export function TopNav() {
  const path = usePathname();

  return (
    <header className="sticky top-0 z-30 hidden border-b border-line bg-surface/95 backdrop-blur md:block">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <NamaBrand kelas="font-display text-[17px] font-bold tracking-tight text-ink" />
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={cn(
              "rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors",
              path === "/" ? "bg-primary-soft text-primary-dark" : "text-ink-secondary hover:bg-appbg",
            )}
          >
            Katalog
          </Link>
          <Link
            href="/pasang"
            className={cn(
              "rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors",
              path === "/pasang" ? "bg-primary-soft text-primary-dark" : "text-ink-secondary hover:bg-appbg",
            )}
          >
            Pasang Barang
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function MobileAppBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur md:hidden">
      <div className="flex h-14 items-center justify-center px-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo ukuran={28} />
          <NamaBrand kelas="font-display text-[16px] font-bold tracking-tight text-ink" />
        </Link>
      </div>
    </header>
  );
}

export function MobileTabBar() {
  const path = usePathname();
  const item = (aktif: boolean) =>
    cn(
      "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors",
      aktif ? "text-primary" : "text-ink-secondary",
    );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-[60px] items-stretch">
        <Link href="/" className={item(path === "/")}>
          <IconHome size={20} />
          Katalog
        </Link>
        <Link href="/pasang" className={item(path === "/pasang")}>
          <IconPlus size={20} />
          Pasang
        </Link>
        <Link href="/tentang" className={item(path === "/tentang")}>
          <IconUser size={20} />
          Tentang
        </Link>
      </div>
    </nav>
  );
}

/** Tombol aksi mengambang "+ Pasang Barang" (FAB) — emerald, kanan bawah. */
export function FabPasang() {
  const path = usePathname();
  if (path === "/pasang") return null;

  return (
    <Link
      href="/pasang"
      className={cn(
        "fixed z-30 inline-flex items-center gap-2 rounded-pill bg-primary px-4 py-3.5",
        "font-semibold text-white shadow-fab transition-colors hover:bg-primary-dark",
        "bottom-[76px] right-4 md:bottom-8 md:right-8",
      )}
    >
      <IconPlus size={18} />
      <span className="text-[14px]">Pasang Barang</span>
    </Link>
  );
}
