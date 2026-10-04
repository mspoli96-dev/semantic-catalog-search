import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import "./globals.css";

const bodyFont = DM_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const headingFont = Manrope({ subsets: ["latin"], variable: "--font-heading", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "Semantic Catalog Search | Webytex",
  description: "Find products by what you mean. Compare keyword and local AI search in a small, fictional product catalog. Your search stays on your device.",
  icons: { icon: "/mark.svg" },
  openGraph: {
    title: "Semantic Catalog Search | Webytex",
    description: "Find what you mean. Compare keyword and local AI product search, side by side.",
    images: [{ url: "/article-cover.png", width: 1920, height: 1080, alt: "A search phrase connects to matching products through local AI." }],
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Find what you mean. | Webytex", images: ["/article-cover.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${bodyFont.variable} ${headingFont.variable}`}><body>{children}</body></html>;
}
