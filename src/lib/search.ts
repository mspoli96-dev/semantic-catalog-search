import { create, insertMultiple, search } from "@orama/orama";
import type { Product, SearchFilters, SearchHit, SearchResult } from "./contracts";
import { EMBEDDING_DIMENSION, EMBEDDING_DTYPE, EMBEDDING_MODEL, EMBEDDING_POOLING, INDEX_VERSION, MAX_QUERY_CHARS, MODEL_REVISION, SEARCH_LIMIT } from "./model-config";

export type SearchIndex = {
  version: number;
  model: string;
  revision: string;
  dtype: string;
  pooling: string;
  normalized: boolean;
  dimension: number;
  catalogueHash: string;
  generatedAt: string;
  documents: { id: string; vector: number[] }[];
};

const CATEGORIES = new Set(["Desk", "Travel", "Outdoors", "Everyday"]);

export function productSearchText(product: Product): string {
  return `${product.name}. ${product.description} Category: ${product.category}. Tags: ${product.tags.join(", ")}.`;
}

export async function catalogueHash(products: readonly Product[]): Promise<string> {
  const canonical = products.map(({ id, name, description, category, price, image, tags }) => ({ id, name, description, category, price, image, tags }));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(canonical)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function validateEmbedding(vector: unknown): asserts vector is number[] {
  if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIMENSION || !vector.every((value) => typeof value === "number" && Number.isFinite(value))) {
    throw new Error("The search vector is invalid. Reload the page and try again.");
  }
  const normSquared = vector.reduce((sum, value) => sum + value * value, 0);
  if (Math.abs(normSquared - 1) > 0.002) throw new Error("The search vector is not normalized. Rebuild the catalogue index.");
}

export function validateSearch(query: string, filters: SearchFilters): string {
  if (typeof query !== "string" || query.trim().length === 0) throw new Error("Enter a description of what you need.");
  if (query.length > MAX_QUERY_CHARS) throw new Error(`Keep your search to ${MAX_QUERY_CHARS} characters or fewer.`);
  if (!filters || (filters.category !== "all" && !CATEGORIES.has(filters.category))) throw new Error("Choose a valid category.");
  if (filters.maxPrice !== null && (typeof filters.maxPrice !== "number" || !Number.isFinite(filters.maxPrice) || filters.maxPrice < 0)) {
    throw new Error("Choose a valid maximum price.");
  }
  return query.trim().replace(/\s+/g, " ");
}

export async function validateIndex(products: readonly Product[], candidate: unknown): Promise<SearchIndex> {
  if (!candidate || typeof candidate !== "object") throw new Error("The catalogue index could not be read.");
  const index = candidate as Partial<SearchIndex>;
  if (index.version !== INDEX_VERSION || index.model !== EMBEDDING_MODEL || index.revision !== MODEL_REVISION || index.dtype !== EMBEDDING_DTYPE || index.pooling !== EMBEDDING_POOLING || index.normalized !== true || index.dimension !== EMBEDDING_DIMENSION) {
    throw new Error("The catalogue index uses a different embedding model. Rebuild it before searching.");
  }
  if (!Array.isArray(index.documents) || index.documents.length !== products.length || products.length === 0 || new Set(products.map((product) => product.id)).size !== products.length) {
    throw new Error("The catalogue and its search index do not match.");
  }
  const productIds = new Set(products.map((product) => product.id));
  const indexedIds = new Set<string>();
  for (const document of index.documents) {
    if (!document || typeof document.id !== "string" || !productIds.has(document.id) || indexedIds.has(document.id)) throw new Error("The catalogue and its search index do not match.");
    validateEmbedding(document.vector);
    indexedIds.add(document.id);
  }
  if (index.catalogueHash !== await catalogueHash(products)) throw new Error("The catalogue changed after indexing. Rebuild its search index.");
  return index as SearchIndex;
}

export async function createSearchEngine(products: readonly Product[], candidate: unknown) {
  const index = await validateIndex(products, candidate);
  const schema = { id: "string", text: "string", category: "enum", price: "number", embedding: "vector[384]" } as const;
  const database = create({ schema, language: "english" });
  const vectors = new Map(index.documents.map((document) => [document.id, document.vector]));
  const productById = new Map(products.map((product) => [product.id, product]));
  await insertMultiple(database, products.map((product) => ({ id: product.id, text: productSearchText(product), category: product.category, price: product.price, embedding: vectors.get(product.id)! })));

  function hits(results: { hits: { id: string; score: number }[] }): SearchHit[] {
    return results.hits.map(({ id, score }) => ({ product: productById.get(id)!, score }));
  }

  return {
    async search(query: string, embedding: number[], filters: SearchFilters, embeddingMs = 0): Promise<SearchResult> {
      const normalizedQuery = validateSearch(query, filters);
      validateEmbedding(embedding);
      const where = {
        ...(filters.category !== "all" ? { category: { eq: filters.category } } : {}),
        ...(filters.maxPrice !== null ? { price: { lte: filters.maxPrice } } : {}),
      };
      const keywordStart = performance.now();
      const keyword = await search(database, { term: normalizedQuery, mode: "fulltext", properties: ["text"], where, limit: SEARCH_LIMIT });
      const keywordMs = performance.now() - keywordStart;
      const semanticStart = performance.now();
      const semantic = await search(database, { mode: "vector", vector: { value: embedding, property: "embedding" }, similarity: 0, where, limit: SEARCH_LIMIT, includeVectors: false });
      const semanticMs = performance.now() - semanticStart;
      return { query: normalizedQuery, keyword: hits(keyword), semantic: hits(semantic), meta: { embeddingMs, keywordMs, semanticMs, dimension: EMBEDDING_DIMENSION, catalogueSize: products.length } };
    },
  };
}
