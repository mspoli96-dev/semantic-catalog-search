# Semantic Catalog Search

Search a small product catalogue by describing what you need. Compare keyword search with semantic search over the same text, using a local embedding model and an embedded vector database.

[Demo](https://webytex-semantic-search.vercel.app) · [Repository](https://github.com/mspoli96-dev/semantic-catalog-search) · [Discuss a project](https://business.webytex.com/#quick-contact)

**Release status:** source is public and the [diagnostic revision passed GitHub CI](https://github.com/mspoli96-dev/semantic-catalog-search/actions/runs/37170824722). The initial hosted browser attempt failed while downloading the model, despite successful local inference. A correction prepares verified model assets for delivery from the demo's own origin; its build, deployment, and hosted inference checks remain pending. See [validation](docs/VALIDATION.md) for the distinction between local results and hosted operation.

## Try an idea

- “keep my coffee hot”
- “something for a noisy office”
- “protect my laptop on the commute”
- “a place to write down ideas”

The catalogue contains 48 fictional products across Desk, Travel, Outdoors, and Everyday. Prices are illustrative Canadian dollars. Product-family illustrations are original drawings, not photographs of real merchandise.

Both search modes use the same product names, descriptions, categories, and tags. Category and maximum-price filters apply to both. Semantic similarity is a ranking signal, not a confidence percentage or a guarantee that a product satisfies every requirement.

## Run locally

Use Node.js 24.x and npm:

```bash
npm ci
npm run dev
```

On Linux CPU-only machines and CI, avoid downloading optional CUDA binaries during installation:

```bash
ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci
```

This preserves the Node.js CPU evaluation and browser WebAssembly inference paths used here. The CI environment and Vercel install command use this setting.

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). `npm run dev` and `npm run build` automatically run `prepare:model` first. That preparation retrieves the pinned model files, verifies their SHA-256 hashes, and places them under `public/models/<revision>/Xenova/all-MiniLM-L6-v2/`, with the model manifest and license notices. Valid cached files can be reused. The generated model directory is Git-ignored; a fresh build needs access to the public asset host until those files are cached.

To prepare the assets explicitly:

```bash
npm run prepare:model
```

A generated index with 48 real 384-dimensional product vectors is included. Run `npm run index` only when the catalogue or model configuration changes; it writes `public/search-index.json` using local model inference. Indexing and evaluation remain CPU operations, not paid API requests.

```bash
npm run typecheck
npm test
npm run build
npm run evaluate
```

The evaluation command runs actual local model inference and compares the two search modes against the relevance cases in `fixtures/evaluation-cases.json`. It writes a dated report under `fixtures/evaluations/`. This is different from unit tests with constructed vectors. Neither command makes a paid model API request. See [validation](docs/VALIDATION.md) for the recorded evidence.

## What the comparison showed

Ten synthetic queries and their relevant product IDs were written before the first evaluation. Semantic search placed an expected product first in **8 of 10** cases; Orama BM25 keyword search did so in **3 of 10**. The corresponding counts within the first six results were **10 of 10** and **8 of 10**. [Recorded evaluation](fixtures/evaluations/2026-10-04T01-58-51.010Z.json)

Both methods ranked noise-cancelling headphones first for a query asking for headphones **without** active noise cancellation. The correct product was second. Semantic search also put a trail backpack above the intended rainwear for “stay dry on the walk home.” These failures are preserved. This small development set is not a general accuracy benchmark or a claim about sales.

One local browser search for “something for a noisy office” returned Quiet Focus Headphones first in semantic results and reported 81.5 ms for query embedding. That is one device observation, excluding cold-start downloads and page loading; it is not a latency promise.

The local production browser also placed Clip-On Reading Light first for the additional query “a light for reading after dark.” With Travel and a maximum of CAD 50 selected, “keep my coffee hot” placed the CAD 36 Insulated Travel Tumbler first semantically, while keyword search returned no matches. These are observed examples, separate from the frozen ten-query evaluation.

## Optional configuration

No API key is required. Optional `.env.local` values are:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_REPOSITORY_URL` | Public source link shown in the interface |
| `NEXT_PUBLIC_SITE_URL` | Public base URL for deployment metadata |

## How it works

1. An indexing command embeds the catalogue into 384-dimensional vectors and saves its catalogue hash and model configuration.
2. Build preparation stages the pinned model and tokenizer assets for static hosting. In the browser, a Web Worker loads them from the same origin as the demo, with remote-model fallback disabled.
3. The worker embeds the search phrase locally and runs Orama full-text and vector searches with the same filters.
4. The interface displays both result lists for comparison.

| Component | Choice |
| --- | --- |
| Interface | Next.js, React, TypeScript |
| Embedded search database | Orama 3.1.18 |
| Inference library | Transformers.js 3.8.1 |
| Embedding model | `Xenova/all-MiniLM-L6-v2`, q8, mean pooling, normalized vectors |
| Browser execution | Web Worker and WebAssembly |
| Model revision | Pinned in `src/lib/model-config.ts` |

The [model card](https://huggingface.co/Xenova/all-MiniLM-L6-v2) describes its 384-dimensional embeddings. The selected [quantized weights](https://huggingface.co/Xenova/all-MiniLM-L6-v2/tree/751bff37182d3f1213fa05d7196b954e230abad9/onnx) occupy 22,972,370 bytes, approximately 23 MB. The tokenizer and inference runtime add to the initial download, so 23 MB is not the complete page transfer size.

## Privacy and practical limits

The browser downloads the model and tokenizer from the demo's own origin on first use. Inference-runtime assets still use a public CDN. The application does not send search phrases to a model provider, store query logs, or use a paid inference API. The hosting service and runtime CDN receive ordinary asset requests. Browser caching can reduce later downloads, but full offline operation is not promised.

The model and catalogue run on the user's device. Startup time and memory use vary by browser and hardware. The entire synthetic catalogue and index are public, so this architecture is not suitable for confidential records or customer-specific prices without changes.

Queries are limited to 200 characters and checked against the model's 256-token input limit. Up to six results are returned per mode. The model may miss negation, precise constraints, unusual terminology, or an out-of-catalogue request. An exact product name can work better with keyword search. A semantic neighbour is not proof that the right product exists.

This is a focused search demonstration, not a shop: there are no accounts, carts, payments, analytics, or external databases. It does not claim increased sales, general search accuracy, or production scale.

## Work with Webytex

Need search connected to your own product catalogue or business tools? [Discuss a focused implementation with Martin](https://business.webytex.com/#quick-contact).

AI assisted the implementation and documentation. The catalogue and illustrations are original synthetic material; no client code or data is included.

## License

Original project code and assets: [MIT](LICENSE), copyright 2026 Martin Poli. Model weights and dependencies retain their own licenses; see [third-party notices](THIRD-PARTY-NOTICES.md).
