"use client";

import {
  TopNav,
  MobileAppBar,
  MobileTabBar,
  FabPasang,
} from "@/components/layout/nav";

/**
 * Kerangka aplikasi: nav atas, tab bar bawah, dan tombol mengambang.
 *
 * KENAPA DI LAYOUT AKAR, BUKAN DI SETIAP HALAMAN:
 * Sebelumnya setiap halaman merender nav-nya sendiri. Akibatnya, saat
 * berpindah halaman, nav ikut dilepas dan dipasang ulang — sehingga umpan
 * balik "sedang membuka" tidak pernah terlihat: elemennya sudah hilang
 * sebelum sempat menampilkan apa pun.
 *
 * Dengan berada di layout akar, nav TIDAK ikut dilepas saat navigasi. Itulah
 * yang membuat spinner di tombol dan tab bar benar-benar terlihat, dan
 * sekaligus menghilangkan kedipan pada nav antar halaman.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      <MobileAppBar />
      {children}
      {/* FabPasang SELALU dirender; ia sendiri yang memutuskan kapan
          tersembunyi. Kalau di-gate di sini, komponennya ter-unmount begitu
          path berubah dan umpan balik "Membuka…" tidak pernah terlihat. */}
      <FabPasang />
      <MobileTabBar />
    </>
  );
}
