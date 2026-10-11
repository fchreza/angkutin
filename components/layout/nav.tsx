"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconPlus, IconUser } from "@/components/shared/icons";
import { Spinner } from "@/components/shared/spinner";
import { cn } from "@/lib/cn";

/**
 * Top nav (desktop) + bottom tab bar (mobile) + FAB.
 *
 * Mobile-first: tab bar di bawah dengan 3 aksi utama, karena jempol lebih
 * mudah menjangkau bawah layar.
 *
 * Logo memakai berkas mark (pin + titik oranye) dari public/brand, bukan
 * huruf — supaya identitasnya sama dengan ikon aplikasi di layar utama.
 * Nama ditulis "angkut" + "in" dengan "in" berwarna emerald, sesuai logo.
 *
 * UMPAN BALIK NAVIGASI:
 * Menekan "Pasang Barang" dulu tidak memberi reaksi apa pun sampai halaman
 * form selesai dimuat — terasa seperti tombolnya tidak bekerja. Sekarang
 * tautan yang sedang dibuka langsung menampilkan spinner di tempat ikonnya,
 * sejak milidetik pertama ditekan. Ditambah loading.tsx di rute /pasang,
 * peralihan halaman terasa disengaja, bukan menggantung.
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
        <Link href="/" className="press flex items-center gap-2 rounded-md">
          <Logo />
          <NamaBrand kelas="font-display text-[17px] font-bold tracking-tight text-ink" />
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={cn(
              "press rounded-md px-3 py-2 text-[13.5px] font-medium",
              path === "/" ? "bg-primary-soft text-primary-dark" : "text-ink-secondary hover:bg-appbg",
            )}
          >
            Katalog
          </Link>
          <Link
            href="/pasang"
            className={cn(
              "press rounded-md px-3 py-2 text-[13.5px] font-medium",
              path === "/pasang"
                ? "bg-primary-soft text-primary-dark"
                : "text-ink-secondary hover:bg-appbg",
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
        <Link href="/" className="press flex items-center gap-2 rounded-md">
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
      "press flex flex-1 flex-col items-center justify-center gap-1 py-2",
      "text-[11px] font-medium",
      aktif ? "text-primary" : "text-ink-secondary",
    );

  /** Ikon: skala lebih besar saat aktif. */
  const ikon = (aktif: boolean, node: React.ReactNode) => (
    <span className={cn("transition-transform duration-200", aktif && "scale-110")}>
      {node}
    </span>
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-[60px] items-stretch">
        <Link href="/" className={item(path === "/")} aria-current={path === "/" ? "page" : undefined}>
          {ikon(path === "/", <IconHome size={20} />)}
          Katalog
        </Link>
        <Link
          href="/pasang"
          className={item(path === "/pasang")}
          aria-current={path === "/pasang" ? "page" : undefined}
        >
          {ikon(path === "/pasang", <IconPlus size={20} />)}
          Pasang
        </Link>
        <Link href="/tentang" className={item(path === "/tentang")} aria-current={path === "/tentang" ? "page" : undefined}>
          {ikon(path === "/tentang", <IconUser size={20} />)}
          Tentang
        </Link>
      </div>
    </nav>
  );
}

/** Tombol aksi mengambang "+ Pasang Barang" (FAB) — emerald, kanan bawah. */
export function FabPasang() {
  const path = usePathname();

  // Di halaman pasang tombolnya tidak perlu — tapi elemennya tetap dirender
  // (hanya disembunyikan) supaya tidak ada kedipan saat berpindah halaman.
  const sembunyi = path === "/pasang" || path.startsWith("/manage");

  return (
    <Link
      href="/pasang"
      className={cn(
        "press fixed z-30 inline-flex items-center gap-2 rounded-pill px-4 py-3.5",
        "bg-primary font-semibold text-white shadow-fab hover:bg-primary-dark",
        "bottom-[76px] right-4 md:bottom-8 md:right-8",
        sembunyi && "hidden",
      )}
    >
      <IconPlus size={18} />
      <span className="text-[14px]">Pasang Barang</span>
    </Link>
  );
}
