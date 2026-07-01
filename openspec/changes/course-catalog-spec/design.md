## Context

The system currently lacks a structured Course Catalog. We need to introduce the database tables (`CourseCategory`, `Course`, and minimal stubs for `CoursePricing` and `CourseCompletionRule`), implement core domain logic, repository patterns, API handlers, UI admin screens, and refactor existing CRM modules that reference the legacy `Course` structure.

## Goals / Non-Goals

**Goals:**
- Implement `Course` (updated) and `CourseCategory` (new) models in PostgreSQL.
- Enforce strict bilingual name validation, course code format validation, and department-scoped name uniqueness.
- Provide a clear lifecycle state machine (Draft -> InReview -> Approved -> Published -> Archived).
- Implement minimal DB stub tables for `CoursePricing` and `CourseCompletionRule` to allow publishing validation checks to compile and pass.
- Maintain global access for catalog items (no branch-scoping at the course catalog level; courses are global catalog templates visible across all branches).
- Refactor all existing references to `course.name` across CRM pages, seeding scripts, and E2E tests to prevent build breaks.

**Non-Goals:**
- Online payment gateway integration.
- Full Course pricing and completion rules CRUD and UI configurations (deferred to subsequent changes).
- Front-end client-facing course page edits (CMS) or student login portals.

## Decisions

### 1. Database Schema
We will add `CourseCategory`, `CoursePricing` (minimal stub), `CourseCompletionRule` (minimal stub), and update the existing `Course` model in `packages/database/prisma/schema.prisma`.
*   **`CourseCategory`** includes `code` (unique), `nameEnglish`, `nameArabic`, `description`, and a self-referencing `parentCategoryId` FK. It contains standard audit/version fields and status.
*   **`Course`** is a **global entity** without a `branchId` column. It includes `courseCode` (unique, uppercase alphanumeric check), `nameEnglish`, `nameArabic`, `descriptionEnglish`, `descriptionArabic`, logical reference `departmentId` (without physical foreign key), `categoryId` (FK to `CourseCategory.id`), and metadata fields (`durationType`, `durationValue`, `status`, `effectiveStartDate`, `effectiveEndDate`, `allowWalkInCompletion` etc.), along with full audit columns (`createdBy`, `updatedBy`, `deletedBy`), soft-delete status, and optimistic lock `version`.
*   **`CoursePricing` / `CourseCompletionRule`** are added as minimal stub tables to support the validation queries during course publishing.
*   Standard indexes `@@index([categoryId])` and logical key index `@@index([departmentId])` will be added to `Course`.

### 2. Domain & Application Logic
*   Create `packages/course-catalog` exposing application services: `createCourse`, `updateCourse`, `transitionCourseStatus`, `createCategory`, and `listCategories`.
*   Sub-category cyclic mapping check: Before creating or updating a category, we will recursively traverse parents to verify that the category's ID does not appear in its own parent tree.
*   Domain invariants will be validated inside the application service layer and throw specific FRD error codes:
    - **Course Code Format:** Verifies alphanumeric uppercase format `/^[A-Z0-9-]+$/` (length 3-20), throwing `ERR_CRS_INVALID_CODE_FORMAT`.
    - **Date Range:** Verifies `effectiveEndDate > effectiveStartDate` (if provided), throwing `ERR_CRS_INVALID_DATE_RANGE`.
    - **Bilingual Scripts:** Verifies Arabic fields contain only Arabic script, throwing `ERR_CRS_INVALID_ARABIC_SCRIPT`.
    - **Name Uniqueness:** Verifies name is unique within the `departmentId` + `name` scope globally, throwing `ERR_CRS_DUPLICATE_NAME`.
*   Transactions will wrap changes, and mutations will publish audit events like `COURSE_CREATED` and `COURSE_UPDATED` to `AuditLog`.
*   Course publishing (`Draft -> InReview -> Approved -> Published`) will perform check queries against `CoursePricing` and `CourseCompletionRule` tables to verify configurations exist.

### 3. API Delivery
*   Zod validation checks format at the boundary. Request validation restricts non-Arabic script input for Arabic names.
*   Permissions checks: `course.catalog.view` (read), `course.catalog.create` (write), `course.catalog.update` (update), `course.catalog.publish` (status transitions like InReview/Approved/Published), and `course.catalog.archive` (logical archiving to Archived status).
*   **Branch Scoping Filter:** None. Courses are global catalog definitions visible across all branches. No branch scoping filter is applied at the course catalog list level.

### 4. Codebase Refactoring
*   Existing CRM leads pages (`leads/page.tsx`, `leads/create/page.tsx`, `leads/[id]/edit/page.tsx`) query `prisma.course.findMany({ select: { name: true } })`. These must be refactored to select `nameEnglish` and map properties correctly.
*   `seed.ts` and E2E test `auto-assignment.spec.ts` must be refactored to match the new `Course` properties (using `nameEnglish` instead of `name` and seeding draft categories).

## Risks / Trade-offs

- **Soft-Delete Cascade:** Deactivating or archiving a course does not trigger native cascading in Prisma. We check associated active batches programmatically inside the application service before allowing transition to `Archived`.
