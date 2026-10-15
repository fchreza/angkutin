import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { periksaSandi, cookieSesi, NAMA_COOKIE, adminSiap } from "@/lib/admin";
import { ipKlien } from "@/lib/api";
import { lepaskanRateLimit, reservasiRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * POST /api/v1/admin/masuk — masuk ke halaman admin.
 *
 * KENAPA ADA RATE LIMIT DI SINI, padahal endpoint lain tidak:
 * Ini satu-satunya endpoint di aplikasi ini yang memeriksa sandi. Tanpa
 * batas, seseorang bisa mencoba ribuan sandi per menit. Batasnya memakai
 * aksi `admin_login` yang terpisah dari aksi lain supaya percobaan masuk
 * yang gagal tidak ikut memakan jatah pemasangan barang.
 *
 * Pesan galatnya sengaja selalu sama, "Sandi salah", tanpa membedakan
 * "sandi belum disetel" atau "sandi terlalu pendek". Perbedaan itu hanya
 * memberi tahu penyerang sejauh mana ia sudah berhasil.
 */
export async function POST(req: Request) {
  const ip = ipKlien(req);

  if (!adminSiap()) {
    return NextResponse.json(
      {
        error:
          "Halaman admin belum dikonfigurasi. Isi ADMIN_PASS (minimal 8 karakter) di pengaturan lingkungan.",
      },
      { status: 503 },
    );
  }

  const rl = await reservasiRateLimit(ip, "admin_login");
  if (!rl.boleh) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi nanti." },
      { status: 429 },
    );
  }

  let idReservasi: string | undefined = rl.idReservasi;
  try {
    let masukan = "";
    try {
      const body = (await req.json()) as { sandi?: unknown };
      if (typeof body?.sandi === "string") masukan = body.sandi;
    } catch {
      /* body kosong atau rusak: diperlakukan sebagai sandi salah */
    }

    if (!periksaSandi(masukan)) {
      // Percobaan gagal tetap memakai slot; reservasi sudah dicatat atomik.
      idReservasi = undefined;
      return NextResponse.json({ error: "Sandi salah." }, { status: 401 });
    }

    const nilai = cookieSesi();
    if (!nilai) {
      if (idReservasi) await lepaskanRateLimit(idReservasi);
      idReservasi = undefined;
      return NextResponse.json({ error: "Sandi salah." }, { status: 401 });
    }

    // Password benar bukan percobaan gagal, jadi kembalikan slot sebelum
    // membuat sesi. Jika cookie gagal dipasang, tidak ada kuota yang tertahan.
    if (idReservasi) await lepaskanRateLimit(idReservasi);
    idReservasi = undefined;

    const jar = await cookies();
    jar.set(NAMA_COOKIE, nilai, {
      /*
       * httpOnly: skrip di halaman tidak bisa membaca cookie ini, jadi satu
       * celah XSS tidak langsung berarti sesi admin dicuri.
       *
       * secure: hanya dikirim lewat HTTPS. Di pengembangan lokal (http) cookie
       * ini tetap dipasang, jadi syaratnya hanya berlaku saat produksi.
       */
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (idReservasi) {
      try {
        await lepaskanRateLimit(idReservasi);
      } catch (releaseError) {
        logger.error("[admin login] gagal melepas reservasi rate limit:", releaseError);
      }
    }
    throw e;
  }
}
