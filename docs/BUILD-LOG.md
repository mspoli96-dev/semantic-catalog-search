# Build log

## October 3, 2026

- Martin selected a small semantic search demo for the Webytex open-source series, using a public repository, a Vercel demo, and an article. All public content and code are in English.
- Implementation began at 22:36 America/Montevideo (01:36 UTC on October 4). This timestamp is not a human engineering-effort estimate.
- Chose an embedded Orama database and a quantized MiniLM model running in a browser worker. This keeps query inference off hosted model APIs and avoids provisioning a separate database service.
- Created 48 fictional products across four categories, original product-family illustrations, and an original vector cover. No client code, catalogue, private pricing, or credentials were reused.
- Generated real 384-dimensional catalogue vectors with a pinned model revision, recorded their catalogue hash, and verified index alignment.
- Defined ten small development queries before the first embedding evaluation. Semantic search put an expected product first in eight cases; keyword search did so in three. The rain and negation failures are retained in the results.
- Passed 12 tests, TypeScript checking, and the production build. The dependency audit reported zero known vulnerabilities after pinning a patched transitive image library.
- Verified browser inference with a new reading-light query, category/price filters, last-request handling, clearing, and a 375-pixel viewport without horizontal overflow. Browser console checks were clean.
- Published source revision `28fcd7c86ea6bb08d0340574ab7b6c1adef1065e` to the [public repository](https://github.com/mspoli96-dev/semantic-catalog-search).
- [GitHub CI passed](https://github.com/mspoli96-dev/semantic-catalog-search/actions/runs/37170195895), and the Git-linked [Vercel production deployment](https://webytex-semantic-search.vercel.app) became ready and promoted at the same revision.
- The first hosted browser inference attempt failed during model download. A diagnostic revision (`8381d9d`) reported `MODEL_DOWNLOAD:NETWORK` and [passed CI](https://github.com/mspoli96-dev/semantic-catalog-search/actions/runs/37170824722). Successful local inference with cached assets did not resolve the hosted failure.
- Prepared pinned, SHA-256-verified model/tokenizer files and the matching ONNX Runtime WebAssembly binary during `prepare:model`, automatically before development and production builds. The browser now preloads these assets from the demo's origin in 256 KiB ranges with bounded concurrency and retries, validating response ranges and complete-file hashes. Remote-model fallback is disabled; only the small runtime JavaScript loader remains on its public CDN.
- Generated model assets remain Git-ignored and include the full Apache License notices and source/revision/hash metadata. The runtime includes its full Microsoft MIT license copied from the matching upstream commit. Cache writes are optional after verification.
- The correction does not change the catalogue, evaluation cases, embedding configuration, or on-device inference design. Its 19 unit tests, type checking, verified asset preparation, and production build passed.
- Published correction `86eff86fd93d86311306f3efdf0e20c3ec24e194`. Its [CI run](https://github.com/mspoli96-dev/semantic-catalog-search/actions/runs/37171717301) passed, and the matching Git-linked Vercel production deployment became ready.
- Verified the corrected public browser path with an initially empty custom asset cache: runtime/model downloads completed, then “something for a noisy office” returned Quiet Focus Headphones first semantically versus Lightweight On-Ear Headphones first by keyword. No browser warnings or errors were captured.
- Passed additional hosted checks for the reading-light query, Travel / CAD 50 filters, mobile layout without horizontal overflow, and a successful search after page reload. These are functional observations rather than a measured network-cache or performance benchmark.
- The pinned model, tokenizer/configuration, and WebAssembly assets total approximately 45.3 MB. This is not a measurement of the entire page transfer or first-load duration.
- The companion article remains an unpublished draft and is excluded from the public source tree.

The product and article were developed with AI assistance and human direction. The evaluation is a small development check, not evidence of general retrieval accuracy, conversion lift, or customer ROI.
