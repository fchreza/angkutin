"use client";

import { cn } from "@/lib/cn";

export type Kategori = { id: string; name: string; slug: string };

/**
 * Filter pills horizontal (Layar 1).
 * Di mobile bisa di-scroll ke samping tanpa scrollbar terlihat.
 * "Semua" ditambahkan di depan karena tidak ada di seed database.
 *
 * TAMPILAN — kenapa latar lembut, bukan garis tipis.
 *
 * Versi sebelumnya memakai chip bergaris tipis dengan latar transparan. Itu
 * terbaca rata dan steril: tidak ada isyarat bahwa chip itu bisa ditekan, dan
 * tujuh chip bergaris berdampingan membuat barisnya sibuk tanpa hierarki.
 *
 * Sekarang: chip tidak aktif memakai latar putih TANPA garis, sehingga
 * terbaca sebagai tombol yang punya bidang tanpa menambah garis ke barisnya.
 * Chip aktif memakai HIJAU PRIMARY, yang langsung terbaca sebagai "sedang
 * memfilter apa" sekaligus memperkuat identitas.
 *
 * Percobaan pertama memakai hitam pekat (`bg-ink`) untuk chip aktif, dan itu
 * salah dua kali: `ink` adalah token warna TEKS, dan memakainya sebagai LATAR
 * membuat chip jadi elemen paling kontras di baris filter sehingga menarik
 * perhatian dari kotak pencarian, padahal pencarian yang harus jadi fokus.
 *
 * Warna aksen (terracotta) sengaja TIDAK dipakai di sini. Aksen hanya untuk
 * urgensi tenggat; kalau chip aktif juga memakai aksen, keduanya berteriak
 * bersamaan dan tidak ada yang menonjol.
 */
export function FilterPills({
  kategori,
  aktif,
  onPilih,
}: {
  kategori: Kategori[];
  aktif: string;
  onPilih: (id: string) => void;
}) {
  const daftar = [{ id: "semua", name: "Semua", slug: "semua" }, ...kategori];

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      {daftar.map((k) => {
        const terpilih = aktif === k.id;
        return (
          <button
            key={k.id}
            type="button"
            onClick={() => onPilih(k.id)}
            aria-pressed={terpilih}
            className={cn(
              /*
               * h-11 (44px) BUKAN py-2 (36px): 44px adalah ukuran sasaran sentuh
               * minimum yang disyaratkan WCAG 2.5.5, dan chip ini deretan
               * tombol yang paling sering ditekan di layar katalog. Diukur
               * sebelumnya: 36px, artinya 8px lebih kecil dari ambang.
               */
              "press inline-flex h-11 shrink-0 items-center rounded-pill px-4 text-[13px] font-semibold",
              terpilih
                ? "bg-primary text-primary-teks shadow-card"
                : "bg-surface text-ink-secondary shadow-card hover:text-ink",
            )}
          >
            {k.name}
          </button>
        );
      })}
    </div>
  );
}
