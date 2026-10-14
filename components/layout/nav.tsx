"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconPlus,
  IconUser,
} from "@/components/shared/icons";
import { AppleBreathe } from "@/components/shared/apple-breathe";
import { TombolTema } from "@/components/shared/tombol-tema";
import { cn } from "@/lib/cn";

/**
 * Navigasi berbentuk kapsul: bar atas yang ringan di desktop, identitas ringkas
 * di ponsel, dan tab bawah yang mengambang agar mudah dijangkau ibu jari.
 *
 * Umpan balik tautan tetap memakai useLinkStatus agar setiap perpindahan terasa
 * langsung, termasuk ketika halaman berikutnya masih dimuat.
 */
function Logo({ ukuran = 28 }: { ukuran?: number }) {
  return (
    <img
      src="/brand/mark.png"
      alt=""
      width={ukuran}
      height={ukuran}
      className="shrink-0"
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

/** Isi tautan berubah seketika menjadi loader saat halaman berikutnya dibuka. */
function IsiTautan({
  label,
  ikon,
  teks,
}: {
  label: string;
  ikon?: React.ReactNode;
  /** true = tampilkan label teks di samping ikon. */
  teks?: boolean;
}) {
  const { pending } = useLinkStatus();

  if (pending) {
    return (
      <>
        <AppleBreathe ukuran={ikon ? 20 : 16} />
        {teks && <span className="sr-only">Membuka {label}…</span>}
      </>
    );
  }

  return (
    <>
      {ikon}
      {teks && <span>{label}</span>}
    </>
  );
}

/** Satu tempat untuk tiap tujuan: aksi utama tidak diulang sebagai tautan teks. */
const TAUTAN = [
  { href: "/", label: "Katalog" },
  { href: "/tentang", label: "Tentang" },
];

export function TopNav() {
  const path = usePathname();

  return (
    <header className="sticky top-0 z-30 hidden md:block">
      <div className="shell py-2.5">
        <div className="flex h-[60px] items-center justify-between rounded-pill border border-line/80 bg-surface/95 px-2.5 shadow-[0_5px_24px_rgba(15,23,42,0.07)] backdrop-blur-xl">
          <Link
            href="/"
            className="press flex shrink-0 items-center gap-2 rounded-pill py-1 pl-1 pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-pill bg-primary-soft">
              <Logo ukuran={27} />
            </span>
            <NamaBrand kelas="font-display text-[16px] font-bold tracking-tight text-ink" />
          </Link>

          <nav
            aria-label="Navigasi utama"
            className="flex items-center gap-1 rounded-pill bg-surface2/75 p-1"
          >
            {TAUTAN.map((tautan) => {
              const aktif = path === tautan.href;
              return (
                <Link
                  key={tautan.href}
                  href={tautan.href}
                  aria-current={aktif ? "page" : undefined}
                  className={cn(
                    "press inline-flex h-10 items-center rounded-pill px-4 text-[13.5px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    aktif
                      ? "bg-surface text-ink shadow-sm ring-1 ring-line/70"
                      : "text-ink-secondary hover:bg-surface/70 hover:text-ink",
                  )}
                >
                  <IsiTautan label={tautan.label} teks />
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <TombolTema />
            {path !== "/pasang" && (
              <Link
                href="/pasang"
                aria-label="Pasang barang"
                className="press inline-flex h-10 items-center gap-2 rounded-pill bg-primary px-4 text-[13.5px] font-semibold text-primary-teks shadow-[0_4px_12px_rgba(4,120,87,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-[0_7px_16px_rgba(4,120,87,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <IsiTautan
                  label="Pasang Barang"
                  ikon={
                    <>
                      <IconPlus size={16} />
                      <span>Pasang Barang</span>
                    </>
                  }
                />
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function MobileAppBar() {
  const path = usePathname();

  return (
    <header className="sticky top-0 z-30 md:hidden">
      <div className="px-3 pb-1 pt-2">
        <div className="flex h-[54px] items-center justify-between rounded-pill border border-line/80 bg-surface/95 px-2 shadow-[0_4px_18px_rgba(15,23,42,0.06)] backdrop-blur-xl">
          <Link
            href="/"
            className="press flex h-11 items-center gap-2 rounded-pill pl-1 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-pill bg-primary-soft">
              <Logo ukuran={25} />
            </span>
            <NamaBrand kelas="font-display text-[15.5px] font-bold tracking-tight text-ink" />
          </Link>

          <div className="flex items-center gap-1.5">
            <Link
              href="/tentang"
              aria-current={path === "/tentang" ? "page" : undefined}
              className={cn(
                "press inline-flex h-10 items-center rounded-pill px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                path === "/tentang"
                  ? "bg-primary-soft text-primary-dark"
                  : "text-ink-secondary hover:bg-surface2 hover:text-ink",
              )}
            >
              <IsiTautan label="Tentang" teks />
            </Link>
            <TombolTema />
          </div>
        </div>
      </div>
    </header>
  );
}

export function MobileTabBar() {
  const path = usePathname();

  const item = (aktif: boolean) =>
    cn(
      "press flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-pill px-1 py-1.5 text-[11px] font-semibold transition-colors",
      aktif ? "bg-primary-soft text-primary-dark" : "text-ink-secondary hover:text-ink",
    );

  /** Ikon aktif membesar halus agar lokasi terasa jelas tanpa mengandalkan warna saja. */
  const ikon = (aktif: boolean, node: React.ReactNode) => (
    <span className={cn("transition-transform duration-200", aktif && "scale-110")}>
      {node}
    </span>
  );

  return (
    <nav
      aria-label="Navigasi bawah"
      className="fixed inset-x-3 z-30 rounded-pill border border-line/80 bg-surface/95 p-1.5 shadow-[0_10px_32px_rgba(15,23,42,0.13)] backdrop-blur-xl md:hidden"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 10px)" }}
    >
      <div className="flex h-[56px] items-stretch">
        <Link
          href="/"
          className={item(path === "/")}
          aria-current={path === "/" ? "page" : undefined}
        >
          <IsiTautan label="Katalog" ikon={ikon(path === "/", <IconHome size={20} />)} teks />
        </Link>
        <Link
          href="/pasang"
          className={item(path === "/pasang")}
          aria-current={path === "/pasang" ? "page" : undefined}
        >
          <IsiTautan label="Pasang" ikon={ikon(path === "/pasang", <IconPlus size={20} />)} teks />
        </Link>
        <Link
          href="/tentang"
          className={item(path === "/tentang")}
          aria-current={path === "/tentang" ? "page" : undefined}
        >
          <IsiTautan label="Tentang" ikon={ikon(path === "/tentang", <IconUser size={20} />)} teks />
        </Link>
      </div>
    </nav>
  );
}

/** Tombol aksi mengambang di ponsel, dengan jarak aman di atas tab bar kapsul. */
export function FabPasang() {
  const path = usePathname();
  const sembunyi = path === "/pasang" || path.startsWith("/manage");

  return (
    <Link
      href="/pasang"
      aria-label="Pasang barang"
      className={cn(
        "press fixed right-4 z-30 inline-flex items-center gap-2 rounded-pill px-4 py-3.5 md:hidden",
        "bottom-[calc(env(safe-area-inset-bottom)+84px)] bg-primary font-semibold text-primary-teks shadow-[0_8px_24px_rgba(4,120,87,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        sembunyi && "hidden",
      )}
    >
      <IsiTautan
        label="Pasang Barang"
        ikon={
          <>
            <IconPlus size={18} />
            <span className="text-[14px]">Pasang Barang</span>
          </>
        }
      />
    </Link>
  );
}
