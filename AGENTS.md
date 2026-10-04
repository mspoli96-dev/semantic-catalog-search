# Semantic Catalog Search

This is an independent Webytex open-source demo. Every source file, comment, interface, document, fixture, and article is in English. Converse with Martin in Spanish. Canada is the primary audience and the US is secondary.

Keep the scope small: one synthetic product catalogue, a keyword/semantic comparison, useful filters, and clear search results. Use Orama as the embedded vector database and a small local embedding model. Do not add logins, payments, shopping carts, analytics, external databases, or paid model requests without a concrete need and authorization. Do not copy client code or data.

Use npm with package-lock.json and Node.js 24.x. Verify with npm run typecheck, npm test, npm run build, and the real browser flow. Read relevant Next.js documentation bundled in node_modules/next/dist/docs before changing Next.js conventions.

Preserve concurrent work. Never read or reuse another project's credentials. Do not log searches or send them to model providers. Explain that public model and runtime assets are downloaded on first use, then search runs on the device. Never present fixture rankings as live inference or similarity as confidence.

Keep internal strategy and publication ledgers outside the public repository. Public source and a Vercel demo are part of this project's requested format. Keep the article as a reviewable draft; do not publish social posts or send external messages without current authorization.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
