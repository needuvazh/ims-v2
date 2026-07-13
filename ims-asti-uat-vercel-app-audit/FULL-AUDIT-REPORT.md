# Full Website SEO Audit: ims-asti-uat.vercel.app

Audit date: 2026-07-13
Audited URL: https://ims-asti-uat.vercel.app
Crawl scope: same-host, robots-aware, 500 page cap, redirects followed, 30s timeout, 5 concurrent requests, 1s delay

## Executive Summary

Overall SEO Health Score: **69/100**

Business type detected: **Local vocational training institute / heavy machinery and safety training center in Muscat, Oman**

The site has a solid public-course foundation: clear local positioning, crawlable course pages, working sitemap, useful schema on courses, visible contact details, and good mobile visual checks. The biggest SEO risks are production-indexing intent on a UAT Vercel host, incorrect canonicalization on utility/legal pages, discoverable auth utility pages, thin/generic content on supporting pages, and missing external proof/authority signals.

## Top 5 Critical Issues

- Incorrect homepage canonicals on indexable legal pages and noindex utility pages
- Auth utility pages are publicly discoverable despite robots disallow/noindex
- Thin content on 9 discovered pages, including legal and utility pages
- Incomplete security headers and exposed X-Powered-By on some routes
- No llms.txt and limited verifiable E-E-A-T/citation proof blocks

## Top 5 Quick Wins

- Set self-referencing canonicals for /privacy and /terms
- Remove public links to auth utility pages from marketing navigation/crawl paths
- Add one H1 per utility page or demote decorative hero text
- Create /llms.txt with canonical course/contact resources
- Add geo/hasMap/sameAs/priceRange to LocalBusiness schema

## Crawl Summary

- Pages discovered: 20
- robots.txt: 200 with sitemap reference
- sitemap.xml: 200
- sitemap_index.xml: 404
- HTTP 5xx errors: 0
- PSI/Lighthouse: rate-limited, no usable metrics returned
- Google API credentials: not configured
- Moz/Bing backlink credentials: not configured
- Drift baseline: not found

## Page Inventory

| Path | Status | Title | Words | H1 Count | Schema Blocks | Canonical |
|---|---:|---|---:|---:|---:|---|
| / | 200 | Al-Saud Training Institute | 799 | 1 | 2 | - |
| /about | 200 | About Al-Saud Training Institute \| Al-Saud Training Institute | 505 | 1 | 1 | /about |
| /contact-us | 200 | Contact Al-Saud Training Institute \| Al-Saud Training Institute | 323 | 1 | 2 | /contact-us |
| /courses | 200 | Courses at Al-Saud Training Institute \| Al-Saud Training Institute | 401 | 1 | 1 | /courses |
| /elevated-work-platforms-2 | 200 | Elevated Work Platforms Training \| Al-Saud Training Institute | 453 | 1 | 2 | /elevated-work-platforms-2 |
| /events | 200 | Upcoming Training Events \| Al-Saud Training Institute | 269 | 1 | 1 | /events |
| /forklift-operator-training | 200 | Forklift Operator Training \| Al-Saud Training Institute | 449 | 1 | 2 | /forklift-operator-training |
| /forklift-operator-training-course | 200 | Forklift Endorsement Course \| Al-Saud Training Institute | 456 | 1 | 2 | /forklift-operator-training-course |
| /login | 200 | Al-Saud Training Institute | 103 | 2 | 0 | - |
| /other-courses-available | 200 | Other Courses Available \| Al-Saud Training Institute | 454 | 1 | 2 | /other-courses-available |
| /overhead-gantry-crane-operation | 200 | Overhead Gantry Crane Operation \| Al-Saud Training Institute | 451 | 1 | 2 | /overhead-gantry-crane-operation |
| /privacy | 200 | Al-Saud Training Institute | 145 | 1 | 1 | - |
| /terms | 200 | Al-Saud Training Institute | 145 | 1 | 1 | - |
| /training-facilities | 200 | Training Facilities in Muscat \| Al-Saud Training Institute | 369 | 1 | 1 | /training-facilities |
| /truck-mounted-crane | 200 | Truck Mounted Crane Training \| Al-Saud Training Institute | 452 | 1 | 2 | /truck-mounted-crane |
| /verify | 200 | Al-Saud Training Institute | 101 | 0 | 1 | - |
| /activate-account | 200 | Al-Saud Training Institute | 66 | 2 | 0 | - |
| /forgot-password | 200 | Al-Saud Training Institute | 62 | 2 | 0 | - |
| /mandatory-password-change | 200 | Mandatory Password Change \| IMS Admin \| Al-Saud Training Institute | 127 | 2 | 0 | - |
| /sign-in | 200 | Al-Saud Training Institute | 103 | 2 | 0 | - |

