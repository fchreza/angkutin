import { NextResponse } from "next/server";
import { z } from "zod";
import { sudahMasuk, adminSiap } from "@/lib/admin";
import { tautanBarang } from "@/lib/admin-barang";
import { ipKlien } from "@/lib/api";
import { lepaskanRateLimit, reservasiRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/tautan?id=<listingId>
 *
 * Mengembalikan tautan kelola + tautan publik untuk SATU barang.
 *
 * KENAPA PERLU ENDPOINT TERPISAH, bukan sekadar menyembunyikan tautan dengan CSS:
 * Halaman admin dirender di server. Kalau token dikirim di HTML lalu
 * disembunyikan sampai tombolnya diklik, semua tautan kelola tetap ada di
 * dalam dokumen — dan "tersembunyi" hanya berlaku untuk mata, bukan untuk
 * "View Source", ekstensi browser, atau tangkapan layar. Satu-satunya cara
 * menyembunyikan tautan dengan benar adalah tidak mengirimkannya sejak awal.
 *
 * KENAPA GET, bukan POST: ini pembacaan, bukan perubahan data. Yang dilindungi
 * adalah SIAPA yang boleh membaca, dan itu diperiksa lewat sesi admin.
 */

const skema = z.object({
  // Harus UUID. Tanpa batas ini, nilai apa pun bisa masuk ke query dan
  // memaksa database membandingkan tipe yang salah.
  id: z.string().uuid(),
});

export async function GET(req: Request) {
  if (!adminSiap()) {
    return NextResponse.json({ error: "Admin belum dikonfigurasi." }, { status: 503 });
  }

  if (!(await sudahMasuk())) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  const ip = ipKlien(req);

  /*
   * Rate limit dengan aksi tersendiri.
   *
   * Batasnya 300/jam — sengaja longgar. Sesi dukungan wajar membuka beberapa
   * tautan berturut-turut, dan batas ketat justru akan menghalangi admin
   * bekerja. Tujuannya bukan membatasi pemakaian normal, melainkan menahan
   * pengambilan otomatis kalau sesi admin sampai bocor.
   */
  const rl = await reservasiRateLimit(ip, "admin_tautan");
  if (!rl.boleh) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan tautan. Coba lagi nanti." },
      { status: 429 },
    );
  }

  const id = new URL(req.url).searchParams.get("id") ?? "";
  const parsed = skema.safeParse({ id });
  if (!parsed.success) {
    if (rl.idReservasi) await lepaskanRateLimit(rl.idReservasi);
    return NextResponse.json({ error: "Id barang tidak valid." }, { status: 400 });
  }

  let data;
  try {
    data = await tautanBarang(parsed.data.id);
  } catch (e) {
    if (rl.idReservasi) await lepaskanRateLimit(rl.idReservasi);
    throw e;
  }
  if (!data) {
    if (rl.idReservasi) await lepaskanRateLimit(rl.idReservasi);
    return NextResponse.json({ error: "Barang tidak ditemukan." }, { status: 404 });
  }

  /*
   * Dicatat di log server.
   *
   * Satu-satunya orang yang bisa memakai endpoint ini adalah pemilik situs,
   * jadi catatan ini bukan untuk mengawasi siapa pun — melainkan supaya kalau
   * suatu saat tautan bocor, ada jejak kapan tautan itu diambil dari halaman
   * admin. Tanpa catatan, tidak ada cara membedakan kebocoran dari halaman
   * admin dengan kebocoran dari tautan yang sudah beredar.
   */
  console.log(`[admin] tautan barang diambil: ${parsed.data.id}`);

  // Origin dari request yang sebenarnya, bukan env: kalau env belum diisi,
  // tautan yang disalin akan berbunyi "localhost" dan tidak bisa dibuka.
  const origin = new URL(req.url).origin;

  return NextResponse.json({
    listingId: data.listingId,
    tautanPublik: `${origin}/listing/${data.listingId}`,
    tautanBarang: `${origin}/manage/${data.listingId}?token=${data.tokenBarang}`,
    lapak: data.lapak
      ? {
          id: data.lapak.id,
          tautan: `${origin}/manage/${data.lapak.id}?token=${data.lapak.token}`,
        }
      : null,
  });
}
