import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { PRODUCTS } from "../src/data/catalog";
import { createSearchEngine, validateIndex, type SearchIndex } from "../src/lib/search";

describe("published catalogue index", () => {
  it("contains one finite, normalized vector per current product with the pinned model and matching source hash", async () => {
    const index = JSON.parse(await readFile("public/search-index.json", "utf8"));
    const validated = await validateIndex(PRODUCTS, index);
    expect(validated.documents).toHaveLength(PRODUCTS.length);
    expect(validated.documents).toHaveLength(48);
  });

  it("retrieves a catalogue item by its own actual vector and applies price boundaries consistently", async () => {
    const index = JSON.parse(await readFile("public/search-index.json", "utf8")) as SearchIndex;
    const engine = await createSearchEngine(PRODUCTS, index);
    const product = PRODUCTS.find((item) => item.id === "travel-06")!;
    const vector = index.documents.find((item) => item.id === product.id)!.vector;
    const included = await engine.search(product.name, vector, { category: product.category, maxPrice: product.price });
    expect(included.semantic[0].product.id).toBe(product.id);
    expect(included.keyword[0].product.id).toBe(product.id);
    const excluded = await engine.search(product.name, vector, { category: product.category, maxPrice: product.price - 0.01 });
    expect([...excluded.keyword, ...excluded.semantic].some((hit) => hit.product.id === product.id)).toBe(false);
  });
});