## Category Scores

| Category | Score | Weight | Weighted Contribution |
|---|---:|---:|---:|
| Technical SEO | 72 | 22% | 15.84 |
| Content Quality | 68 | 23% | 15.64 |
| On-Page SEO | 70 | 20% | 14.00 |
| Schema / Structured Data | 76 | 10% | 7.60 |
| Performance (CWV) | 55 | 10% | 5.50 |
| AI Search Readiness | 62 | 10% | 6.20 |
| Images | 86 | 5% | 4.30 |
| **Total** | **69** | **100%** | **69.08** |

## Technical SEO

Score: **72/100**

What works:
- robots.txt is available and references sitemap.xml
- HTTPS and HSTS are enabled through Vercel
- No crawl-time 5xx or redirect-chain failures were found across 20 discovered pages

Findings:
- **High - Robots disallows auth paths, but crawler-visible links still expose auth utility pages**: robots.txt disallows /sign-in, /forgot-password, /activate-account, and /mandatory-password-change, but internal links from /login and auth pages expose them. These pages return 200 and contain noindex, which avoids indexing but still wastes crawl paths and exposes demo-login text. Recommendation: Remove public/internal links to auth utility pages from the marketing crawl path, keep noindex, and consider returning authenticated-only or gated experiences for operational routes.
- **High - Several public utility pages use the homepage canonical**: /privacy and /terms return canonical https://ims-asti-uat.vercel.app even though they are indexable 200 pages. /verify also uses homepage canonical while noindex. Incorrect canonicalization can consolidate signals into the wrong URL and suppress the intended page. Recommendation: Set self-referencing canonicals for indexable legal pages. For noindex pages, either omit canonical or use a deliberate self-canonical if the page should remain accessible but not indexed.
- **Medium - Security headers are incomplete**: HSTS is present, but crawl headers expose X-Powered-By: Next.js on some dynamic routes and do not show common hardening headers such as Content-Security-Policy, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy. Recommendation: Add platform-wide security headers in Next.js/Vercel config and remove X-Powered-By where possible.
- **Medium - UAT Vercel hostname is indexable**: The audited domain is ims-asti-uat.vercel.app. Public marketing pages are indexable and included in sitemap.xml. If this is not the final production domain, search engines may index a staging/UAT URL. Recommendation: If this is a staging/UAT environment, apply site-wide noindex and remove it from public sitemaps. If it is production, migrate to the final branded domain and 301 redirect the Vercel host.

## Content Quality

Score: **68/100**

What works:
- Homepage, About, Courses, Facilities, and course detail pages provide clear training-institute positioning
- Course pages include practical details, target audiences, outcomes, prerequisites, FAQs, and related-course links
- Local contact details and institute history are visible across pages

