import { NextResponse } from "next/server";
import { periksaAkses } from "@/lib/lapak";
import { namaCookieSesiKelola, UMUR_SESI_KELOLA_DETIK } from "@/lib/manage-session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { id?: unknown; token?: unknown }
      | null;
    const id = typeof body?.id === "string" ? body.id : "";
    const token = typeof body?.token === "string" ? body.token : "";
    if (!/^[0-9a-f-]{36}$/i.test(id) || token.length < 20 || !(await periksaAkses(id, token))) {
      return NextResponse.json({ error: "Tautan pengelolaan tidak valid atau sudah kedaluwarsa." }, { status: 404 });
    }

    const response = NextResponse.json({ ok: true }, {
      headers: { "Cache-Control": "no-store, private" },
    });
    response.cookies.set(namaCookieSesiKelola(id), token, {
      httpOnly: true,
      secure: new URL(req.url).protocol === "https:",
      sameSite: "strict",
      path: "/",
      maxAge: UMUR_SESI_KELOLA_DETIK,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Gagal mengamankan tautan pengelolaan." }, { status: 400 });
  }
}
