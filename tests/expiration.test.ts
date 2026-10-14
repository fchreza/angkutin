import { describe, expect, it } from "vitest";
import { getUrgency, statusEfektif } from "@/lib/urgency";

const SEKARANG = new Date("2026-10-14T05:00:00.000Z"); // 12.00 WIB

describe("listing expiration", () => {
  it("mengubah AVAILABLE menjadi EXPIRED setelah tanggal tenggat WIB lewat", () => {
    expect(statusEfektif("AVAILABLE", "2026-10-13", SEKARANG)).toBe("EXPIRED");
    expect(getUrgency("2026-10-13", SEKARANG)).toBe("expired");
  });

  it("tetap tersedia pada hari tenggat dan pada tenggat mendatang", () => {
    expect(statusEfektif("AVAILABLE", "2026-10-14", SEKARANG)).toBe("AVAILABLE");
    expect(statusEfektif("AVAILABLE", "2026-10-15", SEKARANG)).toBe("AVAILABLE");
  });

  it("tidak menimpa status final TAKEN atau DELETED", () => {
    expect(statusEfektif("TAKEN", "2026-10-01", SEKARANG)).toBe("TAKEN");
    expect(statusEfektif("DELETED", "2026-10-01", SEKARANG)).toBe("DELETED");
  });
});
