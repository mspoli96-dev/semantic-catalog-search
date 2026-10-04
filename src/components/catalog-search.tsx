"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, ChevronDown, CircleAlert, Cpu, LoaderCircle, LockKeyhole, RotateCcw, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { CATEGORIES, EXAMPLE_QUERIES, PRODUCTS } from "@/data/catalog";
import type { Category, Product, SearchFilters, SearchHit, SearchResult, WorkerRequest, WorkerResponse } from "@/lib/contracts";

const categories: Array<Category | "all"> = ["all", ...CATEGORIES];
const suggestions = EXAMPLE_QUERIES;
const priceFormat = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
const initialFilters: SearchFilters = { category: "all", maxPrice: null };
type SearchJob = Extract<WorkerRequest, { type: "search" }>;
type EngineStatus = "idle" | "loading" | "ready" | "error";

function ProductCard({ product, compact = false, rank }: { product: Product; compact?: boolean; rank?: number }) {
  return (
    <article className={compact ? "product-card compact-product" : "product-card"}>
      <div className={`product-image category-${product.category.toLowerCase()}`}><Image src={product.image} alt="" width={240} height={200} unoptimized loading="lazy" />{rank !== undefined ? <span className="product-rank">0{rank + 1}</span> : null}</div>
      <div className="product-copy"><span className="product-category">{product.category}</span><div className="product-title-row"><h3>{product.name}</h3><span className="product-price">{priceFormat.format(product.price)}</span></div><p>{product.description}</p></div>
    </article>
  );
}

function ResultColumn({ title, label, hits, semantic }: { title: string; label: string; hits: SearchHit[]; semantic?: boolean }) {
  return (
    <section className={`result-column ${semantic ? "semantic-column" : "keyword-column"}`} aria-label={`${title} results`}>
      <header className="column-heading"><div><span className="column-icon">{semantic ? <Sparkles size={18} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}</span><div><h3>{title}</h3><p>{label}</p></div></div><span className="result-count">{Math.min(hits.length, 4)} {Math.min(hits.length, 4) === 1 ? "result" : "results"}</span></header>
      {hits.length ? <div className="results-list">{hits.slice(0, 4).map((hit, index) => <ProductCard product={hit.product} key={hit.product.id} compact rank={index} />)}</div> : <div className="empty-results"><Search size={26} strokeWidth={1.3} aria-hidden="true" /><h4>No matches this time.</h4><p>{semantic ? "Try a different description or broaden your filters." : "No keyword matches for this query. Compare what meaning-based search found."}</p></div>}
    </section>
  );
}

