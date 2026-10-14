import { beforeEach, describe, expect, it, vi } from "vitest";

const { transaction, deleteRows } = vi.hoisted(() => ({
  transaction: vi.fn(),
  deleteRows: vi.fn(),
}));

vi.mock("@/db", () => ({ db: { transaction, delete: deleteRows } }));
vi.mock("@/lib/token", () => ({ hashIp: vi.fn(async (ip: string) => `hash:${ip}`) }));

import { lepaskanRateLimit, reservasiRateLimit } from "@/lib/rate-limit";

type Row = { id: string; ipHash: string; action: string };
let rows: Row[] = [];
let lockTail: Promise<void> = Promise.resolve();
let nextId = 0;

function buatTx() {
  let releaseLock: () => void = () => {};
  let pending: { ipHash: string; action: string } | undefined;

  const tx = {
    execute: vi.fn(async () => {
      const sebelumnya = lockTail;
      let buka!: () => void;
      lockTail = new Promise<void>((resolve) => {
        buka = resolve;
      });
      await sebelumnya;
      releaseLock = buka;
    }),
    select: vi.fn(() => {
      const query = {
        from: vi.fn(),
        where: vi.fn(async () => {
          // Snapshot sebelum jeda supaya tes gagal jika caller tidak mengambil
          // advisory lock sebelum count: seluruh burst akan membaca 0.
          const jumlah = rows.length;
          await new Promise<void>((resolve) => setImmediate(resolve));
          return [{ jumlah }];
        }),
      };
      query.from.mockReturnValue(query);
      return query;
    }),
    insert: vi.fn(() => {
      const query = {
        values: vi.fn((value: { ipHash: string; action: string }) => {
          pending = value;
          return query;
        }),
        returning: vi.fn(async () => {
          const row = { id: `reservation-${++nextId}`, ...pending! };
          rows.push(row);
          return [{ id: row.id }];
        }),
      };
      return query;
    }),
  };
  return { tx, release: () => releaseLock() };
}

describe("reservasiRateLimit", () => {
  beforeEach(() => {
    rows = [];
    lockTail = Promise.resolve();
    nextId = 0;
    transaction.mockReset().mockImplementation(async (callback) => {
      const { tx, release } = buatTx();
      try {
        return await callback(tx);
      } finally {
        release();
      }
    });
    deleteRows.mockReset().mockImplementation(() => ({
      where: vi.fn(async () => {
        rows = rows.filter((row) => row.id !== "reservation-1");
      }),
    }));
  });

  it("mengizinkan paling banyak lima pembuatan listing dalam burst serentak", async () => {
    const hasil = await Promise.all(
      Array.from({ length: 12 }, () => reservasiRateLimit("203.0.113.10", "create_listing")),
    );

    expect(hasil.filter((r) => r.boleh)).toHaveLength(5);
    expect(hasil.filter((r) => !r.boleh)).toHaveLength(7);
    expect(rows).toHaveLength(5);
    expect(new Set(hasil.filter((r) => r.boleh).map((r) => r.idReservasi)).size).toBe(5);
  });

  it("melepas reservasi operasi gagal agar slot dapat dipakai ulang", async () => {
    const awal = await Promise.all(
      Array.from({ length: 5 }, () => reservasiRateLimit("203.0.113.11", "create_listing")),
    );
    expect(rows).toHaveLength(5);

    const idGagal = awal[0];
    if (!idGagal.boleh) throw new Error("Reservasi awal seharusnya diizinkan");
    await lepaskanRateLimit(idGagal.idReservasi);

    const sesudah = await reservasiRateLimit("203.0.113.11", "create_listing");
    expect(sesudah.boleh).toBe(true);
    expect(rows).toHaveLength(5);
  });
});
