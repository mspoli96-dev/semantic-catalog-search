import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { env, pipeline } from "@huggingface/transformers";
import { PRODUCTS } from "../src/data/catalog";
import type { SearchFilters, SearchHit, SearchResult } from "../src/lib/contracts";
import { createSearchEngine, validateEmbedding, validateSearch } from "../src/lib/search";
import { EMBEDDING_DTYPE, EMBEDDING_MODEL, EMBEDDING_POOLING, MAX_MODEL_TOKENS, MODEL_REVISION } from "../src/lib/model-config";

type RelevanceCase = SearchFilters & { id: string; query: string; relevantIds: string[] };
type EvaluationRow = RelevanceCase & {
  keywordFirstRelevantRank: number | null;
  semanticFirstRelevantRank: number | null;
  keyword: { id: string; score: number }[];
  semantic: { id: string; score: number }[];
  timing: SearchResult["meta"];
};

function firstRelevant(hits: SearchHit[], relevantIds: string[]) {
  const position = hits.findIndex((hit) => relevantIds.includes(hit.product.id));
  return position < 0 ? null : position + 1;
}

async function main() {
  const fixtures = JSON.parse(await readFile("fixtures/evaluation-cases.json", "utf8")) as { description: string; cases: RelevanceCase[] };
  const index = JSON.parse(await readFile("public/search-index.json", "utf8"));
  const engine = await createSearchEngine(PRODUCTS, index);
  env.allowLocalModels = false;
  const extractor = await pipeline("feature-extraction", EMBEDDING_MODEL, { revision: MODEL_REVISION, dtype: EMBEDDING_DTYPE, device: "cpu", cache_dir: path.resolve(".cache/models") });
  const results: EvaluationRow[] = [];
  for (const fixture of fixtures.cases) {
    if (fixture.relevantIds.some((id) => !PRODUCTS.some((product) => product.id === id))) throw new Error("An evaluation case references an unknown product.");
    const filters = { category: fixture.category, maxPrice: fixture.maxPrice };
    const query = validateSearch(fixture.query, filters);
    if (extractor.tokenizer(query, { truncation: false, padding: false }).input_ids.size > MAX_MODEL_TOKENS) throw new Error("An evaluation query exceeds the token limit.");
    const start = performance.now();
    const output = await extractor(query, { pooling: EMBEDDING_POOLING, normalize: true });
    const embedding = Array.from(output.data) as number[];
    validateEmbedding(embedding);
    const result = await engine.search(query, embedding, filters, performance.now() - start);
    for (const hit of [...result.keyword, ...result.semantic]) {
      if ((filters.category !== "all" && hit.product.category !== filters.category) || (filters.maxPrice !== null && hit.product.price > filters.maxPrice)) throw new Error("A search result violated its filters.");
    }
    const row = {
      ...fixture,
      keywordFirstRelevantRank: firstRelevant(result.keyword, fixture.relevantIds),
      semanticFirstRelevantRank: firstRelevant(result.semantic, fixture.relevantIds),
      keyword: result.keyword.map((hit) => ({ id: hit.product.id, score: hit.score })),
      semantic: result.semantic.map((hit) => ({ id: hit.product.id, score: hit.score })),
      timing: result.meta,
    };
    results.push(row);
    console.log(`${fixture.id}: keyword rank ${row.keywordFirstRelevantRank ?? "none in top 6"}; semantic rank ${row.semanticFirstRelevantRank ?? "none in top 6"}`);
  }
  const meanReciprocalRank = (field: "keywordFirstRelevantRank" | "semanticFirstRelevantRank") => results.reduce((sum, row) => sum + (row[field] === null ? 0 : 1 / row[field]!), 0) / results.length;
  const report = {
    generatedAt: new Date().toISOString(),
    model: EMBEDDING_MODEL,
    revision: MODEL_REVISION,
    dtype: EMBEDDING_DTYPE,
    catalogueHash: index.catalogueHash,
    method: fixtures.description,
    runtime: "Node.js CPU; query timings exclude model download and do not represent browser latency.",
    queries: results.length,
    keywordTop1: results.filter((row) => row.keywordFirstRelevantRank === 1).length,
    semanticTop1: results.filter((row) => row.semanticFirstRelevantRank === 1).length,
    keywordFoundInTop6: results.filter((row) => row.keywordFirstRelevantRank !== null).length,
    semanticFoundInTop6: results.filter((row) => row.semanticFirstRelevantRank !== null).length,
    keywordMrrAt6: meanReciprocalRank("keywordFirstRelevantRank"),
    semanticMrrAt6: meanReciprocalRank("semanticFirstRelevantRank"),
    results,
  };
  await mkdir("fixtures/evaluations", { recursive: true });
  const destination = `fixtures/evaluations/${report.generatedAt.replaceAll(":", "-")}.json`;
  await writeFile(destination, JSON.stringify(report, null, 2) + "\n");
  console.log(`Saved ${results.length} real local-model comparisons to ${destination}. No paid API was used.`);
}

main().catch(() => {
  console.error("Evaluation failed. Check catalogue/index alignment, fixture identifiers, and the local model runtime.");
  process.exitCode = 1;
});
