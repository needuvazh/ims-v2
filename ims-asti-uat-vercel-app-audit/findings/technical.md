# Technical SEO Findings

Score: 72/100

## What Works
- robots.txt is available and references sitemap.xml
- HTTPS and HSTS are enabled through Vercel
- No crawl-time 5xx or redirect-chain failures were found across 20 discovered pages

## Findings

### High: Robots disallows auth paths, but crawler-visible links still expose auth utility pages

robots.txt disallows /sign-in, /forgot-password, /activate-account, and /mandatory-password-change, but internal links from /login and auth pages expose them. These pages return 200 and contain noindex, which avoids indexing but still wastes crawl paths and exposes demo-login text.

Recommendation: Remove public/internal links to auth utility pages from the marketing crawl path, keep noindex, and consider returning authenticated-only or gated experiences for operational routes.

### High: Several public utility pages use the homepage canonical

/privacy and /terms return canonical https://ims-asti-uat.vercel.app even though they are indexable 200 pages. /verify also uses homepage canonical while noindex. Incorrect canonicalization can consolidate signals into the wrong URL and suppress the intended page.

Recommendation: Set self-referencing canonicals for indexable legal pages. For noindex pages, either omit canonical or use a deliberate self-canonical if the page should remain accessible but not indexed.

### Medium: Security headers are incomplete

HSTS is present, but crawl headers expose X-Powered-By: Next.js on some dynamic routes and do not show common hardening headers such as Content-Security-Policy, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy.

Recommendation: Add platform-wide security headers in Next.js/Vercel config and remove X-Powered-By where possible.

### Medium: UAT Vercel hostname is indexable

The audited domain is ims-asti-uat.vercel.app. Public marketing pages are indexable and included in sitemap.xml. If this is not the final production domain, search engines may index a staging/UAT URL.

Recommendation: If this is a staging/UAT environment, apply site-wide noindex and remove it from public sitemaps. If it is production, migrate to the final branded domain and 301 redirect the Vercel host.
