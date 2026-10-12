import Link, { useLinkStatus } from "next/link";
import { Badge } from "@/components/shared/badge";
import { AppleBreathe } from "@/components/shared/apple-breathe";
import { IconPin, IconClock } from "@/components/shared/icons";
import { formatRupiah } from "@/lib/format";
import { getUrgency, labelTenggat } from "@/lib/urgency";
import { cn } from "@/lib/cn";
import type { KartuListing } from "@/lib/listing-query";

/**
 * Kartu listing (Layar 1 & 2 dari mockup).
 *
 * Aturan visual dari PRD §8.1 + checklist kesesuaian desain:
 * - Foto rasio 1:1, rounded 12px.
 * - Badge harga (tebal) atau badge "GRATIS" hijau.
 * - Badge tenggat: abu-abu normal, amber + ikon jam saat <= 2 hari.
 * - Judul maksimal 2 baris (clamp-2).
 * - State TAKEN: overlay putih 75% + badge monokrom "SUDAH DIAMBIL".
 *
 * TEKNIK YANG DIAMBIL DARI uiarc/card:
 *
 * 1. `min-width: 0` + `isolation: isolate` pada kartu.
 *    Tanpa min-width 0, satu judul panjang bisa melebarkan sel grid dan
 *    menggeser seluruh kolom.
 *
 * 2. `text-wrap: balance` pada judul, supaya judul dua baris tidak
 *    menyisakan satu kata menggantung di baris kedua.
 *
 * 3. Seluruh kartu tetap SATU tautan. Referensinya menjadikan judul sebagai
 *    tombol pemicu dialog dengan lapisan `::after` yang menutupi kartu; pola
 *    itu berguna untuk quick-look, tapi di sini seluruh kartu memang sudah
 *    sebuah <Link> — jadi tidak ada lapisan tambahan yang perlu diakali.
 *
 * CATATAN: beam tepi yang pernah ditambahkan di sini sudah DIHAPUS atas
 * permintaan pemilik produk — efeknya terlalu ramai di katalog. Urgensi
 * tetap ditandai badge tenggat seperti sebelumnya.
 */
/**
 * Lapisan yang muncul saat kartu ini sedang dibuka.
 *
 * `useLinkStatus` memberi tahu apakah tautan induknya sedang menavigasi.
 * Karena dipanggil di dalam komponen anak (bukan di kartu itu sendiri), ia
 * membaca status tautan terdekat di atasnya — jadi tidak perlu meneruskan
 * prop apa pun.
 *
 * Hanya dirender saat `pending`, jadi tidak ada elemen tambahan di kondisi
 * diam. Ini yang membuat kartu yang ditekan langsung terasa "merespons",
 * bukan menunggu sampai halaman berikutnya siap.
 */
function SedangDibuka() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      className="absolute inset-0 z-10 flex items-center justify-center bg-surface/70 backdrop-blur-[1px]"
      aria-hidden
    >
      <AppleBreathe ukuran={34} />
    </span>
  );
}

export function ListingCard({ item }: { item: KartuListing }) {
  const urgency = getUrgency(item.deadline_date);
  const ambil = item.status === "TAKEN";
  const mendesak = urgency === "urgent" || urgency === "today";
  // Beam menyala sendiri hanya untuk yang paling mendesak (tenggat hari ini).
  const beamOtomatis = urgency === "today";

  return (
    <Link
      href={`/listing/${item.id}`}
      data-mendesak={beamOtomatis ? "true" : undefined}
      className={cn(
        "kartu press-card group flex flex-col overflow-hidden rounded-md border border-line bg-surface",
        "shadow-card hover:border-primary/30 hover:shadow-[0_6px_20px_rgba(17,24,39,0.10)]",
      )}
    >
      {/* Lapisan "sedang dibuka" — hanya ada saat kartu ini ditekan. */}
      <SedangDibuka />

      {/* Isi kartu. */}
      <div className="flex flex-1 flex-col">
        {/* Foto */}
        <div className="relative aspect-square w-full overflow-hidden bg-appbg">
          {item.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.cover_url}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[12px] text-ink-secondary">
              Tanpa foto
            </div>
          )}

          {/* Badge harga / GRATIS — pojok kiri bawah foto */}
          <div className="absolute bottom-2 left-2">
            {item.is_free ? (
              <Badge varian="gratis" className="px-2.5 py-1 text-[12px] shadow-card">
                GRATIS
              </Badge>
            ) : (
              <span className="inline-block rounded-pill bg-surface px-2.5 py-1 text-[13px] font-bold text-ink shadow-card">
                {formatRupiah(item.price)}
              </span>
            )}
          </div>

          {/* Jumlah foto (kalau lebih dari 1) */}
          {item.jumlah_foto > 1 && (
            <span className="absolute right-2 top-2 rounded-pill bg-scrim/80 px-2 py-[3px] text-[11px] font-medium text-white">
              {item.jumlah_foto} foto
            </span>
          )}

          {/* Overlay TAKEN */}
          {ambil && (
            <div className="absolute inset-0 flex items-center justify-center bg-scrim/70">
              <Badge varian="taken" className="px-3 py-1.5 text-[11px] tracking-wide">
                SUDAH DIAMBIL
              </Badge>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-2 p-3">
          <h3 className="kartu-judul clamp-2 font-display text-[14px] font-semibold leading-snug text-ink">
            {item.title}
          </h3>

          <div className="flex items-center gap-1 text-[11.5px] text-ink-secondary">
            <IconPin size={12} />
            <span className="truncate">{item.pickup_landmark}</span>
          </div>

          {/* Badge tenggat */}
          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-pill border px-2 py-[3px] text-[11px] font-medium",
                mendesak
                  ? "border-accent-bright bg-accent-soft text-accent-text"
                  : "border-line bg-appbg text-ink-secondary",
              )}
            >
              {mendesak && <IconClock size={11} />}
              {labelTenggat(item.deadline_date)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
