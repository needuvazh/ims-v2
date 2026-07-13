# On-Page SEO Findings

Score: 70/100

## What Works
- Most primary pages have readable title tags and meta descriptions
- Public pages generally use a single visible H1
- Internal navigation exposes all major course pages from the homepage and footer

## Findings

### Medium: Title tags are over length or generic on 5 pages

Examples include About (61 chars), Contact (63 chars), and several utility/auth pages using the generic title 'Al-Saud Training Institute'. Long titles may truncate; generic titles reduce query relevance.

Recommendation: Keep unique page titles around 45-60 characters and include high-intent local modifiers such as Muscat, Oman, forklift training, crane training, or certificate verification where relevant.

### Medium: 6 pages have missing or multiple H1s

/verify has no H1 in the static HTML, while auth pages such as /sign-in, /forgot-password, /activate-account, and /mandatory-password-change contain two H1s.

Recommendation: Use exactly one descriptive H1 per rendered page. For auth/utility pages, demote decorative hero statements to paragraph or H2 text.

### Low: Meta descriptions are reused on operational pages

Auth, verification, privacy, and terms pages reuse the default institute description. For pages that remain indexable, this weakens snippet relevance.

Recommendation: Use page-specific descriptions for all indexable pages and keep noindex utility pages out of sitemap/internal marketing links.
