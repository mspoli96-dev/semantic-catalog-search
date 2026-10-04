export type Category = "Desk" | "Travel" | "Outdoors" | "Everyday";

export type Product = {
  id: string;
  name: string;
  description: string;
  category: Category;
  price: number;
  image: string;
  tags: string[];
};

export type SearchFilters = { category: Category | "all"; maxPrice: number | null };
export type SearchHit = { product: Product; score: number };
export type SearchResult = {
  query: string;
  keyword: SearchHit[];
  semantic: SearchHit[];
  meta: { embeddingMs: number; keywordMs: number; semanticMs: number; dimension: number; catalogueSize: number };
};

export type WorkerRequest =
  | { type: "initialize" }
  | { type: "search"; requestId: number; query: string; filters: SearchFilters };

export type WorkerResponse =
  | { type: "loading"; message: string; progress: number | null }
  | { type: "ready" }
  | { type: "result"; requestId: number; result: SearchResult }
  | { type: "error"; requestId?: number; message: string };
