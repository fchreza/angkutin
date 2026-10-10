import { NextResponse } from "next/server";

/** Respons JSON dengan header no-store (data listing selalu berubah). */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function gagal(pesan: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json(
    { error: pesan, ...(extra ?? {}) },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Ambil IP klien dari header proxy Vercel.
 * Dipakai HANYA untuk rate limiting, dan selalu di-hash sebelum disimpan.
 */
export function ipKlien(req: Request): string {
  const h = req.headers;
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") || h.get("cf-connecting-ip") || "0.0.0.0";
}

/** Body JSON yang aman (tidak melempar saat body kosong/rusak). */
export async function bacaJson<T = unknown>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
