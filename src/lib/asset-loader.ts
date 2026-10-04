import type { VerifiedAsset } from "./model-assets";

const CHUNK_BYTES = 262144;
const CACHE_NAME = "semantic-catalog-verified-assets-v1";

export async function verifyAsset(bytes: ArrayBuffer, asset: VerifiedAsset): Promise<boolean> {
  if (bytes.byteLength !== asset.size) return false;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const actual = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return actual === asset.sha256;
}

export async function downloadAsset(asset: VerifiedAsset, progress?: (percent: number) => void): Promise<ArrayBuffer> {
  const output = new Uint8Array(asset.size);
  const count = Math.ceil(asset.size / CHUNK_BYTES);
  const controller = new AbortController();
  const overallTimer = setTimeout(() => controller.abort(), 75_000);
  let next = 0;
  let loaded = 0;
  try {
    await Promise.all(Array.from({ length: Math.min(4, count) }, async () => {
      for (;;) {
        const index = next++;
        if (index >= count) return;
        const start = index * CHUNK_BYTES;
        const end = Math.min(asset.size - 1, start + CHUNK_BYTES - 1);
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await fetch(asset.path, { headers: { Range: `bytes=${start}-${end}` }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]) });
            const bytes = new Uint8Array(await response.arrayBuffer());
            const validRange = response.status === 206 && response.headers.get("content-range") === `bytes ${start}-${end}/${asset.size}` && bytes.byteLength === end - start + 1;
            const validSmallFile = count === 1 && response.status === 200 && bytes.byteLength === asset.size;
            if (!validRange && !validSmallFile) throw new Error("Asset download returned an invalid byte range.");
            output.set(bytes, start);
            loaded += bytes.byteLength;
            progress?.(100 * loaded / asset.size);
            break;
          } catch {
            if (controller.signal.aborted || attempt === 2) throw new Error("Network asset download failed after bounded retries.");
          }
        }
      }
    }));
    if (!await verifyAsset(output.buffer, asset)) throw new Error("Model data integrity check failed.");
    return output.buffer;
  } finally {
    clearTimeout(overallTimer);
    controller.abort();
  }
}

export async function loadAsset(asset: VerifiedAsset, progress?: (percent: number) => void): Promise<ArrayBuffer> {
  let cache: Cache | null = null;
  try {
    if (typeof caches !== "undefined") {
      cache = await caches.open(CACHE_NAME);
      const stored = await cache.match(asset.path);
      if (stored) {
        const bytes = await stored.arrayBuffer();
        if (await verifyAsset(bytes, asset)) {
          progress?.(100);
          return bytes;
        }
      }
    }
  } catch {
    cache = null;
  }
  const bytes = await downloadAsset(asset, progress);
  try {
    await cache?.put(asset.path, new Response(bytes));
  } catch {
    // Inference can continue when private browsing or quota prevents persistent caching.
  }
  return bytes;
}
