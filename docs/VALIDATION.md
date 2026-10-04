# Validation

The October 3, 2026 local checkpoint covers code, catalogue embeddings, real-model comparisons, and local production-browser interaction. Public source and CI were subsequently verified. The initial hosted browser attempt failed during model download; a same-origin asset correction remains pending final build and hosted verification.

## Catalogue

The original synthetic catalogue contains 48 entries: 12 each in Desk, Travel, Outdoors, and Everyday. Product IDs and category counts were checked during preparation. Descriptions are ordinary product copy, including distinctions between similar items. Prices are illustrative CAD amounts. Shared illustrations depict product families rather than exact merchandise.

## Search comparison

Both Orama full-text search and vector search use the text returned by `productSearchText`: name, description, category, and tags. Category and price filters are shared. The comparison does not deliberately strip metadata from the keyword baseline or insert special expected-query phrases into the semantic input.

The model configuration pins `Xenova/all-MiniLM-L6-v2`, q8, mean pooling, normalized 384-dimensional vectors, and a specific upstream revision. The generated index includes that configuration and a SHA-256 catalogue hash. Index validation rejects mismatched configuration, missing or duplicate IDs, malformed vectors, and a changed catalogue.

## Relevance evaluation

`npm run evaluate` reads the relevance cases, runs actual local query embeddings, and records both result lists, the first relevant rank, and timing information. The ten queries and relevant product IDs were authored from catalogue attributes before the first evaluation. The catalogue and expected answers were not edited to manufacture an improvement after inspecting these rankings.

Top-1 counts and reciprocal rank over the returned six results summarize only those cases. They do not establish general search accuracy, user satisfaction, or sales impact. Timings measured by the Node.js evaluation exclude model download and do not represent browser latency.

The [recorded report](../fixtures/evaluations/2026-10-04T01-58-51.010Z.json) was generated at 01:58:51 UTC on October 4, which was October 3 in Montevideo. Its catalogue hash is `5324ca0eb542f7fd4138d6cfa45d535483d04d7439a8952c8d530625bdb441b0`.

| Metric on the ten synthetic cases | Keyword, Orama BM25 | Semantic |
| --- | --- | --- |
| First result judged relevant | 3 / 10 | 8 / 10 |
| A relevant result among the first six | 8 / 10 | 10 / 10 |
| Mean reciprocal rank at six | 0.453333 | 0.900000 |

Reciprocal rank uses the position of the first product in the case's authored relevance set, or zero when none appears within six results. These relevance labels are a small development judgement set, not feedback from real shoppers.

| Query | First relevant keyword rank | First relevant semantic rank |
| --- | --- | --- |
| keep my coffee hot | 5 | 1 |
| something for a noisy office | None in top six | 1 |
| protect my laptop on the commute | 4 | 1 |
| a place to write down ideas | 3 | 1 |
| sit comfortably around a campfire | None in top six | 1 |
| stay dry on the walk home | 4 | 2 |
| Packing Cube Set | 1 | 1 |
| Wireless Charging Pad | 1 | 1 |
| headphones without active noise cancellation | 2 | 2 |
| stay dry in the rain, Travel, at most CAD 27 | 1 | 1 |

Two semantic errors matter: the unfiltered walking-in-rain query ranks Trail Daypack first, ahead of rainwear; the negated headphones query ranks Quiet Focus Headphones with active cancellation first, ahead of the requested non-cancelling model. Keyword search also makes the latter mistake. These outcomes are retained, not relabelled as successes.

## Recorded checks

