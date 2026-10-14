export const AWAL_COOKIE_SESI_KELOLA = "angkutin_manage_";
export const UMUR_SESI_KELOLA_DETIK = 60 * 60 * 24 * 30;

export function namaCookieSesiKelola(id: string): string {
  return `${AWAL_COOKIE_SESI_KELOLA}${id}`;
}

/** Baca token sesi kelola untuk satu record tanpa mengeksposnya ke URL/JS. */
export function tokenSesiKelola(req: Request, id: string): string {
  const target = namaCookieSesiKelola(id);
  const cookie = req.headers.get("cookie") ?? "";
  for (const bagian of cookie.split(";")) {
    const [nama, ...nilai] = bagian.trim().split("=");
    if (nama !== target) continue;
    try {
      return decodeURIComponent(nilai.join("="));
    } catch {
      return "";
    }
  }
  return "";
}
