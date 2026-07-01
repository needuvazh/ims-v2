## Why

Introduce the Course Catalog core management capability as part of Module 06. ASTI requires a single, bilingual catalog of courses (English and Arabic) to manage curriculum data, assign departments, and enforce status transitions (Draft, InReview, Approved, Published, Archived) in a centralized and standardized manner.

## What Changes

We will introduce the initial Course Catalog models and CRUD APIs, including department-scoped checks, cyclic category checks, bilingual validation, and the refactoring of existing codebase references to courses.

## Capabilities

### New Capabilities
- `course-catalog`: Covers bilingual course category hierarchies, bilingual course creation, updates, and status state machine transitions.

### Modified Capabilities

## Impact

- **Database:** Introduces `CourseCategory`, `CoursePricing` (minimal stub), and `CourseCompletionRule` (minimal stub) tables in `schema.prisma`. Updates the `Course` table to hold bilingual name/description fields, departmentId logical key, categoryId FK, duration metrics, effective dates, status, and audit/version fields. No branchId is added to the Course table to maintain its global definition.
- **Backend:** Adds `packages/course-catalog` package for domain logic, category and course services, repository interfaces, and validation schemas.
- **API:** Exposes `POST /api/v1/courses`, `PUT /api/v1/courses/:id`, `GET /api/v1/courses`, `POST /api/v1/courses/:id/status`, and `POST/GET /api/v1/courses/categories`.
- **UI:** Implements screens `CRS-SCR-001` (List/Dashboard) and `CRS-SCR-002` (Create/Edit Form) in the admin portal, using global catalog lookups.
- **Code Refactor:** Updates existing references from `course.name` to `course.nameEnglish` in seed scripts, E2E tests, and leads pages to prevent build compilation errors.
