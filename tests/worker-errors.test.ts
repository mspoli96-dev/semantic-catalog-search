import { describe, expect, it } from "vitest";
import { searchFailureMessage } from "../src/lib/worker-errors";

describe("safe worker diagnostics", () => {
  it("reports a stage and category without including query text, asset URLs, or raw errors", () => {
    const result = searchFailureMessage(new TypeError("Failed to fetch https://example.com/private?query=personal-search"), "model-download");
    expect(result).toContain("MODEL_DOWNLOAD:NETWORK");
    expect(result).not.toContain("example.com");
    expect(result).not.toContain("personal-search");
  });

  it("distinguishes runtime initialization from ranking and preserves no unknown content", () => {
    expect(searchFailureMessage(new Error("no available backend found: wasm"), "runtime-initialization")).toContain("RUNTIME_INITIALIZATION:RUNTIME");
    expect(searchFailureMessage(new Error("unknown details"), "ranking")).toContain("RANKING:UNAVAILABLE");
    expect(searchFailureMessage(new Error("unknown details"), "ranking")).not.toContain("unknown details");
  });
});
