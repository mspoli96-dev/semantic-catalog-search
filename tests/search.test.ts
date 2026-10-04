import { describe, expect, it } from "vitest";
import type { Product, SearchFilters } from "../src/lib/contracts";
import { catalogueHash, createSearchEngine, validateEmbedding, validateIndex, validateSearch, type SearchIndex } from "../src/lib/search";
import { EMBEDDING_DIMENSION, EMBEDDING_DTYPE, EMBEDDING_MODEL, EMBEDDING_POOLING, INDEX_VERSION, MODEL_REVISION } from "../src/lib/model-config";

const products: Product[] = [
  { id: "mug", name: "Insulated travel mug", description: "A sealed cup for coffee on the train.", category: "Travel", price: 20, image: "/mug.svg", tags: ["coffee", "warm"] },
  { id: "bottle", name: "Trail water bottle", description: "A reusable bottle for water during walks.", category: "Outdoors", price: 30, image: "/bottle.svg", tags: ["water", "cold"] },
  { id: "cup", name: "Desk coffee cup", description: "A ceramic mug for coffee at home.", category: "Desk", price: 12, image: "/cup.svg", tags: ["coffee", "ceramic"] },
];

function vector(first: number, second: number) {
  const result = Array<number>(EMBEDDING_DIMENSION).fill(0);
  const norm = Math.hypot(first, second);
  result[0] = first / norm;
  result[1] = second / norm;
  return result;
}

async function index(): Promise<SearchIndex> {
  return { version: INDEX_VERSION, model: EMBEDDING_MODEL, revision: MODEL_REVISION, dtype: EMBEDDING_DTYPE, pooling: EMBEDDING_POOLING, normalized: true, dimension: EMBEDDING_DIMENSION, catalogueHash: await catalogueHash(products), generatedAt: "2026-10-04T00:00:00.000Z", documents: [{ id: "mug", vector: vector(1, 0) }, { id: "bottle", vector: vector(0, 1) }, { id: "cup", vector: vector(0.8, 0.2) }] };
}

const all: SearchFilters = { category: "all", maxPrice: null };

describe("embedded search engine", () => {
  it("ranks vector matches by the supplied embedding independently of keyword overlap", async () => {
    const engine = await createSearchEngine(products, await index());
    const result = await engine.search("something completely different", vector(0, 1), all);
    expect(result.semantic[0].product.id).toBe("bottle");
    expect(result.keyword).toEqual([]);
    expect(result.meta.dimension).toBe(384);
    expect(result.meta.catalogueSize).toBe(3);
  });

  it("returns lexical matches from the same catalogue text", async () => {
    const engine = await createSearchEngine(products, await index());
    const result = await engine.search("insulated", vector(1, 0), all);
    expect(result.keyword[0].product.id).toBe("mug");
    expect(result.semantic[0].product.id).toBe("mug");
  });

  it("applies category and inclusive price filters to both search modes before limiting", async () => {
    const engine = await createSearchEngine(products, await index());
    const result = await engine.search("coffee", vector(1, 0), { category: "Desk", maxPrice: 12 });
    expect(result.keyword.map((hit) => hit.product.id)).toEqual(["cup"]);
    expect(result.semantic.map((hit) => hit.product.id)).toEqual(["cup"]);
    const none = await engine.search("coffee", vector(1, 0), { category: "Desk", maxPrice: 11.99 });
    expect(none.keyword).toEqual([]);
    expect(none.semantic).toEqual([]);
  });

  it("does not return vectors as product metadata or alter the source catalogue", async () => {
    const engine = await createSearchEngine(products, await index());
    const result = await engine.search("mug", vector(1, 0), all);
    expect(result.semantic[0].product).toEqual(products[0]);
    expect(result.semantic[0].product).not.toHaveProperty("embedding");
    expect(products[0]).not.toHaveProperty("embedding");
  });
});

describe("index integrity", () => {
  it("rejects model, revision, precision, and dimension mismatches", async () => {
    const good = await index();
    for (const altered of [{ ...good, model: "different" }, { ...good, revision: "main" }, { ...good, dtype: "fp32" }, { ...good, dimension: 1536 }, { ...good, normalized: false }]) {
      await expect(validateIndex(products, altered)).rejects.toThrow("different embedding model");
    }
  });

  it("detects changed product copy, prices, tags, or asset paths", async () => {
    const good = await index();
    for (const altered of [{ ...products[0], description: "Changed" }, { ...products[0], price: 21 }, { ...products[0], tags: ["new"] }, { ...products[0], image: "/new.svg" }]) {
      await expect(validateIndex([altered, ...products.slice(1)], good)).rejects.toThrow("changed after indexing");
    }
  });

  it("rejects duplicate, missing, and unknown product identities", async () => {
    const good = await index();
    await expect(validateIndex(products, { ...good, documents: good.documents.slice(1) })).rejects.toThrow("do not match");
    await expect(validateIndex(products, { ...good, documents: [good.documents[0], good.documents[0], good.documents[2]] })).rejects.toThrow("do not match");
    await expect(validateIndex(products, { ...good, documents: [{ ...good.documents[0], id: "unknown" }, ...good.documents.slice(1)] })).rejects.toThrow("do not match");
  });

  it("rejects malformed, nonfinite, empty, or unnormalized embeddings", () => {
    for (const invalid of [[], Array(384).fill(0), Array(384).fill(1), [NaN, ...Array(383).fill(0)], [Infinity, ...Array(383).fill(0)], ["1", ...Array(383).fill(0)]]) {
      expect(() => validateEmbedding(invalid)).toThrow();
    }
    expect(() => validateEmbedding(vector(0.1, 0.2))).not.toThrow();
  });
});

describe("search input boundaries", () => {
  it("rejects empty or oversized searches rather than silently truncating them", () => {
    expect(() => validateSearch(" ", all)).toThrow("Enter a description");
    expect(() => validateSearch("a".repeat(201), all)).toThrow("200 characters");
    expect(validateSearch("  coffee   on trains  ", all)).toBe("coffee on trains");
  });

  it("rejects invalid filter values and keeps zero as a valid price", () => {
    for (const value of [NaN, Infinity, -1]) expect(() => validateSearch("coffee", { category: "all", maxPrice: value })).toThrow("maximum price");
    expect(() => validateSearch("coffee", { category: "all", maxPrice: 0 })).not.toThrow();
    expect(() => validateSearch("coffee", { category: "unknown", maxPrice: null } as unknown as SearchFilters)).toThrow("category");
  });
});
