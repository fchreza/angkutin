import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteObjectsCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const {
  select,
  transaction,
  s3Send,
  periksaAkses,
  bolehKelolaBarang,
  kompresDiServer,
  reservasiRateLimit,
  lepaskanRateLimit,
} = vi.hoisted(() => ({
  select: vi.fn(),
  transaction: vi.fn(),
  s3Send: vi.fn(),
  periksaAkses: vi.fn(),
  bolehKelolaBarang: vi.fn(),
  kompresDiServer: vi.fn(),
  reservasiRateLimit: vi.fn(),
  lepaskanRateLimit: vi.fn(),
}));

vi.mock("@/db", () => ({ db: { select, transaction } }));
vi.mock("@/lib/lapak", () => ({ periksaAkses, bolehKelolaBarang }));
vi.mock("@/lib/compress-image", () => ({ kompresDiServer }));
vi.mock("@/lib/manage-session", () => ({ tokenSesiKelola: () => "" }));
vi.mock("@/lib/rate-limit", () => ({ reservasiRateLimit, lepaskanRateLimit }));
vi.mock("@/lib/api", () => ({
  ok: (data: unknown, status = 200) => Response.json(data, { status }),
  gagal: (error: string, status = 400) => Response.json({ error }, { status }),
  ipKlien: () => "203.0.113.25",
}));
vi.mock("@/lib/s3", () => ({
  BUCKET: "angkutin",
  s3: { send: s3Send },
  s3Siap: true,
  keyFoto: (id: string, index: number, version: string) => `listings/${id}/${index}-${version}.webp`,
  urlPublik: (key: string) => `https://objects.test/angkutin/${key}`,
}));

import { POST } from "@/app/api/v1/listings/[id]/images/route";

const ID = "123e4567-e89b-42d3-a456-426614174000";
const INPUT = Buffer.from("client bytes");
const NORMALIZED = Buffer.from("normalized webp bytes");

function buatFile(type = "image/webp", bytes = INPUT) {
  return new File([bytes], "foto.webp", { type });
}

function buatRequest(file: File) {
  const form = new FormData();
  form.append("token", "secret-token");
  form.append("images", file);
  return new Request(`https://angkutin.test/api/v1/listings/${ID}/images`, {
    method: "POST",
    body: form,
  });
}

async function post(file = buatFile()) {
  return POST(buatRequest(file), { params: Promise.resolve({ id: ID }) });
}

function buatTx() {
  const hapus = { where: vi.fn().mockResolvedValue(undefined) };
  const tambah = { values: vi.fn().mockResolvedValue(undefined) };
  return {
    tx: {
      delete: vi.fn().mockReturnValue(hapus),
      insert: vi.fn().mockReturnValue(tambah),
    },
    hapus,
    tambah,
  };
}

describe("POST /api/v1/listings/[id]/images", () => {
  beforeEach(() => {
    const query = { from: vi.fn(), where: vi.fn().mockResolvedValue([]) };
    query.from.mockReturnValue(query);
    select.mockReset().mockReturnValue(query);
    const { tx } = buatTx();
    transaction.mockReset().mockImplementation(async (callback) => callback(tx));
    s3Send.mockReset().mockResolvedValue({});
    periksaAkses.mockReset().mockResolvedValue({ id: ID });
    bolehKelolaBarang.mockReset().mockResolvedValue(true);
    kompresDiServer.mockReset().mockResolvedValue({
      buf: NORMALIZED,
      tipe: "image/webp",
      lebar: 640,
      tinggi: 480,
      byteAsli: INPUT.length,
    });
    reservasiRateLimit.mockReset().mockResolvedValue({
      boleh: true,
      sisa: 29,
      idReservasi: "upload-reservation-1",
    });
    lepaskanRateLimit.mockReset().mockResolvedValue(undefined);
  });

  it("menormalisasi bahkan WebP kecil sebelum menyimpannya sebagai WebP", async () => {
    const response = await post();
    expect(response.status).toBe(201);
    expect(kompresDiServer).toHaveBeenCalledWith(INPUT, "image/webp");
    expect(reservasiRateLimit).toHaveBeenCalledWith("203.0.113.25", "image_upload");

    const put = s3Send.mock.calls
      .map(([command]) => command)
      .find((command) => command instanceof PutObjectCommand) as PutObjectCommand;
    expect(put).toBeDefined();
    expect(put.input.ContentType).toBe("image/webp");
    expect(put.input.Body).toEqual(NORMALIZED);
    expect(put.input.Key).toMatch(/\.webp$/);
    expect(transaction).toHaveBeenCalledOnce();
    expect(lepaskanRateLimit).not.toHaveBeenCalled();
  });

  it("menolak file yang hanya mengaku sebagai gambar sebelum reservasi atau storage", async () => {
    const response = await post(buatFile("text/plain"));
    expect(response.status).toBe(400);
    expect(reservasiRateLimit).not.toHaveBeenCalled();
    expect(kompresDiServer).not.toHaveBeenCalled();
    expect(s3Send).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("menolak bytes rusak dan melepas slot rate limit", async () => {
    kompresDiServer.mockRejectedValue(new Error("invalid image"));
    const response = await post();
    expect(response.status).toBe(400);
    expect(lepaskanRateLimit).toHaveBeenCalledWith("upload-reservation-1");
    expect(s3Send).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("berhenti sebelum kompresi/storage saat permintaan mencapai rate limit", async () => {
    reservasiRateLimit.mockResolvedValue({ boleh: false, sisa: 0 });
    const response = await post();
    expect(response.status).toBe(429);
    expect(kompresDiServer).not.toHaveBeenCalled();
    expect(s3Send).not.toHaveBeenCalled();
  });

  it("menghapus objek yang sudah terunggah dan melepas slot saat transaksi DB gagal", async () => {
    transaction.mockRejectedValue(new Error("db unavailable"));
    const response = await post();
    expect(response.status).toBe(500);
    expect(s3Send).toHaveBeenCalledTimes(2);
    expect(s3Send.mock.calls[0][0]).toBeInstanceOf(PutObjectCommand);
    expect(s3Send.mock.calls[1][0]).toBeInstanceOf(DeleteObjectsCommand);
    expect(lepaskanRateLimit).toHaveBeenCalledWith("upload-reservation-1");
  });

  it("menolak token kelola yang tidak valid tanpa melakukan unggahan", async () => {
    periksaAkses.mockResolvedValue(null);
    const response = await post();
    expect(response.status).toBe(404);
    expect(reservasiRateLimit).not.toHaveBeenCalled();
    expect(kompresDiServer).not.toHaveBeenCalled();
    expect(s3Send).not.toHaveBeenCalled();
  });
});
