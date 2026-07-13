# Performance (CWV) Findings

Score: 55/100

## What Works
- Visual analysis found visible H1, visible CTA, no mobile horizontal scroll, and acceptable touch targets
- Images are served through Next.js image optimization URLs
- Font preloads are declared

## Findings

### Medium: PageSpeed Insights data unavailable due rate limit

The PSI API returned rate-limit errors for both mobile and desktop. No CrUX field data is available because Google API credentials are not configured.

Recommendation: Re-run Lighthouse/PSI with configured API credentials or local Lighthouse in CI, and track LCP, INP, CLS, TTFB, and bundle size per template.

### Medium: Homepage HTML payload and font strategy may pressure LCP

The homepage HTML response was about 137 KB and preloads seven font files. The hero image is large and above the fold. These are common contributors to slower LCP on mobile networks.

Recommendation: Audit font subsets/weights, reduce preloaded fonts to critical variants, set hero image priority/sizes carefully, and measure LCP element timing.

### Low: Dynamic homepage response uses no-store cache headers

The homepage returned Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate, while several static pages return public cache headers. This can reduce edge-cache benefit for the most important SEO landing page.

Recommendation: If the homepage content is public and stable, use static generation or cacheable response headers appropriate for Vercel.
