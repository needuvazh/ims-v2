## Context

The Course Catalog currently publishes courses to be used internally for batch scheduling and enrollments. There is a public portal that queries published courses, but it lacks visual/multimedia content, category hierarchy traversal, pricing visibility settings, practical instruction indicators, practical testing descriptions, and SEO details. Also, we cannot prevent specific published courses from appearing in the public list.

## Goals / Non-Goals

**Goals:**

- Add flags to control public visibility (`isPubliclyExposed`) and pricing visibility (`showPricingPublicly`).
- Collect public assets and details: banner image, SEO tags (title, description, keywords), practical instruction indicator, practical testing description, and syllabus outline.
- Dynamically build and return the category hierarchy up to the root when retrieving course details.
- Provide a clean and unified editing experience in the admin portal course form.
- Conditionally hide base price, tax percentage, and currency fields in public course list and detail endpoints when `showPricingPublicly = false`.

**Non-Goals:**

- External image file upload handling (the image banner is stored as a URL or absolute path string).
- Multi-language SEO tags (handled as standard text fields/inputs for English/Arabic contexts).
- Modifying authentication/authorization rules for admin catalog actions.

## Decisions

### 1. Database Model Changes

We will add the following columns directly to the `Course` table in PostgreSQL:

- `isPubliclyExposed` (`Boolean`, default `false`)
- `bannerImage` (`String?`)
- `metaTitle` (`String?` limit 255)
- `metaDescription` (`String?`)
- `metaKeywords` (`String?`)
- `syllabusOutline` (`String?`)
- `showPricingPublicly` (`Boolean`, default `true`)
- `hasPracticalInstruction` (`Boolean`, default `false`)
- `practicalTestingDescription` (`String?`)

### 2. Category Hierarchy Traversal

When querying public course details, we need to return the category path from the root category down to the course's category. We will implement an iterative parent-category lookup in `PublicCourseQueryService` that queries parent categories up to the root, preventing infinite loops by checking for cyclic references.

### 3. Exposing Fields in Public APIs

- The `/api/public/courses` and `/api/public/courses/[slug]` endpoints will be updated.
- If `showPricingPublicly` is `false`, the fields `basePrice`, `taxPercentage`, and `currency` are overwritten to `null` before sending the response DTO.
- The `imageUrl` DTO property will map from the new `bannerImage` database column.

### 4. Admin UI Changes

- The course form (`course-form.tsx`) will render a new card named **Public Exposition & SEO Details** to house checkboxes for `isPubliclyExposed`, `showPricingPublicly`, `hasPracticalInstruction`, and inputs for `bannerImage`, `metaTitle`, `metaKeywords`, `metaDescription`, `practicalTestingDescription`, and `syllabusOutline`.

## Risks / Trade-offs

- **Performance**: Fetching category hierarchy iteratively generates one database query per category level. Given category hierarchies are rarely deeper than 3 levels, this is simple and performant enough. We will not use complex recursive SQL CTEs since Prisma handles single-record primary key lookups exceptionally fast.
