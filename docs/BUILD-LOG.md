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
- Public source and deployment verification are recorded in the validation document as they complete. The companion article remains an editorial draft until publication approval.

The product and article were developed with AI assistance and human direction. The evaluation is a small development check, not evidence of general retrieval accuracy, conversion lift, or customer ROI.
