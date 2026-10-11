import { db } from "@/db";
import { categories, listings, listingImages } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { ok, gagal, bacaJson } from "@/lib/api";
import { tokenCocok } from "@/lib/token";
import { editSchema, validasiTenggat } from "@/lib/validators";
import { validasiWilayah } from "@/lib/wilayah-server";
import { normalizeWhatsApp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET   /api/v1/listings/manage/:id?token= — data kelola listing (FR-4).
 * PATCH /api/v1/listings/manage/:id         — ubah isi listing (FR-4).
 *
 * KEAMANAN (berlaku untuk kedua metode):
 *  - Token dibandingkan dengan waktu tetap (constant-time).
 *  - Token salah -> 404, BUKAN 403, supaya penyerang tidak bisa membedakan
 *    antara "listing tidak ada" dan "token salah" (mencegah enumerasi).
 *  - Token hanya dibaca dari query param / body, tidak pernah dari localStorage.
 */

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const token = new URL(req.url).searchParams.get("token");

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return gagal("Tautan pengelolaan tidak valid atau sudah kedaluwarsa", 404);
    }

    const [row] = await db
      .select({
        id: listings.id,
        secretToken: listings.secretToken,
        title: listings.title,
        description: listings.description,
        price: listings.price,
        isFree: listings.isFree,
        condition: listings.condition,
        status: listings.status,
        deadlineDate: listings.deadlineDate,
        pickupLandmark: listings.pickupLandmark,
        accessNotes: listings.accessNotes,
        sellerName: listings.sellerName,
        sellerWhatsapp: listings.sellerWhatsapp,
        viewCount: listings.viewCount,
        whatsappClicks: listings.whatsappClicks,
        createdAt: listings.createdAt,
        updatedAt: listings.updatedAt,
        provinceName: listings.provinceName,
        regencyName: listings.regencyName,
        districtName: listings.districtName,
        categoryId: listings.categoryId,
        categoryName: categories.name,
      })
      .from(listings)
      .leftJoin(categories, eq(listings.categoryId, categories.id))
      .where(eq(listings.id, id))
      .limit(1);

    if (!row || !tokenCocok(token, row.secretToken)) {
      return gagal("Tautan pengelolaan tidak valid atau sudah kedaluwarsa", 404);
    }

    const foto = await db
      .select({
        image_url: listingImages.imageUrl,
        display_order: listingImages.displayOrder,
      })
      .from(listingImages)
      .where(eq(listingImages.listingId, id))
      .orderBy(asc(listingImages.displayOrder));

    const { secretToken: _t, ...data } = row;
    void _t;

    return ok({
      ...data,
      created_at: data.createdAt.toISOString(),
      updated_at: data.updatedAt.toISOString(),
      deadline_date: String(data.deadlineDate).slice(0, 10),
      images: foto,
      // Statistik KPI yang wajib tampil di dashboard (PRD §3.2 ENHANCED)
      stat: {
        view: data.viewCount,
        wa_click: data.whatsappClicks,
        ctr:
          data.viewCount > 0
            ? Math.round((data.whatsappClicks / data.viewCount) * 100)
            : 0,
      },
    });
  } catch (e) {
    console.error("[manage GET] gagal:", e);
    return gagal("Gagal memuat data pengelolaan.", 500);
  }
}

