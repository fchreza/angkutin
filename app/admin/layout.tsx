import type { ReactNode } from "react";
import { RingkasanKunjunganAdmin } from "@/components/admin/ringkasan-kunjungan-admin";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <RingkasanKunjunganAdmin />
    </>
  );
}
