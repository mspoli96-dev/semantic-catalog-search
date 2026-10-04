import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { EMBEDDING_MODEL, MODEL_REVISION } from "../src/lib/model-config";
import { WASM_ASSET } from "../src/lib/model-assets";

const files = [
  { name: "config.json", size: 650, sha256: "7135149f7cffa1a573466c6e4d8423ed73b62fd2332c575bf738a0d033f70df7" },
  { name: "tokenizer_config.json", size: 366, sha256: "9261e7d79b44c8195c1cada2b453e55b00aeb81e907a6664974b4d7776172ab3" },
  { name: "tokenizer.json", size: 711661, sha256: "da0e79933b9ed51798a3ae27893d3c5fa4a201126cef75586296df9b4d2c62a0" },
  { name: "onnx/model_quantized.onnx", size: 22972370, sha256: "afdb6f1a0e45b715d0bb9b11772f032c399babd23bfc31fed1c170afc848bdb1" },
];

function matches(bytes: Buffer, expected: typeof files[number]): boolean {
  return bytes.length === expected.size && createHash("sha256").update(bytes).digest("hex") === expected.sha256;
}

async function readVerified(file: string, expected: typeof files[number]): Promise<Buffer | null> {
  try {
    const bytes = await readFile(file);
    return matches(bytes, expected) ? bytes : null;
  } catch {
    return null;
  }
}

async function download(expected: typeof files[number]): Promise<Buffer> {
  const url = `https://huggingface.co/${EMBEDDING_MODEL}/resolve/${MODEL_REVISION}/${expected.name}`;
  const output = Buffer.alloc(expected.size);
  const chunkSize = 262144;
  const count = Math.ceil(expected.size / chunkSize);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, count) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= count) return;
      const start = index * chunkSize;
      const end = Math.min(expected.size - 1, start + chunkSize - 1);
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch(url, { headers: { Range: `bytes=${start}-${end}` }, signal: AbortSignal.timeout(20_000) });
          const bytes = Buffer.from(await response.arrayBuffer());
          const validRange = response.status === 206 && response.headers.get("content-range") === `bytes ${start}-${end}/${expected.size}` && bytes.length === end - start + 1;
          const validSmallFile = count === 1 && response.status === 200 && bytes.length === expected.size;
          if (!validRange && !validSmallFile) throw new Error("The public model server returned an invalid byte range.");
          bytes.copy(output, start);
          break;
        } catch {
          if (attempt === 2) throw new Error(`Could not download ${expected.name} after bounded GET retries.`);
        }
      }
    }
  }));
  if (!matches(output, expected)) throw new Error(`The pinned integrity check failed for ${expected.name}.`);
  return output;
}

async function main() {
  const destination = path.resolve("public/models", MODEL_REVISION, EMBEDDING_MODEL);
  for (const file of files) {
    const target = path.join(destination, file.name);
    if (await readVerified(target, file)) continue;
    const cached = await readVerified(path.resolve(".cache/models", EMBEDDING_MODEL, MODEL_REVISION, file.name), file);
    const bytes = cached ?? await download(file);
    await mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.partial`;
    await writeFile(temporary, bytes);
    await rename(temporary, target);
    console.log(`Prepared ${file.name}; SHA-256 verified.`);
  }
  await copyFile("THIRD-PARTY-NOTICES.md", path.join(destination, "LICENSE-NOTICES.txt"));
  await writeFile(path.join(destination, "manifest.json"), JSON.stringify({ model: EMBEDDING_MODEL, revision: MODEL_REVISION, license: "Apache-2.0", source: `https://huggingface.co/${EMBEDDING_MODEL}/tree/${MODEL_REVISION}`, files }, null, 2) + "\n");
  const runtimeDestination = path.resolve("public", WASM_ASSET.path.slice(1));
  const wasm = await readFile("node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.wasm");
  if (!matches(wasm, { name: "ONNX runtime", size: WASM_ASSET.size, sha256: WASM_ASSET.sha256 })) throw new Error("The pinned integrity check failed for the ONNX runtime.");
  await mkdir(path.dirname(runtimeDestination), { recursive: true });
  await writeFile(`${runtimeDestination}.partial`, wasm);
  await rename(`${runtimeDestination}.partial`, runtimeDestination);
  await copyFile("scripts/onnxruntime-LICENSE.txt", path.join(path.dirname(runtimeDestination), "LICENSE.txt"));
  console.log("Pinned model files are ready for same-origin browser downloads. No model API was called.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error && /^(Could not download|The pinned integrity)/.test(error.message) ? error.message : "Model asset preparation failed. Check disk access and the public model download.");
  process.exitCode = 1;
});
