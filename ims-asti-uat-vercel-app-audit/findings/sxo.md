# Search Experience Findings

Score: 70/100

## What Works
- Primary search intent for forklift/crane/operator training is satisfied with course pages, contact CTAs, FAQs, and comparison links.
- Local intent is supported by Muscat/Oman contact details and facility content.

## Findings

### Medium: Commercial-intent visitors need clearer decision details

Course pages invite enquiries but often hide price, exact duration, batch dates, eligibility, certificate type, and assessment details behind 'Please enquire'. This may reduce conversion and search satisfaction for high-intent users.

Recommendation: Add ranges or structured availability/pricing guidance where exact values vary. Include `Who should take this`, `What certificate you receive`, `Duration`, `Assessment`, and `Next available batch` sections.

### Medium: Certificate verification page is not crawl-meaningful in static HTML

The `/verify` page renders `Loading verification page...`, has no H1, and is noindex. This is acceptable for a utility page, but users landing from certificate QR codes need immediate trust cues.

Recommendation: Render a static H1 and explanation before the interactive verification form, even if the page remains noindex.