export function CatalogSearch() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [status, setStatus] = useState<EngineStatus>("idle");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Preparing local search…");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const workerRef = useRef<Worker | null>(null);
  const engineReady = useRef(false);
  const latestRequestId = useRef(0);
  const pendingJob = useRef<SearchJob | null>(null);
  const activeRequestId = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    engineReady.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  function stopTimer() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }

  function fail(message: string) {
    stopTimer();
    workerRef.current?.terminate();
    workerRef.current = null;
    engineReady.current = false;
    activeRequestId.current = null;
    setStatus("error");
    setBusy(false);
    setError(message);
    setAnnouncement("Local search could not finish. You can retry or browse the catalog.");
  }

  function sendPendingJob() {
    const job = pendingJob.current;
    if (!job || !workerRef.current || !engineReady.current || activeRequestId.current !== null) return;
    pendingJob.current = null;
    activeRequestId.current = job.requestId;
    stopTimer();
    timeoutRef.current = setTimeout(() => fail("Search is taking longer than expected. Try again, or use a shorter description."), 30_000);
    workerRef.current.postMessage(job);
  }

  function initializeWorker() {
    if (workerRef.current) return;
    setStatus("loading");
    setProgress(null);
    setLoadingMessage("Preparing local search…");
    try {
      const worker = new Worker(new URL("../workers/search.worker.ts", import.meta.url), { type: "module" });
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        if (workerRef.current !== worker) return;
        const message = event.data;
        if (message.type === "loading") {
          setLoadingMessage(message.message);
          setProgress(message.progress === null ? null : Math.max(0, Math.min(100, message.progress)));
        } else if (message.type === "ready") {
          stopTimer();
          engineReady.current = true;
          setStatus("ready");
          setProgress(100);
          sendPendingJob();
        } else if (message.type === "result") {
          if (activeRequestId.current === message.requestId) {
            stopTimer();
            activeRequestId.current = null;
          }
          if (message.requestId === latestRequestId.current) {
            setResult(message.result);
            setBusy(false);
            setAnnouncement(`Results ready for ${message.result.query}. ${Math.min(message.result.keyword.length, 4)} keyword results and ${Math.min(message.result.semantic.length, 4)} semantic results.`);
          }
          sendPendingJob();
        } else if (message.type === "error") {
          if (message.requestId !== undefined && message.requestId !== latestRequestId.current) {
            if (activeRequestId.current === message.requestId) { stopTimer(); activeRequestId.current = null; }
            sendPendingJob();
            return;
          }
          fail(message.message);
        }
      };
      worker.onerror = () => {
        if (workerRef.current === worker) fail("Your browser could not start local AI search. Check your connection and try again. A recent version of Chrome, Edge, Firefox, or Safari may help.");
      };
      timeoutRef.current = setTimeout(() => fail("The model download did not finish. Check your connection, then retry. Your searches have not been sent to a model provider."), 90_000);
      worker.postMessage({ type: "initialize" } satisfies WorkerRequest);
    } catch {
      fail("Local AI could not start in this browser. Try again in a recent browser, or explore the catalog below.");
    }
  }

  function runSearch(value: string, nextFilters = filters) {
    const trimmed = value.trim();
    if (!trimmed) { clearSearch(); return; }
    if (trimmed.length > 200) { setError("Keep your search under 200 characters."); return; }
    setQuery(value);
    setSubmittedQuery(trimmed);
    setError(null);
    setResult(null);
    setBusy(true);
    latestRequestId.current += 1;
    pendingJob.current = { type: "search", requestId: latestRequestId.current, query: trimmed, filters: nextFilters };
    setAnnouncement(engineReady.current ? `Searching for ${trimmed}.` : "Loading the local AI model for the first search. You can change your search while it loads.");
    if (engineReady.current) {
      if (activeRequestId.current !== null) {
        stopTimer();
        timeoutRef.current = setTimeout(() => fail("Search is taking longer than expected. Try again, or use a shorter description."), 30_000);
      }
      sendPendingJob();
    }
    else initializeWorker();
  }

  function clearSearch() {
    stopTimer();
    if (!engineReady.current) {
      workerRef.current?.terminate();
      workerRef.current = null;
      activeRequestId.current = null;
      setStatus("idle");
      setProgress(null);
    }
    latestRequestId.current += 1;
    pendingJob.current = null;
    setQuery("");
    setSubmittedQuery("");
    setResult(null);
    setError(null);
    setBusy(false);
    setAnnouncement("Search cleared. Browsing the catalog.");
    inputRef.current?.focus();
  }

  function changeFilters(nextFilters: SearchFilters) {
    setFilters(nextFilters);
    if (submittedQuery) runSearch(submittedQuery, nextFilters);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runSearch(query);
  }

  const filteredProducts = PRODUCTS.filter((product) => (filters.category === "all" || product.category === filters.category) && (filters.maxPrice === null || product.price <= filters.maxPrice));
  const browseProducts = filters.category === "all" ? categories.slice(1).flatMap((category) => filteredProducts.filter((product) => product.category === category).slice(0, 2)).slice(0, 8) : filteredProducts.slice(0, 8);

  return (
    <section id="search" className="search-experience" aria-labelledby="search-title">
      <div className="search-heading"><div><p className="eyebrow">THE INTERACTIVE DEMO</p><h2 id="search-title">What are you looking for?</h2></div><span className="local-pill"><span className="status-dot" />Local AI <span className="pill-divider">·</span> No API key</span></div>
      <form className="search-form" onSubmit={submit}><label htmlFor="catalog-query" className="visually-hidden">Describe the product you are looking for</label><Search size={21} strokeWidth={1.7} aria-hidden="true" /><input id="catalog-query" ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} maxLength={200} placeholder="Something to keep my coffee warm…" autoComplete="off" aria-describedby="local-search-note" />{query ? <button type="button" className="clear-search" onClick={clearSearch} aria-label="Clear search"><X size={17} /></button> : null}<button type="submit" className="button primary-button search-button" aria-label="Search products" disabled={!query.trim()}>{busy ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : null}<span>Search</span><ArrowRight size={17} aria-hidden="true" /></button></form>
      <div className="suggestions"><span>Try a little inspiration</span><div>{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => runSearch(suggestion)} className={submittedQuery === suggestion ? "chosen" : ""}>{suggestion}<ArrowRight size={11} aria-hidden="true" /></button>)}</div></div>
      <p id="local-search-note" className="search-privacy"><LockKeyhole size={12} aria-hidden="true" />Your words stay on this device. First search downloads a small AI model and runtime files.</p>

      <div className="filters-row"><div className="category-filters" role="group" aria-label="Filter by category">{categories.map((category) => <button type="button" key={category} aria-pressed={filters.category === category} onClick={() => changeFilters({ ...filters, category })} className={filters.category === category ? "active" : ""}>{category === "all" ? "All products" : category}</button>)}</div><label className="price-filter"><SlidersHorizontal size={13} aria-hidden="true" /><span className="visually-hidden">Maximum price in Canadian dollars</span><select value={filters.maxPrice ?? "all"} onChange={(event) => changeFilters({ ...filters, maxPrice: event.target.value === "all" ? null : Number(event.target.value) })}><option value="all">Any price</option><option value="25">Up to C$25</option><option value="50">Up to C$50</option><option value="100">Up to C$100</option></select><ChevronDown size={12} aria-hidden="true" /></label></div>

      {status === "loading" ? <div className="model-loading" role="status"><div className="loading-icon"><Cpu size={22} aria-hidden="true" /></div><div><strong>Bringing a little AI to your browser.</strong><p>{loadingMessage}</p><div className={`loading-track ${progress === null ? "indeterminate" : ""}`} role="progressbar" aria-label="Loading local search model" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress ?? undefined}><span style={progress === null ? undefined : { width: `${progress}%` }} /></div><span className="loading-detail">About 23 MB for the model, plus runtime files. Usually cached for your next visit.</span></div>{progress !== null ? <span className="loading-percentage">{Math.round(progress)}%</span> : <LoaderCircle size={18} className="spin" aria-hidden="true" />}</div> : null}
      {error ? <div className="search-error" role="alert"><CircleAlert size={20} aria-hidden="true" /><div><strong>Local search needs another try.</strong><p>{error}</p><button type="button" className="text-button" onClick={() => runSearch(submittedQuery || query || suggestions[0])}><RotateCcw size={13} aria-hidden="true" />Retry local search</button></div><button type="button" className="icon-button" onClick={() => { setError(null); clearSearch(); }} aria-label="Dismiss error and browse catalog"><X size={16} /></button></div> : null}

      {result ? <div className="results-section"><div className="results-heading"><p>Two ways to find <strong>“{result.query}”</strong></p><button type="button" onClick={clearSearch}>Browse catalog <ArrowRight size={12} aria-hidden="true" /></button></div><div className="comparison-grid"><ResultColumn title="Keyword search" label="Matches the words you typed" hits={result.keyword} /><ResultColumn title="Semantic search" label="Looks for a similar meaning" hits={result.semantic} semantic /></div><div className="result-footnote"><span><Check size={13} aria-hidden="true" />Same catalog. Same filters. Real search results.</span><details><summary>Behind this search <ChevronDown size={12} aria-hidden="true" /></summary><dl><div><dt>Query embedding</dt><dd>{result.meta.embeddingMs.toFixed(1)} ms</dd></div><div><dt>Keyword search</dt><dd>{result.meta.keywordMs.toFixed(1)} ms</dd></div><div><dt>Vector search</dt><dd>{result.meta.semanticMs.toFixed(1)} ms</dd></div><div><dt>Catalog</dt><dd>{result.meta.catalogueSize} products</dd></div><div><dt>Embedding size</dt><dd>{result.meta.dimension} dimensions</dd></div></dl><p>Measured on this device. Vector similarity describes closeness, not confidence or product suitability.</p></details></div></div> : busy && status === "ready" ? <div className="searching-state" role="status"><LoaderCircle size={24} className="spin" aria-hidden="true" /><p>Finding the words. Connecting the meaning.</p></div> : <div className="browse-section"><div className="browse-heading"><div><h3>A few things worth finding.</h3><p>{PRODUCTS.length} fictional products. Illustrations show product families.</p></div><span>{filteredProducts.length} products <span className="browse-currency">· CAD</span></span></div>{browseProducts.length ? <div className="browse-grid">{browseProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="browse-empty"><Search size={24} aria-hidden="true" /><p>No products fit these filters.</p><button type="button" className="text-button" onClick={() => changeFilters(initialFilters)}>Clear filters</button></div>}</div>}
      <div className="limitations-note"><InfoIcon /><p>A useful experiment, not a perfect matchmaker. Meaning-based search can miss negations, exact numbers, or specific requirements. Use the category and price filters for hard limits.</p></div>
      <span className="visually-hidden" role="status" aria-live="polite">{announcement}</span>
    </section>
  );
}

function InfoIcon() { return <CircleAlert size={14} strokeWidth={1.6} aria-hidden="true" />; }
