# Schema / Structured Data Findings

Score: 76/100

## What Works
- Organization, EducationalOrganization, LocalBusiness, WebSite, Course, BreadcrumbList, and FAQPage JSON-LD are present
- Course pages include provider linkage and breadcrumb markup
- Local business schema includes phone, email, postal address, opening hours, and languages

## Findings

### Medium: LocalBusiness schema could be richer for local rankings

The LocalBusiness entity lacks geo coordinates, hasMap/sameAs profiles, image arrays, priceRange, areaServed details beyond country, and review/aggregateRating where compliant.

Recommendation: Add geo, hasMap, sameAs social/GBP links, image, priceRange, areaServed including Muscat/Oman, and reviewed-by/accreditation properties where verifiable.

### Medium: Non-course pages miss page-specific schema opportunities

About, Contact, Facilities, Events, Privacy, Terms, Verify, and auth pages primarily inherit Organization/WebSite schema only.

Recommendation: Add AboutPage, ContactPage, Place/TrainingCenter, Event where real events exist, and WebPage schema with breadcrumb for primary pages.

### Info: Schema validation was syntax-level only

JSON-LD blocks were found and parseable from crawl samples, but live Rich Results or Schema.org validator checks were not run from this environment.

Recommendation: Validate representative templates in Google Rich Results Test and Schema.org validator before launch.
