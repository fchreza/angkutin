import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  select,
  update,
  cekRateLimit,
  catatRateLimit,
  buildWhatsAppLink,
} = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  cekRateLimit: vi.fn(),
  catatRateLimit: vi.fn(),
  buildWhatsAppLink: vi.fn(),
}));

vi.mock("@/db", () => ({ db: { select, update } }));
vi.mock("@/lib/rate-limit", () => ({ cekRateLimit, catatRateLimit }));
vi.mock("@/lib/whatsapp", () => ({ buildWhatsAppLink }));
vi.mock("@/lib/format", () => ({ tanggalHariIniID: () => "2026-10-14" }));

import { POST } from "@/app/api/v1/listings/[id]/wa-click/route";

const ID = "123e4567-e89b-42d3-a456-426614174000";

function queryDenganHasil(hasil: unknown[]) {
  const query = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue(hasil),
  };
  query.from.mockReturnValue(query);
  query.where.mockReturnValue(query);
  return query;
}

function updateDenganHasil(hasil: unknown[]) {
  const query = {
    set: vi.fn(),
    where: vi.fn(),
    returning: vi.fn().mockResolvedValue(hasil),
  };
  query.set.mockReturnValue(query);
  query.where.mockReturnValue(query);
  return query;
}

async function post() {
  return POST(new Request(`https://angkutin.test/api/v1/listings/${ID}/wa-click`, { method: "POST" }), {
    params: Promise.resolve({ id: ID }),
  });
}

const BARANG = {
  id: ID,
  title: "Meja belajar",
  sellerName: "Rina",
  sellerWhatsapp: "628123456789",
  status: "AVAILABLE",
  deadlineDate: "2026-10-14",
  regencyName: "Sleman",
  districtName: "Depok",
  accessNotes: null,
};

describe("POST /api/v1/listings/[id]/wa-click", () => {
  beforeEach(() => {
    select.mockReset();
    update.mockReset();
    cekRateLimit.mockReset().mockResolvedValue({ boleh: true });
    catatRateLimit.mockReset().mockResolvedValue(undefined);
    buildWhatsAppLink.mockReset().mockReturnValue("https://wa.me/628123456789");
  });

  it("membuka kontak dan mencatat klik hanya untuk listing AVAILABLE yang belum lewat tenggat", async () => {
    select.mockReturnValue(queryDenganHasil([BARANG]));
    update.mockReturnValue(updateDenganHasil([{ id: ID }]));

    const response = await post();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "https://wa.me/628123456789" });
    expect(update).toHaveBeenCalledOnce();
    expect(catatRateLimit).toHaveBeenCalledOnce();
  });

  it("menolak status TAKEN tanpa membangun tautan atau mencatat klik", async () => {
    select.mockReturnValue(queryDenganHasil([{ ...BARANG, status: "TAKEN" }]));
    const response = await post();
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("sudah diambil");
    expect(update).not.toHaveBeenCalled();
    expect(buildWhatsAppLink).not.toHaveBeenCalled();
  });

  it("menolak status DELETED tanpa menyingkap kontak", async () => {
    select.mockReturnValue(queryDenganHasil([{ ...BARANG, status: "DELETED" }]));
    const response = await post();
    expect(response.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
    expect(buildWhatsAppLink).not.toHaveBeenCalled();
  });

  it("menolak listing yang tenggatnya lewat walau status DB belum diperbarui cron", async () => {
    select.mockReturnValue(queryDenganHasil([{ ...BARANG, deadlineDate: "2026-10-13" }]));
    const response = await post();
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("lewat");
    expect(update).not.toHaveBeenCalled();
    expect(buildWhatsAppLink).not.toHaveBeenCalled();
  });

  it("menolak race saat status berubah sebelum update atomik", async () => {
    select.mockReturnValue(queryDenganHasil([BARANG]));
    update.mockReturnValue(updateDenganHasil([]));
    const response = await post();
    expect(response.status).toBe(409);
    expect(buildWhatsAppLink).not.toHaveBeenCalled();
    expect(catatRateLimit).not.toHaveBeenCalled();
  });
});
