"use client";

import {
  TopNav,
  MobileAppBar,
  MobileTabBar,
  FabPasang,
} from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";

/**
 * Kerangka aplikasi: nav atas, konten, footer, tab bar bawah, tombol mengambang.
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
 *
 * `flex min-h-dvh flex-col` + `mt-auto` pada footer membuat footer selalu
 * menempel di bawah walaupun halaman isinya sedikit (mis. halaman 404).
 * `min-h-dvh` dipakai, bukan `min-h-screen`, karena di browser mobile
 * `100vh` ikut menghitung area yang tertutup bar alamat sehingga halaman
 * jadi lebih tinggi dari layar.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <TopNav />
      <MobileAppBar />
      {children}
      <Footer />
      {/* FabPasang SELALU dirender; ia sendiri yang memutuskan kapan
          tersembunyi. Kalau di-gate di sini, komponennya ter-unmount begitu
          path berubah dan umpan balik "Membuka…" tidak pernah terlihat. */}
      <FabPasang />
      <MobileTabBar />
    </div>
  );
}
