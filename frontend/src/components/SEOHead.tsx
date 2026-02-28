import { Helmet } from "react-helmet-async";

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
  title = "Jyvra — Online Java Compiler & Code Playground",
  description = "Write, compile, and run Java code instantly in your browser. Free online Java playground with Monaco Editor and real-time output.",
  canonicalUrl,
  ogImage = "https://jyvra.hostmyidea.me/og-image.png",
  ogType = "website",
  noIndex = false,
}: SEOProps) {
  const robotsPolicy = noIndex
    ? "noindex, nofollow"
    : "index, follow, max-image-preview:large, max-snippet:-1";

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robotsPolicy} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta
        property="og:url"
        content={
          canonicalUrl ||
          (typeof window !== "undefined" ? window.location.href : "")
        }
      />

      {/* Twitter Card */}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
    </Helmet>
  );
}
