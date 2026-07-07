## 1. Database Schema

- [x] 1.1 Add new columns (`isPubliclyExposed`, `bannerImage`, `metaTitle`, `metaDescription`, `metaKeywords`, `syllabusOutline`, `showPricingPublicly`, `hasPracticalInstruction`, `practicalTestingDescription`) to the `Course` model in `packages/database/prisma/schema.prisma`.
- [x] 1.2 Generate and run a Prisma migration for the schema changes using `run_migrate.py`.

## 2. Core Package Implementation

- [x] 2.1 Update the `Course` interface in `packages/course-catalog/src/domain/course.ts`.
- [x] 2.2 Add new fields validation schemas to `CreateCourseSchema` and `UpdateCourseSchema` in `packages/course-catalog/src/domain/validation-schemas.ts`.
- [x] 2.3 Update the `PublicCourseListItemSchema` and `PublicCourseDetailSchema` DTO definitions in `packages/course-catalog/src/domain/public-dtos.ts`.
- [x] 2.4 Update the `create` method in `packages/course-catalog/src/infrastructure/course-repository.ts` to map and persist the new columns.
- [x] 2.5 Update the `CreateCourseInput` interface in `packages/course-catalog/src/application/course-service.ts`.

## 3. Public Queries Implementation

- [x] 3.1 Update the `getPublishedCourses` query in `packages/course-catalog/src/application/public-course-query-service.ts` to filter by `isPubliclyExposed: true` and map `imageUrl` from `bannerImage`.
- [x] 3.2 Implement dynamic `getCategoryHierarchy` lookup helper method in `PublicCourseQueryService`.
- [x] 3.3 Update `getCourseDetail` query in `packages/course-catalog/src/application/public-course-query-service.ts` to fetch and include the category hierarchy, and return all new exposition, SEO, and practical training details.
- [x] 3.4 Implement `showPricingPublicly` filtering in `PublicCourseQueryService` to nullify price/currency details when pricing visibility is toggled off.

## 4. Admin Portal UI

- [x] 4.1 Update defaultValues and onSubmit mappings in `apps/admin-portal/app/(protected)/courses-catalog/_components/course-form.tsx`.
- [x] 4.2 Render the new **Public Exposition & SEO Details** card section in `course-form.tsx` containing inputs/checkboxes for the new fields.

## 5. Verification

- [x] 5.1 Add unit tests in `packages/course-catalog/tests/course-catalog.spec.ts` asserting that `getPublishedCourses` and `getCourseDetail` correctly filter by `isPubliclyExposed`, build category hierarchies, and respect `showPricingPublicly` rules.
- [x] 5.2 Execute typecheck (`pnpm typecheck`), lint (`pnpm lint`), and integration tests (`npx vitest run tests/course-catalog.spec.ts`) to ensure zero regressions.