Findings:
- **High - 9 discovered pages have fewer than 300 words**: Thin pages include legal pages, verification/auth pages, and some operational utility pages. Thin public pages reduce topical depth and can dilute perceived quality when indexed. Recommendation: Expand indexable pages such as Privacy and Terms into complete policies. Keep auth/utility pages noindex and remove them from public discovery.
- **Medium - E-E-A-T evidence is present but underdeveloped**: The site mentions NPORS accreditation, 20+ years, 25k+ students, and Muscat location, but lacks detailed instructor credentials, accreditation proof pages, certificate samples, safety governance, client logos/case studies, or verifiable review/testimonial sources. Recommendation: Add an accreditation/trust page, instructor profile sections, corporate client proof, safety standards followed, and testimonial attribution where permitted.
- **Medium - Course content is templated across similar pages**: Course pages are useful but repeat the same page structure, CTA language, comparison blocks, pricing text, and related-course modules. This can look mechanically generated without deeper course-specific details. Recommendation: Add unique course-specific syllabus modules, equipment examples, assessment criteria, duration ranges, eligibility, PPE requirements, and workplace outcomes for each course.

## On-Page SEO

Score: **70/100**

What works:
- Most primary pages have readable title tags and meta descriptions
- Public pages generally use a single visible H1
- Internal navigation exposes all major course pages from the homepage and footer

Findings:
- **Medium - Title tags are over length or generic on 5 pages**: Examples include About (61 chars), Contact (63 chars), and several utility/auth pages using the generic title 'Al-Saud Training Institute'. Long titles may truncate; generic titles reduce query relevance. Recommendation: Keep unique page titles around 45-60 characters and include high-intent local modifiers such as Muscat, Oman, forklift training, crane training, or certificate verification where relevant.
- **Medium - 6 pages have missing or multiple H1s**: /verify has no H1 in the static HTML, while auth pages such as /sign-in, /forgot-password, /activate-account, and /mandatory-password-change contain two H1s. Recommendation: Use exactly one descriptive H1 per rendered page. For auth/utility pages, demote decorative hero statements to paragraph or H2 text.
- **Low - Meta descriptions are reused on operational pages**: Auth, verification, privacy, and terms pages reuse the default institute description. For pages that remain indexable, this weakens snippet relevance. Recommendation: Use page-specific descriptions for all indexable pages and keep noindex utility pages out of sitemap/internal marketing links.

## Schema / Structured Data

Score: **76/100**

What works:
- Organization, EducationalOrganization, LocalBusiness, WebSite, Course, BreadcrumbList, and FAQPage JSON-LD are present
- Course pages include provider linkage and breadcrumb markup
- Local business schema includes phone, email, postal address, opening hours, and languages

Findings:
- **Medium - LocalBusiness schema could be richer for local rankings**: The LocalBusiness entity lacks geo coordinates, hasMap/sameAs profiles, image arrays, priceRange, areaServed details beyond country, and review/aggregateRating where compliant. Recommendation: Add geo, hasMap, sameAs social/GBP links, image, priceRange, areaServed including Muscat/Oman, and reviewed-by/accreditation properties where verifiable.
- **Medium - Non-course pages miss page-specific schema opportunities**: About, Contact, Facilities, Events, Privacy, Terms, Verify, and auth pages primarily inherit Organization/WebSite schema only. Recommendation: Add AboutPage, ContactPage, Place/TrainingCenter, Event where real events exist, and WebPage schema with breadcrumb for primary pages.
- **Info - Schema validation was syntax-level only**: JSON-LD blocks were found and parseable from crawl samples, but live Rich Results or Schema.org validator checks were not run from this environment. Recommendation: Validate representative templates in Google Rich Results Test and Schema.org validator before launch.

## Performance (CWV)

Score: **55/100**

What works:
- Visual analysis found visible H1, visible CTA, no mobile horizontal scroll, and acceptable touch targets
- Images are served through Next.js image optimization URLs
- Font preloads are declared

