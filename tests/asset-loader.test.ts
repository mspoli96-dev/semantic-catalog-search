import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadAsset, loadAsset } from "../src/lib/asset-loader";
import type { VerifiedAsset } from "../src/lib/model-assets";

async function fixture(size = 300_000) {
  const bytes = Uint8Array.from({ length: size }, (_, index) => index % 251);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const asset: VerifiedAsset = { path: "/models/test/weights.onnx", size, sha256: Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("") };
  return { asset, bytes };
}

function serveRanges(bytes: Uint8Array) {
  return vi.fn(async (_url: string, options: RequestInit) => {
    const range = (options.headers as Record<string, string>).Range;
    const [, start, end] = /bytes=(\d+)-(\d+)/.exec(range)!;
    return new Response(bytes.slice(Number(start), Number(end) + 1), { status: 206, headers: { "Content-Range": `bytes ${start}-${end}/${bytes.length}` } });
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("verified browser asset downloads", () => {
  it("assembles bounded byte ranges and verifies the complete pinned hash", async () => {
    const { asset, bytes } = await fixture();
    const fetchMock = serveRanges(bytes);
    vi.stubGlobal("fetch", fetchMock);
    const progress = vi.fn();
    expect(new Uint8Array(await downloadAsset(asset, progress))).toEqual(bytes);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Range: "bytes=0-262143" });
    expect(progress).toHaveBeenLastCalledWith(100);
  });

  it("fails closed on altered model bytes", async () => {
    const { asset, bytes } = await fixture();
    bytes[5] ^= 1;
    vi.stubGlobal("fetch", serveRanges(bytes));
    await expect(downloadAsset(asset)).rejects.toThrow("integrity");
  });

  it("bounds retries when a server ignores range requests for large assets", async () => {
    const { asset, bytes } = await fixture();
    const fetchMock = vi.fn(async () => new Response(bytes));
    vi.stubGlobal("fetch", fetchMock);
    await expect(downloadAsset(asset)).rejects.toThrow("bounded retries");
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(6);
  });

  it("continues with verified bytes if browser storage cannot be opened", async () => {
    const { asset, bytes } = await fixture(32);
    vi.stubGlobal("caches", { open: vi.fn().mockRejectedValue(new Error("Private mode")) });
    vi.stubGlobal("fetch", serveRanges(bytes));
    expect(new Uint8Array(await loadAsset(asset))).toEqual(bytes);
  });

  it("continues after a cache write failure and replaces an invalid cached response", async () => {
    const { asset, bytes } = await fixture(32);
    const put = vi.fn().mockRejectedValue(new Error("Quota"));
    vi.stubGlobal("caches", { open: vi.fn().mockResolvedValue({ match: vi.fn().mockResolvedValue(new Response("invalid")), put }) });
    const fetchMock = serveRanges(bytes);
    vi.stubGlobal("fetch", fetchMock);
    expect(new Uint8Array(await loadAsset(asset))).toEqual(bytes);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(put).toHaveBeenCalledOnce();
  });
});