/**
 * PATCH — ubah isi listing dari dashboard penjual.
 *
 * KENAPA INI ADA:
 * Sebelumnya listing hanya bisa dipasang, ditandai terjual, atau dihapus.
 * Salah ketik harga atau deskripsi berarti listing itu permanen salah, dan
 * satu-satunya jalan keluar adalah menghapus lalu memasang ulang dari nol.
 *
 * Validasi memakai skema YANG SAMA dengan form pasang (lib/validators.ts),
 * jadi aturan "saat dipasang" dan "saat diubah" tidak mungkin menyimpang.
 * Nama wilayah diambil dari direktori server, bukan dari yang dikirim klien.
 *
 * Yang TIDAK bisa diubah lewat sini: `secret_token` (kunci akses), `status`
 * (punya endpoint sendiri), dan foto (butuh multipart, punya endpoint sendiri).
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return gagal("Tautan pengelolaan tidak valid atau sudah kedaluwarsa", 404);
    }

    const body = await bacaJson(req);
    const parsed = editSchema.safeParse(body);

    if (!parsed.success) {
      const detail: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0] ?? "_");
        if (!detail[k]) detail[k] = issue.message;
      }
      const pesanUtama =
        Object.values(detail)[0] ?? "Data belum lengkap atau tidak valid.";
      return gagal(pesanUtama, 400, { detail });
    }

    const d = parsed.data;

    // Otorisasi DULU, baru validasi isi. Tanpa token yang benar, pemanggil
    // tidak boleh tahu apa pun tentang aturan server.
    const [row] = await db
      .select({
        id: listings.id,
        secretToken: listings.secretToken,
        status: listings.status,
      })
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);

    if (!row || !tokenCocok(d.token, row.secretToken)) {
      return gagal("Tautan pengelolaan tidak valid atau sudah kedaluwarsa", 404);
    }

    // Status SEBELUM perubahan — dipakai untuk memutuskan apakah listing yang
    // tadinya kedaluwarsa perlu ditayangkan lagi (lihat catatan di bawah).
    const statusLama = row.status;

    const errTenggat = validasiTenggat(d.deadline_date);
    if (errTenggat) {
      return gagal(errTenggat, 400, { detail: { deadline_date: errTenggat } });
    }

    // Rantai wilayah: provinsi -> kabupaten -> kecamatan.
    const w = validasiWilayah(d.province_code, d.regency_code, d.district_code);
    if (!w.ok) {
      return gagal(w.pesan, 400, { detail: w.detail });
    }

    // Kategori harus benar-benar ada (kecuali kategori semu "gratis").
    const kategoriId = d.category_id === "gratis" ? null : d.category_id;
    if (kategoriId) {
      const [ada] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, kategoriId))
        .limit(1);

      if (!ada) {
        return gagal("Kategori tidak dikenal.", 400, {
          detail: { category_id: "Pilih kategori dari daftar." },
        });
      }
    }

    const [diubah] = await db
      .update(listings)
      .set({
        title: d.title,
        description: d.description,
        categoryId: kategoriId,
        condition: d.condition,
        isFree: d.is_free,
        price: d.is_free ? "0" : String(d.price),
        provinceCode: w.wilayah.provinceCode,
        provinceName: w.wilayah.provinceName,
        regencyCode: w.wilayah.regencyCode,
        regencyName: w.wilayah.regencyName,
        districtCode: w.wilayah.districtCode,
        districtName: w.wilayah.districtName,
        pickupLandmark: d.pickup_landmark,
        deadlineDate: d.deadline_date,
        accessNotes: d.access_notes || null,
        sellerName: d.seller_name,
        sellerWhatsapp: normalizeWhatsApp(d.seller_whatsapp),
        /**
         * Perpanjang tenggat = tayangkan lagi.
         *
         * Status EXPIRED di database adalah status AKHIR: katalog mensyaratkan
         * `status = 'AVAILABLE'`, jadi listing yang sudah ditandai kedaluwarsa
         * oleh cron tidak akan pernah muncul lagi walaupun tenggatnya
         * diperpanjang — penjual mengubah tanggal, menyimpan, dan tetap tidak
         * ada yang berubah. Karena tenggat barunya sudah lolos validasi (tidak
         * boleh di masa lalu), mengembalikan statusnya ke AVAILABLE di sini
         * aman dan memang yang penjual maksud.
         *
         * Hanya berlaku untuk EXPIRED. TAKEN dan DELETED adalah keputusan
         * sadar penjual, jadi tidak boleh dibatalkan diam-diam.
         */
        ...(statusLama === "EXPIRED" ? { status: "AVAILABLE" } : {}),
        updatedAt: new Date(),
      })
      .where(eq(listings.id, id))
      .returning({
        id: listings.id,
        status: listings.status,
        updatedAt: listings.updatedAt,
      });

    return ok({
      id: diubah.id,
      status: diubah.status,
      updated_at: diubah.updatedAt.toISOString(),
    });
  } catch (e) {
    console.error("[manage PATCH] gagal:", e);
    return gagal("Gagal menyimpan perubahan. Coba lagi sebentar.", 500);
  }
}
