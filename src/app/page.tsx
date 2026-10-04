import { ArrowDown, ArrowRight, ArrowUpRight, Braces, Code2, Cpu, LockKeyhole, Search } from "lucide-react";
import { CatalogSearch } from "@/components/catalog-search";

const repositoryUrl = process.env.NEXT_PUBLIC_REPOSITORY_URL;
const contactUrl = "https://business.webytex.com/?utm_source=semantic_catalog_search&utm_medium=demo&utm_campaign=open_source#quick-contact";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#search">Skip to product search</a>
      <header className="site-header page-width">
        <a className="brand" href="#" aria-label="Semantic Catalog Search by Webytex"><span className="brand-mark"><Braces size={23} aria-hidden="true" /></span><span className="brand-title">Semantic Catalog Search<span className="brand-by">a small tool by <strong>WEBYTEX</strong></span></span></a>
        <nav aria-label="Main navigation"><a href="#how-it-works" className="how-link">How it works</a>{repositoryUrl ? <a href={repositoryUrl} target="_blank" rel="noreferrer" className="source-link" aria-label="View source"><Code2 size={16} aria-hidden="true" /><span>View source</span><ArrowUpRight size={13} aria-hidden="true" /></a> : null}<a className="header-contact" href={contactUrl} target="_blank" rel="noreferrer" aria-label="Talk to Webytex"><span>Let’s talk</span><ArrowUpRight size={16} aria-hidden="true" /></a></nav>
      </header>

      <main>
        <section className="hero page-width" aria-labelledby="page-title">
          <div className="hero-copy"><p className="eyebrow"><span />A LITTLE MORE UNDERSTANDING</p><h1 id="page-title">Find what<br className="hero-break" /> you <span>mean.</span></h1><p className="hero-description">You know what you need. You might not know what it’s called.<br className="desktop-break" /> Search a small catalog in your own words and see the difference.</p><a href="#search" className="hero-action">Try a search <ArrowDown size={16} aria-hidden="true" /></a></div>
          <div className="hero-object" aria-hidden="true"><span className="object-caption">WORDS → MEANING → PRODUCTS</span><div className="query-note"><Search size={18} /><span>something for a rainy commute</span></div><div className="floating-product"><svg viewBox="0 0 180 170" fill="none"><ellipse cx="90" cy="150" rx="39" ry="6" fill="#173b31" opacity=".06"/><path d="M90 24v112c0 18 25 18 25 0" stroke="#2b5248" strokeWidth="6" strokeLinecap="round"/><path d="M29 79c3-41 119-65 123 0-14-12-27-12-40 0-15-12-29-12-43 0-14-12-27-12-40 0Z" fill="#dc7f61" stroke="#cb6a4d" strokeWidth="2"/><path d="M90 26C76 43 69 58 69 78m21-52c15 16 22 31 22 52" stroke="#efb09a" strokeWidth="2"/><path d="M90 20v8" stroke="#2b5248" strokeWidth="5" strokeLinecap="round"/></svg><span>Found by meaning<span className="small-dot" /></span></div><div className="local-note"><Cpu size={16} /><span>Small model.<br /><strong>Right in your browser.</strong></span></div></div>
        </section>

        <div className="page-width"><CatalogSearch /></div>

        <section className="how-section page-width" id="how-it-works" aria-labelledby="how-title"><div className="how-heading"><p className="eyebrow">A SEARCH THAT GOES A LITTLE FURTHER</p><h2 id="how-title">Same catalog.<br /> Different way of looking.</h2></div><div className="how-steps"><article><span className="step-number">01</span><h3>Say it your way</h3><p>Describe a need, an occasion, or a problem. Both searches get the same words and filters.</p></article><article><span className="step-number">02</span><h3>Look beyond the words</h3><p>Keyword search matches text. A small AI model connects your meaning with product descriptions.</p></article><article><span className="step-number">03</span><h3>Compare for yourself</h3><p>See the results side by side. Try different phrases. Sometimes exact words are still the better fit.</p></article></div></section>

        <section className="build-section page-width" aria-labelledby="build-title"><div><p className="eyebrow">MAKE YOUR CATALOG EASIER TO EXPLORE</p><h2 id="build-title">Good products deserve<br /> to be found.</h2></div><div><p>We build search and AI workflows around your products, your data, and the way your customers actually work.</p><a className="button primary-button" href={contactUrl} target="_blank" rel="noreferrer">Talk to Webytex <ArrowUpRight size={17} aria-hidden="true" /></a></div></section>
      </main>

      <footer className="site-footer page-width"><div className="footer-brand">WEBYTEX<span>Small tools. Useful possibilities.</span></div><div className="footer-copy"><p><LockKeyhole size={12} aria-hidden="true" /> Search runs locally. Public model and runtime files download on first use.</p><p>A fictional catalog, not a real store. Built with AI assistance and human direction. {repositoryUrl ? <a href={repositoryUrl} target="_blank" rel="noreferrer">Explore the code <ArrowRight size={12} aria-hidden="true" /></a> : null}</p></div></footer>
    </>
  );
}
