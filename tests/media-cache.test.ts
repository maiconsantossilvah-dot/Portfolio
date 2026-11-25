import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getMedia: vi.fn(), signedMedia: vi.fn() }));
vi.mock("../src/repositories/content", () => mocks);
import { clearMediaCache, resolveMedia } from "../src/components/MediaImage";
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-25T00:00:00Z"));
  clearMediaCache();
  vi.clearAllMocks();
  mocks.getMedia.mockResolvedValue([
    {
      id: "image",
      storage_path: "images/id/original.webp",
      thumbnail_path: "images/id/thumb.webp",
      width: 1600,
      height: 1200,
    },
  ]);
  mocks.signedMedia.mockResolvedValue("https://signed.example/image");
});
afterEach(() => {
  vi.useRealTimers();
});
describe("Cache de mídia assinada", () => {
  it("reaproveita chamadas próximas e renova com margem antes do TTL de 120s", async () => {
    await resolveMedia("image");
    await vi.advanceTimersByTimeAsync(10_000);
    await resolveMedia("image");
    expect(mocks.signedMedia).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(21_000);
    await resolveMedia("image");
    expect(mocks.signedMedia).toHaveBeenCalledTimes(2);
  });
  it("seleciona miniatura e limpa referências quando a sessão muda", async () => {
    await resolveMedia("image", true);
    expect(mocks.signedMedia).toHaveBeenCalledWith("images/id/thumb.webp");
    clearMediaCache();
    await resolveMedia("image");
    expect(mocks.getMedia).toHaveBeenCalledTimes(2);
    expect(mocks.signedMedia).toHaveBeenLastCalledWith(
      "images/id/original.webp",
    );
  });
  it("não tenta assinar um arquivo cuja metadata está protegida por RLS", async () => {
    mocks.getMedia.mockResolvedValue([]);
    await expect(resolveMedia("private")).rejects.toThrow("Mídia indisponível");
    expect(mocks.signedMedia).not.toHaveBeenCalled();
  });
});
