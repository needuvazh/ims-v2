# AI Search Readiness Findings

Score: 62/100

## What Works
- Pages use clear headings, FAQs, local entity details, and course-specific snippets that can be extracted by AI systems
- Organization and Course schema provide machine-readable entity context
- Contact details are repeated consistently across public pages

## Findings

### Medium: No llms.txt is available

https://ims-asti-uat.vercel.app/llms.txt returned 404. This is not a ranking requirement, but it is increasingly useful for guiding AI crawlers to preferred summary, course, contact, and policy resources.

Recommendation: Add /llms.txt with concise institute overview, canonical course URLs, contact page, certificate verification page, and crawl-use guidance.

### Medium: Citability needs stronger evidence blocks

The site states accreditation, student volume, and partner count, but AI answers benefit from compact, attributed facts that are easy to quote and verify.

Recommendation: Add 'fast facts' sections with dates, accreditations, service areas, course outcomes, and source-backed claims. Link to proof pages where possible.

### Low: No backlink/referring-domain signals found for UAT host

Common Crawl returned no referring-domain metrics for ims-asti-uat.vercel.app. This is expected for a UAT host but means authority signals are absent for this domain.

Recommendation: Use the final branded domain for production, build citations from Google Business Profile, directories, partners, accreditation bodies, and corporate training references.
