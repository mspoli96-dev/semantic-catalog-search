import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import { PRODUCTS } from "../data/catalog";
import type { WorkerRequest, WorkerResponse } from "../lib/contracts";
import { createSearchEngine, validateEmbedding, validateSearch } from "../lib/search";
import { EMBEDDING_DTYPE, EMBEDDING_MODEL, EMBEDDING_POOLING, MAX_MODEL_TOKENS, MODEL_REVISION } from "../lib/model-config";
import { searchFailureMessage, type SearchStage } from "../lib/worker-errors";

env.allowLocalModels = false;
env.useBrowserCache = true;
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;

function send(message: WorkerResponse) {
  self.postMessage(message);
}

let initialization: Promise<{ extractor: FeatureExtractionPipeline; engine: Awaited<ReturnType<typeof createSearchEngine>> }> | null = null;
let announcedReady = false;
let stage: SearchStage = "catalogue";

function initialize() {
  if (!initialization) {
    initialization = (async () => {
      stage = "catalogue";
      send({ type: "loading", message: "Loading the catalogue index…", progress: null });
      const response = await fetch("/search-index.json");
      if (!response.ok) throw new Error("The catalogue index is unavailable. Refresh the page and try again.");
      const engine = await createSearchEngine(PRODUCTS, await response.json());
      stage = "model-download";
      send({ type: "loading", message: "Downloading the on-device search model…", progress: null });
      const extractor = await pipeline("feature-extraction", EMBEDDING_MODEL, {
        revision: MODEL_REVISION,
        dtype: EMBEDDING_DTYPE,
        device: "wasm",
        progress_callback: (progress) => {
          if (progress.status === "done" && progress.file?.endsWith(".onnx")) stage = "runtime-initialization";
          if (progress.status === "progress" && progress.file?.endsWith(".onnx")) {
            send({ type: "loading", message: "Downloading the on-device search model…", progress: Math.min(100, Math.max(0, progress.progress)) });
          }
        },
      });
      if (!announcedReady) {
        announcedReady = true;
        send({ type: "ready" });
      }
      return { extractor, engine };
    })().catch((error: unknown) => {
      initialization = null;
      throw error;
    });
  }
  return initialization;
}

let queue = Promise.resolve();
self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  queue = queue.then(async () => {
    if (message?.type !== "initialize" && message?.type !== "search") return;
    try {
      if (message.type === "initialize") {
        await initialize();
        return;
      }
      const query = validateSearch(message.query, message.filters);
      const { extractor, engine } = await initialize();
      stage = "query-embedding";
      const encoded = extractor.tokenizer(query, { truncation: false, padding: false });
      if (encoded.input_ids.size > MAX_MODEL_TOKENS) throw new Error("This search has too many tokens. Use a shorter description.");
      const started = performance.now();
      const output = await extractor(query, { pooling: EMBEDDING_POOLING, normalize: true });
      const vector = Array.from(output.data) as number[];
      validateEmbedding(vector);
      stage = "ranking";
      const result = await engine.search(query, vector, message.filters, performance.now() - started);
      send({ type: "result", requestId: message.requestId, result });
    } catch (error) {
      const knownValidation = error instanceof Error && /^(Enter a description|Keep your search|Choose a valid|This search has too many|The catalogue|The search vector)/.test(error.message);
      send({ type: "error", ...(message.type === "search" ? { requestId: message.requestId } : {}), message: knownValidation ? (error as Error).message : searchFailureMessage(error, stage) });
    }
  });
});
