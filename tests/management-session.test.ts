import { beforeEach, describe, expect, it, vi } from "vitest";

const { periksaAkses } = vi.hoisted(() => ({ periksaAkses: vi.fn() }));
vi.mock("@/lib/lapak", () => ({ periksaAkses }));

import { POST } from "@/app/api/v1/manage/session/route";
import { tokenSesiKelola } from "@/lib/manage-session";

const ID = "123e4567-e89b-42d3-a456-426614174000";
const TOKEN = "a".repeat(43);

function request(token: string, id = ID, url = "https://angkutin.test/api/v1/manage/session") {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, token }),
  });
}

describe("POST /api/v1/manage/session", () => {
  beforeEach(() => periksaAkses.mockReset());

  it("menerbitkan cookie HttpOnly, Secure, SameSite=Strict per record untuk token valid", async () => {
    periksaAkses.mockResolvedValue({ jenis: "barang" });
    const response = await POST(request(TOKEN));
    const cookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(200);
    expect(cookie).toContain(`angkutin_manage_${ID}=${TOKEN}`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=strict");
    expect(cookie).toContain("Path=/");
  });

  it("menolak token yang tidak lolos otorisasi tanpa menerbitkan cookie", async () => {
    periksaAkses.mockResolvedValue(null);
    const response = await POST(request(TOKEN));
    expect(response.status).toBe(404);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("menolak token terlalu pendek atau id bukan UUID sebelum otorisasi", async () => {
    periksaAkses.mockResolvedValue({ jenis: "barang" });
    expect((await POST(request("short"))).status).toBe(404);
    expect((await POST(request(TOKEN, "bad-id"))).status).toBe(404);
    expect(periksaAkses).not.toHaveBeenCalled();
  });
});

describe("cookie sesi kelola per record", () => {
  it("membaca cookie HttpOnly hanya untuk ID yang cocok", () => {
    const otherId = "123e4567-e89b-42d3-a456-426614174001";
    const req = new Request("https://angkutin.test/manage", {
      headers: { cookie: `angkutin_manage_${ID}=${TOKEN}` },
    });
    expect(tokenSesiKelola(req, ID)).toBe(TOKEN);
    expect(tokenSesiKelola(req, otherId)).toBe("");
  });
});