| Check | Status |
| --- | --- |
| TypeScript | Passed |
| Unit tests | Latest local run: 14 passed, including safe model-loading error diagnostics |
| Production build | Initial local build passed at 23:01 Montevideo; the same-origin asset correction awaits its final build check |
| Catalogue embedding generation | Passed; 48 vectors, 384 dimensions, normalized; index 210,556 bytes |
| Actual-model relevance evaluation | Completed for all ten authored queries; results and failures above |
| Browser model loading and live query inference | Passed locally: noisy-office query ranked Quiet Focus Headphones first; additional reading-after-dark query ranked Clip-On Reading Light first |
| Shared category and price filters | Evaluation assertions passed; local browser Travel / CAD 50 search returned only eligible semantic products, led by the CAD 36 Insulated Travel Tumbler; keyword list empty |
| Successive search requests | Passed locally: two rapid requests preserved the latest query result |
| Empty search / clear | Passed locally: clearing restored catalogue browsing and disabled empty submission |
| Mobile layout | Passed locally at 375 CSS pixels, without horizontal overflow |
| Production browser console | No warnings or errors captured in the local check |
| Full keyboard and model-download error coverage | Pending |
| Query privacy | Worker source has no query-upload API; browser request-payload tracing was not available, so no measured network-trace claim is made |
| Public source and hosted deployment | Source pushed and CI passed; initial deployment ready, but hosted model download failed; correction pending retest |
| Runtime dependency audit | Zero reported vulnerabilities at the verification checkpoint; not a security certification |

The selected model weight file contains 22,972,370 bytes, approximately 23 MB, plus separate tokenizer and runtime assets. Measure the actual browser transfer separately before describing total page weight or startup time.

The local noisy-office browser query reported 81.5 ms for embedding. Its keyword first result was the non-cancelling on-ear product, while semantic search returned the cancelling model. This is a single device observation, not a cold-start or end-to-end latency measurement. Initial model/runtime download performance has not been measured as a benchmark.

The additional browser query “a light for reading after dark” was outside the ten-case evaluation and returned Clip-On Reading Light first semantically. For “keep my coffee hot,” the browser's Travel / CAD 50 filters returned no keyword matches and ranked Insulated Travel Tumbler first semantically, with every returned product satisfying those filters. These observations supplement the frozen evaluation; they do not change its reported metrics.

Linux CPU installs skip optional CUDA downloads through `ONNXRUNTIME_NODE_INSTALL_CUDA=skip`. The CPU runtime remains available. The dependency tree overrides `sharp` to 0.35.5; the current runtime audit found no reported vulnerabilities.

## Publication destinations

- Repository: [mspoli96-dev/semantic-catalog-search](https://github.com/mspoli96-dev/semantic-catalog-search), initial source published at `28fcd7c86ea6bb08d0340574ab7b6c1adef1065e`.
- The initial [GitHub CI](https://github.com/mspoli96-dev/semantic-catalog-search/actions/runs/37170195895) passed. The later diagnostic revision `8381d9d` also [passed CI](https://github.com/mspoli96-dev/semantic-catalog-search/actions/runs/37170824722).
- Demo: [webytex-semantic-search.vercel.app](https://webytex-semantic-search.vercel.app). The initial Git-linked deployment became ready and promoted. This did not establish successful inference: its browser attempt reported `MODEL_DOWNLOAD:NETWORK`.

## Hosted model-loading correction

Local inference with cached assets succeeded while the hosted attempt failed in the model-download stage. This identifies the failing stage, not a proven cause in a particular network, CDN, or browser policy.

The correction stages pinned model files during `prepare:model`, which runs automatically before development and production builds. Files are checked against a SHA-256 manifest and served from `public/models/<revision>/Xenova/all-MiniLM-L6-v2/` on the demo's own origin. The browser worker disables remote-model fallback. Generated weights remain outside Git; fresh build environments download them before packaging the site.

This changes asset delivery, not the embedding model, catalogue, or inference location. Runtime files still come from their public CDN. The application has no hosted inference API and does not upload the query to a model provider.

The corrected implementation passed 14 unit tests and type checking. Final preparation/build checks and a fresh hosted browser inference test are pending. The existing relevance report remains a local-model result and must not be relabelled as proof that the hosted correction works.
