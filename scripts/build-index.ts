import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env, pipeline } from "@huggingface/transformers";
import { PRODUCTS } from "../src/data/catalog";
import { catalogueHash, productSearchText, validateEmbedding, type SearchIndex } from "../src/lib/search";
import { EMBEDDING_DIMENSION, EMBEDDING_DTYPE, EMBEDDING_MODEL, EMBEDDING_POOLING, INDEX_VERSION, MAX_MODEL_TOKENS, MODEL_REVISION } from "../src/lib/model-config";

async function main() {
  env.allowLocalModels = false;
  console.log("Loading the pinned local embedding model. The first run downloads public model files.");
  const extractor = await pipeline("feature-extraction", EMBEDDING_MODEL, { revision: MODEL_REVISION, dtype: EMBEDDING_DTYPE, device: "cpu", cache_dir: path.resolve(".cache/models") });
  const documents: SearchIndex["documents"] = [];
  for (const product of PRODUCTS) {
    const text = productSearchText(product);
    const tokens = extractor.tokenizer(text, { truncation: false, padding: false });
    if (tokens.input_ids.size > MAX_MODEL_TOKENS) throw new Error(`Product ${product.id} exceeds the model input length.`);
    const output = await extractor(text, { pooling: EMBEDDING_POOLING, normalize: true });
    const vector = Array.from(output.data, (value) => Number(Number(value).toFixed(8)));
    validateEmbedding(vector);
    documents.push({ id: product.id, vector });
    if (documents.length % 12 === 0) console.log(`Embedded ${documents.length}/${PRODUCTS.length} products.`);
  }
  const index: SearchIndex = { version: INDEX_VERSION, model: EMBEDDING_MODEL, revision: MODEL_REVISION, dtype: EMBEDDING_DTYPE, pooling: EMBEDDING_POOLING, normalized: true, dimension: EMBEDDING_DIMENSION, catalogueHash: await catalogueHash(PRODUCTS), generatedAt: new Date().toISOString(), documents };
  await mkdir("public", { recursive: true });
  await writeFile("public/search-index.json", JSON.stringify(index) + "\n");
  console.log(`Indexed ${documents.length} synthetic products with ${EMBEDDING_DIMENSION}-dimensional local embeddings. No paid API was used.`);
}

main().catch(() => {
  console.error("Index generation failed. Check the catalogue, model download, and local runtime. No index should be published until validation passes.");
  process.exitCode = 1;
});
