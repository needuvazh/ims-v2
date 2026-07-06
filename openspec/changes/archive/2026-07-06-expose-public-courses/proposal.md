## Why

Currently, all published courses are returned in the course catalog query, but we need to control which courses are displayed on public pages (non-authentication flow). Additionally, the public portal needs rich visual content, category hierarchy traversal, pricing visibility settings, practical training indicators, practical testing descriptions, and SEO details.

## What Changes

- Add a flag `isPubliclyExposed` to determine if a course is listed on the public catalog.
- Collect rich public metadata for courses: course banner image, SEO meta tags (title, description, keywords), and syllabus outline.
- Collect course category hierarchy dynamically (traversing from root category down to the course's category) to render breadcrumbs and structured directories on public course pages.
- Add dynamic flags for public exposition details: `showPricingPublicly`, `hasPracticalInstruction`, and `practicalTestingDescription` (with text description).
- Hide prices in public listings if `showPricingPublicly` is disabled.
- Extend the admin portal course creation/editing forms to collect and update these details.
- Filter out non-publicly exposed courses in the public/non-authenticated API routes and DTO mappings.

## Capabilities

### New Capabilities

### Modified Capabilities
- course-catalog: Add public exposition controls, dynamic category hierarchy traversal, pricing display toggles, practical training indicators, practical testing details, and SEO metadata configuration for courses.

## Impact

- **Database**: `Course` model schema update and migration.
- **Monorepo Packages**:
  - `@ims/course-catalog` (types, zod validation schemas, repositories, queries, and DTOs).
- **Admin Portal**:
  - Course form UI component (`course-form.tsx`) to add editing inputs for the new fields.
  - Server actions and routes to pass parameters and handle DB writes.
- **Public API**:
  - `/api/public/courses` and `/api/public/courses/[slug]` routes to filter courses and map additional fields (including hierarchy breadcrumbs and conditionally hidden pricing).
