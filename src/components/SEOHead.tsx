import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
}

/**
 * SEOHead — Dynamically updates document head meta tags for SPA pages.
 * Follows Google's latest SEO guidelines for SPAs.
 *
 * Usage:
 *   <SEOHead title="My Page" description="Description here" />
 */
export function SEOHead({
  title = "JavaRena — Online Java Compiler & Code Playground",
  description = "Write, compile, and run Java code instantly in your browser. Free online Java playground with Monaco Editor and real-time output.",
  canonicalUrl,
  ogImage = "https://javarena.dev/og-image.png",
  ogType = "website",
  noIndex = false,
}: SEOProps) {
  useEffect(() => {
    // Update title
    document.title = title;

    // Helper to set or create meta tags
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(
        `meta[${attr}="${key}"]`,
      ) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Standard SEO meta
    setMeta("name", "description", description);
    if (noIndex) {
      setMeta("name", "robots", "noindex, nofollow");
    } else {
      setMeta(
        "name",
        "robots",
        "index, follow, max-image-preview:large, max-snippet:-1",
      );
    }

    // Open Graph
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", ogType);
    if (ogImage) setMeta("property", "og:image", ogImage);
    setMeta("property", "og:url", canonicalUrl || window.location.href);

    // Twitter Card
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    if (ogImage) setMeta("name", "twitter:image", ogImage);

    // Canonical URL
    let canonical = document.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null;
    if (canonicalUrl) {
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.appendChild(canonical);
      }
      canonical.setAttribute("href", canonicalUrl);
    }

    // Cleanup: restore defaults on unmount
    return () => {
      document.title = "JavaRena — Online Java Compiler & Code Playground";
    };
  }, [title, description, canonicalUrl, ogImage, ogType, noIndex]);

  return null;
}
