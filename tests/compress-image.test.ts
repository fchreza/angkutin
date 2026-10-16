import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { kompresDiServer } from "@/lib/compress-image";

describe("kompresDiServer", () => {
  it("mendekode dan menormalisasi gambar kecil menjadi WebP berukuran terbatas", async () => {
    const asli = await sharp({
      create: {
        width: 1600,
        height: 1200,
        channels: 3,
        background: { r: 20, g: 120, b: 220 },
      },
    })
      .png()
      .toBuffer();

    const hasil = await kompresDiServer(asli, "image/png");
    const meta = await sharp(hasil.buf).metadata();

    expect(hasil.tipe).toBe("image/webp");
    expect(meta.format).toBe("webp");
    expect(hasil.buf.length).toBeLessThanOrEqual(1024 * 1024);
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(1080);
  });

  it("menolak MIME deklarasi yang tidak cocok dengan bytes gambar", async () => {
    const png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();

    await expect(kompresDiServer(png, "image/jpeg")).rejects.toThrow(/MIME/);
  });

  it("menolak bytes rusak alih-alih meneruskannya ke object storage", async () => {
    await expect(
      kompresDiServer(Buffer.from("bukan gambar"), "image/webp"),
    ).rejects.toThrow();
  });

  it("menolak header gambar yang mengklaim jumlah piksel berlebihan", async () => {
    const png = Buffer.from(
      await sharp({
        create: { width: 1, height: 1, channels: 3, background: "red" },
      })
        .png()
        .toBuffer(),
    );
    // Pertahankan payload kecil tetapi ubah dimensi IHDR menjadi 49 MP.
    png.writeUInt32BE(7000, 16);
    png.writeUInt32BE(7000, 20);

    await expect(kompresDiServer(png, "image/png")).rejects.toThrow(/pixel limit/i);
  });
});
