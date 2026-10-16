import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  insert,
  cekRateLimit,
  reservasiRateLimit,
  lepaskanRateLimit,
  listingSchema,
  validasiWilayah,
  buatLapak,
  generateSecretToken,
} = vi.hoisted(() => ({
  insert: vi.fn(),
  cekRateLimit: vi.fn(),
  reservasiRateLimit: vi.fn(),
  lepaskanRateLimit: vi.fn(),
  listingSchema: { safeParse: vi.fn() },
  validasiWilayah: vi.fn(),
  buatLapak: vi.fn(),
  generateSecretToken: vi.fn(),
}));

vi.mock("@/db", () => ({ db: { insert } }));
vi.mock("@/lib/listing-query", () => ({ ambilFeed: vi.fn() }));
vi.mock("@/lib/api", () => ({
  ok: (data: unknown, status = 200) => Response.json(data, { status }),
  gagal: (error: string, status = 400, extra?: object) =>
    Response.json({ error, ...(extra ?? {}) }, { status }),
  ipKlien: () => "203.0.113.40",
}));
vi.mock("@/lib/validators", () => ({
  listingSchema,
  validasiTenggat: vi.fn(() => null),
}));
vi.mock("@/lib/wilayah-server", () => ({ validasiWilayah }));
vi.mock("@/lib/token", () => ({
  generateSecretToken,
  tokenCocok: vi.fn(() => false),
}));
vi.mock("@/lib/rate-limit", () => ({
  cekRateLimit,
  reservasiRateLimit,
  lepaskanRateLimit,
}));
vi.mock("@/lib/whatsapp", () => ({ normalizeWhatsApp: vi.fn((value: string) => value) }));
vi.mock("@/lib/lapak", () => ({
  buatLapak,
  urlLapak: vi.fn(() => "https://angkutin.test/manage/stall?token=stall-secret"),
}));
vi.mock("@/lib/blokir", () => ({
  nomorDiblokir: vi.fn(async () => false),
}));

import { POST } from "@/app/api/v1/listings/route";

const ID = "123e4567-e89b-42d3-a456-426614174000";
const DATA = {
  title: "Meja belajar",
  description: "Meja kayu, kondisi baik.",
  category_id: "gratis",
  condition: "SEPERTI_BARU",
  is_free: true,
  price: 0,
  province_code: "11",
  regency_code: "1101",
  district_code: "110101",
  pickup_landmark: "Dekat kampus",
  deadline_date: "2026-10-20",
  access_notes: "",
  seller_name: "Rina",
  seller_whatsapp: "081234567890",
};

function insertQuery(returning: Promise<unknown[]>) {
  const query = {
    values: vi.fn(),
    returning: vi.fn(() => returning),
  };
  query.values.mockReturnValue(query);
  return query;
}

async function post() {
  return POST(
    new Request("https://angkutin.test/api/v1/listings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(DATA),
    }),
  );
}

describe("POST /api/v1/listings rate limit", () => {
  beforeEach(() => {
    insert.mockReset();
    cekRateLimit.mockReset().mockResolvedValue({ boleh: true, sisa: 5 });
    reservasiRateLimit.mockReset().mockResolvedValue({
      boleh: true,
      sisa: 4,
      idReservasi: "listing-reservation-1",
    });
    lepaskanRateLimit.mockReset().mockResolvedValue(undefined);
    listingSchema.safeParse.mockReset().mockReturnValue({ success: true, data: DATA });
    validasiWilayah.mockReset().mockReturnValue({
      ok: true,
      wilayah: {
        provinceCode: "11",
        provinceName: "DI Yogyakarta",
        regencyCode: "1101",
        regencyName: "Sleman",
        districtCode: "110101",
        districtName: "Depok",
      },
    });
    buatLapak.mockReset().mockResolvedValue({ id: "stall-id", secretToken: "stall-secret" });
    generateSecretToken.mockReset().mockReturnValue("listing-secret");
  });

  it("menggunakan reservasi atomik dan mempertahankan kuota setelah listing tersimpan", async () => {
    insert.mockReturnValue(insertQuery(Promise.resolve([{ id: ID, secretToken: "listing-secret" }])));

    const response = await post();
    expect(response.status).toBe(201);
    expect(reservasiRateLimit).toHaveBeenCalledWith("203.0.113.40");
    expect(lepaskanRateLimit).not.toHaveBeenCalled();
  });

  it("melepas reservasi jika penyimpanan listing gagal", async () => {
    insert.mockReturnValue(insertQuery(Promise.reject(new Error("database unavailable"))));

    const response = await post();
    expect(response.status).toBe(500);
    expect(lepaskanRateLimit).toHaveBeenCalledWith("listing-reservation-1");
  });

  it("tetap menolak di pemeriksaan awal saat kuota memang sudah habis", async () => {
    cekRateLimit.mockResolvedValue({ boleh: false, sisa: 0 });
    const response = await post();
    expect(response.status).toBe(429);
    expect(reservasiRateLimit).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});
