import { db } from "@/db";
import { categories, clusters, listings } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ambilFeed, type FilterFeed } from "@/lib/listing-query";
import { ok, gagal, ipKlien } from "@/lib/api";
import { listingSchema, validasiTenggat } from "@/lib/validators";
import { generateSecretToken } from "@/lib/token";
import { cekRateLimit } from "@/lib/rate-limit";
import { normalizeWhatsApp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/v1/listings — feed katalog terfilter (FR-2).
 * POST /api/v1/listings — buat listing baru (FR-3), mengembalikan
 *   { id, secret_token, manage_url }.
 */

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const q = u.searchParams;

    const sortRaw = q.get("sort") ?? "mendesak";
    const sort = (["mendesak", "terbaru", "termurah", "gratis"].includes(sortRaw)
      ? sortRaw
      : "mendesak") as FilterFeed["sort"];

    const filter: FilterFeed = {
      cluster_id: q.get("cluster_id") ?? undefined,
      category_id: q.get("category_id") ?? undefined,
      is_free: q.get("is_free") === "true" ? true : undefined,
      q: q.get("q") ?? undefined,
      sort,
      limit: q.get("limit") ? Number(q.get("limit")) : undefined,
      offset: q.get("offset") ? Number(q.get("offset")) : undefined,
    };

    const hasil = await ambilFeed(filter);
    return ok(hasil);
  } catch (e) {
    console.error("[listings GET] gagal:", e);
    return gagal("Gagal memuat daftar barang.", 500);
  }
}

export async function POST(req: Request) {
  try {
    // 1. Rate limit (5 listing/jam/IP)
    const ip = ipKlien(req);
    const rl = await cekRateLimit(ip);
    if (!rl.boleh) {
      return gagal(
        "Kamu sudah memasang 5 barang dalam 1 jam terakhir. Coba lagi nanti ya.",
        429,
      );
    }

    // 2. Parse body JSON (foto diunggah terpisah, lihat catatan di bawah)
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return gagal("Format permintaan tidak valid.", 400);
    }

    // 3. Validasi
    const parsed = listingSchema.safeParse(body);
    if (!parsed.success) {
      const detail: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0] ?? "_");
        if (!detail[k]) detail[k] = issue.message;
      }
      return gagal("Data belum lengkap atau tidak valid.", 400, { detail });
    }
    const d = parsed.data;

    const errTenggat = validasiTenggat(d.deadline_date);
    if (errTenggat) return gagal(errTenggat, 400, { detail: { deadline_date: errTenggat } });

    // 4. Pastikan kluster & kategori benar-benar ada.
    // Tanpa ini, id yang salah akan lolos Zod lalu gagal di foreign key
    // dan pengguna hanya melihat "500 Gagal menyimpan" tanpa tahu sebabnya.
    const [klusterAda] = await db
      .select({ id: clusters.id })
      .from(clusters)
      .where(and(eq(clusters.id, d.cluster_id), eq(clusters.isActive, true)))
      .limit(1);

    if (!klusterAda) {
      return gagal("Kluster tidak dikenal atau sudah tidak aktif.", 400, {
        detail: { cluster_id: "Pilih kluster dari daftar." },
      });
    }

    const kategoriId = d.category_id === "gratis" ? null : d.category_id;
    if (kategoriId) {
      const [kategoriAda] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, kategoriId))
        .limit(1);

      if (!kategoriAda) {
        return gagal("Kategori tidak dikenal.", 400, {
          detail: { category_id: "Pilih kategori dari daftar." },
        });
      }
    }

    // 5. Simpan listing
    const secretToken = generateSecretToken();
    const [baru] = await db
      .insert(listings)
      .values({
        secretToken,
        title: d.title,
        description: d.description,
        categoryId: kategoriId,
        condition: d.condition,
        isFree: d.is_free,
        price: d.is_free ? "0" : String(d.price),
        clusterId: d.cluster_id,
        pickupLandmark: d.pickup_landmark,
        deadlineDate: d.deadline_date,
        accessNotes: d.access_notes || null,
        sellerName: d.seller_name,
        sellerWhatsapp: normalizeWhatsApp(d.seller_whatsapp),
        status: "AVAILABLE",
      })
      .returning({ id: listings.id, secretToken: listings.secretToken });

    // 5. Susun manage_url
    const origin = new URL(req.url).origin;
    const manageUrl = `${origin}/manage/${baru.id}?token=${baru.secretToken}`;

    return ok(
      {
        id: baru.id,
        secret_token: baru.secretToken,
        manage_url: manageUrl,
      },
      201,
    );
  } catch (e) {
    console.error("[listings POST] gagal:", e);
    return gagal("Gagal menyimpan listing. Coba lagi sebentar.", 500);
  }
}

/**
 * Catatan implementasi foto:
 * Foto TIDAK dikirim lewat POST ini. Alurnya:
 *   1. POST /api/v1/listings          -> dapat { id, secret_token }
 *   2. POST /api/v1/listings/:id/images (multipart) -> unggah 1-3 foto
 * Alasannya: Vercel membatasi ukuran body request (4.5 MB), dan mengirim
 * JSON + 3 file sekaligus membuat penanganan error jauh lebih rumit
 * (kalau 1 foto gagal, apakah listing dibatalkan?). Dengan dua langkah,
 * listing tetap sah walau salah satu foto gagal diunggah.
 */