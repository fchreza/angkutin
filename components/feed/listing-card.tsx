import Link, { useLinkStatus } from "next/link";
import { Badge } from "@/components/shared/badge";
import { AppleBreathe } from "@/components/shared/apple-breathe";
import { IconPin, IconClock } from "@/components/shared/icons";
import { formatRupiah } from "@/lib/format";
import { getUrgency, labelTenggat } from "@/lib/urgency";
import { cn } from "@/lib/cn";
import type { KartuListing } from "@/lib/listing-query";

/**
 * Kartu listing.
 *
 * HIERARKI — ini keputusan utama di komponen ini.
 *
 * Harga adalah elemen PALING BESAR di kartu, bukan judulnya. Di marketplace,
 * harga adalah informasi pertama yang dicari mata; judul dibaca setelahnya
 * untuk memastikan barangnya benar. Versi sebelumnya menaruh harga sebagai
 * badge kecil DI ATAS foto, sehingga ukurannya kalah dari judul dan posisinya
 * bersaing dengan foto. Sekarang harga turun ke bawah foto dan jadi teks
 * terbesar di kartu.
 *
 * Rasio foto 4:3, bukan 1:1. Foto barang pindahan (kasur, rak, meja) hampir
 * selalu lebih lebar daripada tinggi, jadi bingkai 1:1 memaksa banyak ruang
 * terbuang di atas dan bawah foto.
 *
 * TEKNIK YANG DIPERTAHANKAN dari versi sebelumnya:
 *
 * 1. `min-width: 0` + `isolation: isolate` pada kartu.
 *    Tanpa min-width 0, satu judul panjang bisa melebarkan sel grid dan
 *    menggeser seluruh kolom.
 *
 * 2. `text-wrap: balance` pada judul, supaya judul dua baris tidak
 *    menyisakan satu kata menggantung di baris kedua.
 *
 * 3. Seluruh kartu tetap SATU tautan.
 *
 * CATATAN: beam tepi yang pernah ditambahkan di sini sudah DIHAPUS atas
 * permintaan pemilik produk — efeknya terlalu ramai di katalog.
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

  return (
    <Link
      href={`/listing/${item.id}`}
      className={cn(
        "kartu press-card group flex flex-col overflow-hidden",
        "rounded-md border border-line bg-surface",
        /*
         * KENAPA kartu diam tetap punya bayangan tipis.
         *
         * Prinsipnya bayangan hanya untuk menandai ketinggian, dan kartu katalog
         * memang tidak melayang. Tapi di kanvas krem, kartu putih dengan batas
         * yang sangat tipis TENGGELAM: batasnya nyaris tidak terlihat, jadi
         * kartunya terbaca seperti kotak yang gagal muncul, bukan seperti kartu.
         *
         * Jadi bayangannya bukan untuk melayang, melainkan untuk MEMISAHKAN
         * bidang putih dari kanvas krem. Ukurannya sengaja sangat kecil
         * (1px dan 3px) sehingga tidak terlihat sebagai bayangan sama sekali,
         * hanya sebagai tepi yang lembut.
         */
        "shadow-[0_1px_2px_rgb(var(--w-ink)/0.05),0_3px_8px_rgb(var(--w-ink)/0.04)]",
        "hover:border-line-kuat hover:shadow-hover",
      )}
    >
      <SedangDibuka />

      {/* Foto — rasio 4:3, sudutnya mengikuti radius kartu lewat overflow-hidden */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface2">
        {item.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.cover_url}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[12px] text-ink-mono">
            Tanpa foto
          </div>
        )}

        {/* Jumlah foto — scrim tetap gelap karena di bawahnya selalu foto */}
        {item.jumlah_foto > 1 && (
          <span className="absolute right-2 top-2 rounded-pill bg-scrim/75 px-2 py-[3px] text-[11px] font-medium text-white">
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
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        {/* Harga — elemen paling besar, sesuai keputusan hierarki di atas */}
        {item.is_free ? (
          <span className="font-display text-[19px] font-bold leading-none tracking-tight text-primary-dark">
            Gratis
          </span>
        ) : (
          <span className="font-display text-[19px] font-bold leading-none tracking-tight text-ink">
            {formatRupiah(item.price)}
          </span>
        )}

        <h3 className="kartu-judul clamp-2 text-[13.5px] font-semibold leading-snug text-ink-secondary">
          {item.title}
        </h3>

        <div className="flex items-center gap-1 text-[12px] text-ink-secondary">
          <IconPin size={13} className="shrink-0 text-ink-mono" />
          <span className="truncate">{item.pickup_landmark}</span>
        </div>

        {/*
          Tenggat sebagai baris teks, bukan pill.

          KENAPA: pill abu-abu berbatas tipis terbaca seperti notifikasi sistem
          yang menempel di kartu, bukan bagian dari desainnya. Sebagai baris
          teks dengan ikon, ia menyatu dengan informasi lain di kartu. Warna
          aksen hanya muncul saat benar-benar mendesak (<= 2 hari), dan itu
          satu-satunya tempat aksen muncul di kartu.
        */}
        <div className="mt-auto flex items-center gap-1 pt-1 text-[12px]">
          <IconClock
            size={13}
            className={cn("shrink-0", mendesak ? "text-accent" : "text-ink-mono")}
          />
          <span className={cn("truncate", mendesak ? "font-semibold text-accent" : "text-ink-secondary")}>
            {labelTenggat(item.deadline_date)}
          </span>
        </div>
      </div>
    </Link>
  );
}
