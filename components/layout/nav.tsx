"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconPlus, IconUser } from "@/components/shared/icons";
import { Spinner } from "@/components/shared/spinner";
import { AppleBreathe } from "@/components/shared/apple-breathe";
import { TombolTema } from "@/components/shared/tombol-tema";
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
 *
 * LEBAR: memakai kelas .shell (bukan max-w-[1200px] seperti sebelumnya)
 * supaya nav dan konten punya tepi yang sama persis di semua ukuran layar.
 */

function Logo({ ukuran = 28 }: { ukuran?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
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

/**
 * Isi tautan yang berubah saat tautannya sedang dibuka.
 *
 * Dipakai di dalam <Link>: `useLinkStatus` membaca status tautan terdekat di
 * atasnya, jadi umpan baliknya muncul sejak milidetik pertama ditekan —
 * sebelum server selesai menyiapkan halaman berikutnya. Ini yang membuat
 * perpindahan halaman terasa direspons, bukan menggantung.
 *
 * Hanya satu dari dua yang dirender, jadi tidak ada elemen menganggur.
 */
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

const TAUTAN = [
  { href: "/", label: "Katalog" },
  { href: "/pasang", label: "Pasang Barang" },
  { href: "/tentang", label: "Tentang" },
];

export function TopNav() {
  const path = usePathname();

  return (
    <header className="sticky top-0 z-30 hidden border-b border-line bg-surface/85 backdrop-blur-md md:block">
      <div className="shell flex h-14 items-center justify-between">
        <Link href="/" className="press flex items-center gap-2 rounded-md">
          <Logo />
          <NamaBrand kelas="font-display text-[16px] font-bold tracking-tight text-ink" />
        </Link>

        <nav className="flex items-center gap-0.5">
          {TAUTAN.map((t) => {
            const aktif = path === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={aktif ? "page" : undefined}
                className={cn(
                  "press rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors",
                  aktif
                    ? "text-ink"
                    : "text-ink-secondary hover:text-ink",
                )}
              >
                <IsiTautan label={t.label} teks />
              </Link>
            );
          })}

          {/* Pemisah tipis antara navigasi dan kontrol tema */}
          <span className="mx-1.5 h-5 w-px bg-line" aria-hidden />
          <TombolTema />
        </nav>
      </div>
    </header>
  );
}

export function MobileAppBar() {
  const path = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/" className="press flex items-center gap-2 rounded-md">
          <Logo ukuran={26} />
          <NamaBrand kelas="font-display text-[15.5px] font-bold tracking-tight text-ink" />
        </Link>

        {/* Di mobile, tema tetap bisa diganti — jangan sembunyikan kontrol
            yang memengaruhi seluruh tampilan. Celah gap-2 (8px) dipakai agar
            pill tema tidak menempel pada tautan "Tentang"; pada 375px masih
            tersisa ruang, dan tidak ada overflow horizontal. */}
        <div className="flex items-center gap-2">
          <Link
            href="/tentang"
            aria-current={path === "/tentang" ? "page" : undefined}
            className="press rounded-md px-2.5 py-2 text-[13px] font-medium text-ink-secondary hover:text-ink"
          >
            <IsiTautan label="Tentang" teks />
          </Link>
          <TombolTema />
        </div>
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
          <IsiTautan label="Katalog" ikon={ikon(path === "/", <IconHome size={20} />)} teks />
        </Link>
        <Link
          href="/pasang"
          className={item(path === "/pasang")}
          aria-current={path === "/pasang" ? "page" : undefined}
        >
          <IsiTautan label="Pasang" ikon={ikon(path === "/pasang", <IconPlus size={20} />)} teks />
        </Link>
        <Link href="/tentang" className={item(path === "/tentang")} aria-current={path === "/tentang" ? "page" : undefined}>
          <IsiTautan label="Tentang" ikon={ikon(path === "/tentang", <IconUser size={20} />)} teks />
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
        "bg-primary font-semibold text-primary-teks shadow-fab hover:bg-primary-hover",
        "bottom-[76px] right-4 md:bottom-8 md:right-8",
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