Findings:
- **Medium - PageSpeed Insights data unavailable due rate limit**: The PSI API returned rate-limit errors for both mobile and desktop. No CrUX field data is available because Google API credentials are not configured. Recommendation: Re-run Lighthouse/PSI with configured API credentials or local Lighthouse in CI, and track LCP, INP, CLS, TTFB, and bundle size per template.
- **Medium - Homepage HTML payload and font strategy may pressure LCP**: The homepage HTML response was about 137 KB and preloads seven font files. The hero image is large and above the fold. These are common contributors to slower LCP on mobile networks. Recommendation: Audit font subsets/weights, reduce preloaded fonts to critical variants, set hero image priority/sizes carefully, and measure LCP element timing.
- **Low - Dynamic homepage response uses no-store cache headers**: The homepage returned Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate, while several static pages return public cache headers. This can reduce edge-cache benefit for the most important SEO landing page. Recommendation: If the homepage content is public and stable, use static generation or cacheable response headers appropriate for Vercel.

## AI Search Readiness

Score: **62/100**

What works:
- Pages use clear headings, FAQs, local entity details, and course-specific snippets that can be extracted by AI systems
- Organization and Course schema provide machine-readable entity context
- Contact details are repeated consistently across public pages

Findings:
- **Medium - No llms.txt is available**: https://ims-asti-uat.vercel.app/llms.txt returned 404. This is not a ranking requirement, but it is increasingly useful for guiding AI crawlers to preferred summary, course, contact, and policy resources. Recommendation: Add /llms.txt with concise institute overview, canonical course URLs, contact page, certificate verification page, and crawl-use guidance.
- **Medium - Citability needs stronger evidence blocks**: The site states accreditation, student volume, and partner count, but AI answers benefit from compact, attributed facts that are easy to quote and verify. Recommendation: Add 'fast facts' sections with dates, accreditations, service areas, course outcomes, and source-backed claims. Link to proof pages where possible.
- **Low - No backlink/referring-domain signals found for UAT host**: Common Crawl returned no referring-domain metrics for ims-asti-uat.vercel.app. This is expected for a UAT host but means authority signals are absent for this domain. Recommendation: Use the final branded domain for production, build citations from Google Business Profile, directories, partners, accreditation bodies, and corporate training references.

## Images

Score: **86/100**

What works:
- Public marketing and course pages had image alt text present in the crawl
- Images are emitted through Next.js optimized image routes
- No visual text-overflow or overlap was detected in automated visual analysis

Findings:
- **Low - Auth utility pages have missing image alt text**: 5 pages had missing alt text, concentrated on /sign-in, /forgot-password, /activate-account, /mandatory-password-change, and likely related auth templates. Recommendation: Add decorative empty alt attributes for decorative images or descriptive alt text for meaningful images in auth templates.
- **Info - Image asset dimensions/weights need Lighthouse verification**: The crawl confirmed optimized image routes but did not include byte-level image audit by asset. PSI was rate-limited. Recommendation: Run Lighthouse image diagnostics once PSI/local Lighthouse is available and check modern formats, right-sized images, and preload only for the LCP image.

## Specialist Notes

- Local SEO applies because the business is a brick-and-mortar/local service training institute in Muscat. GBP/map-pack data could not be enriched without Google/DataForSEO credentials.
- E-commerce analysis was not run because no product/cart/checkout/catalog-commerce intent was detected.
- Content cluster analysis was not run because no blog, editorial hub, or pillar-topic architecture was found.
- Drift analysis was not run because no baseline exists for this URL.

## Evidence Artifacts

- Structured audit data: `audit-data.json`
- Category findings: `findings/`
- Screenshots: `screenshots/ims-asti-uat_vercel_app_desktop.png`, `screenshots/ims-asti-uat_vercel_app_laptop.png`, `screenshots/ims-asti-uat_vercel_app_tablet.png`, `screenshots/ims-asti-uat_vercel_app_mobile.png`

## Limitations

- PageSpeed Insights was rate-limited, so CWV scoring is conservative and evidence-based rather than metric-based.
- Google Search Console, GA4, CrUX, and URL Inspection data were unavailable due missing credentials.
- Moz/Bing backlink credentials were unavailable; Common Crawl fallback found no authority data for the UAT host.
- Schema was inspected from crawled JSON-LD, not submitted to Google Rich Results Test from this environment.
