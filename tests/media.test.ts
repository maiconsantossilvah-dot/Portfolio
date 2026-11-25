// @vitest-environment node
import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, validateImage } from "../src/services/media";
describe("Biblioteca de mídia — validação antes do upload", () => {
  it("rejeita HTML renomeado e MIME incompatível", async () => {
    await expect(
      validateImage(
        new File(["<html><script>evil()</script></html>"], "image.png", {
          type: "image/png",
        }),
      ),
    ).rejects.toThrow("Envie JPEG");
    await expect(
      validateImage(
        new File([new Uint8Array([255, 216, 255, 0])], "image.png", {
          type: "image/png",
        }),
      ),
    ).rejects.toThrow("Envie JPEG");
  });
  it("reconhece assinatura JPEG e limita tamanho", async () => {
    await expect(
      validateImage(
        new File([new Uint8Array([255, 216, 255, 0])], "image.jpg", {
          type: "image/jpeg",
        }),
      ),
    ).resolves.toBe("image/jpeg");
    await expect(
      validateImage(
        new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "big.png", {
          type: "image/png",
        }),
      ),
    ).rejects.toThrow("25 MB");
  });
});
