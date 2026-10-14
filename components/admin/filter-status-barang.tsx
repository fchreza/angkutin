import type { ListingStatus } from "@/db/schema";
import type { JumlahStatusBarangAdmin } from "@/lib/admin-barang";

const FILTER_STATUS: { value: ListingStatus | null; label: string }[] = [
  { value: null, label: "Semua" },
  { value: "AVAILABLE", label: "Tayang" },
  { value: "TAKEN", label: "Sudah diambil" },
  { value: "EXPIRED", label: "Kedaluwarsa" },
  { value: "DELETED", label: "Dihapus penjual" },
];

export function FilterStatusBarang({
  statusAktif,
  kueri,
  jumlah,
}: {
  statusAktif?: ListingStatus;
  kueri: string;
  jumlah: JumlahStatusBarangAdmin;
}) {
  const total = Object.values(jumlah).reduce((sum, nilai) => sum + nilai, 0);

  return (
    <nav aria-label="Filter status barang" className="mt-5">
      <p className="mb-2 text-[14px] font-medium text-ink">Tampilkan status</p>
      <ul className="flex flex-wrap gap-2">
        {FILTER_STATUS.map((filter) => {
          const aktif = (filter.value ?? undefined) === statusAktif;
          const params = new URLSearchParams();
          if (kueri) params.set("q", kueri);
          if (filter.value) params.set("status", filter.value);
          const queryString = params.toString();
          const jumlahFilter = filter.value ? jumlah[filter.value] : total;

          return (
            <li key={filter.value ?? "ALL"}>
              <a
                href={`/admin${queryString ? `?${queryString}` : ""}`}
                aria-current={aktif ? "page" : undefined}
                className={`inline-flex min-h-[40px] items-center gap-2 rounded-pill border px-3.5 py-2 text-[13px] font-medium transition-colors ${
                  aktif
                    ? "border-primary bg-primary text-primary-teks"
                    : "border-line-kuat bg-surface text-ink hover:bg-surface2"
                }`}
              >
                <span>{filter.label}</span>
                <span
                  className={`tabular-nums ${aktif ? "text-primary-teks/80" : "text-ink-secondary"}`}
                >
                  {jumlahFilter.toLocaleString("id-ID")}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
