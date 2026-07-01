## 1. Database Schema Extensions

- [x] 1.1 Define `CourseCategory` model in `schema.prisma` with standard audit/version fields.
- [x] 1.2 Define minimal stub models for `CoursePricing` and `CourseCompletionRule` in `schema.prisma` to allow publishing validators to query database constraints.
- [x] 1.3 Update `Course` model to include `nameEnglish`, `nameArabic`, `descriptionEnglish`, `descriptionArabic`, `departmentId` (logical key index), `categoryId` (FK), `courseClassification`, `durationType`, `durationValue`, `allowWalkInCompletion`, `status` (Draft/InReview/Approved/Published/Archived), `effectiveStartDate`, `effectiveEndDate`, `createdBy`, `updatedBy`, `deletedBy`, `version`, and soft delete fields. (Do not add branchId to Course).
- [x] 1.4 Add indexes: `@@index([categoryId])` and `@@index([departmentId])` on `Course`.
- [x] 1.5 Generate Prisma migrations and apply to the database.

## 2. Domain & Application Logic (packages/course-catalog) and Refactoring

- [x] 2.1 Create package setup for `course-catalog` including exports and tsconfig.
- [x] 2.2 Define Zod validation schemas for course creation and updating, verifying Arabic character script regex check (`ERR_CRS_INVALID_ARABIC_SCRIPT`).
- [x] 2.3 Implement the Course Catalog Application Service with service functions `createCourse`, `updateCourse`, and `transitionCourseStatus`.
- [x] 2.3a Implement Category Service with functions `createCategory` and `listCategories`.
- [x] 2.4 Add service validations and check specific error codes:
  - [x] Name uniqueness within department scope (`ERR_CRS_DUPLICATE_NAME`).
  - [x] Alphanumeric uppercase format regex check on course code (`ERR_CRS_INVALID_CODE_FORMAT`).
  - [x] End date after start date validation check (`ERR_CRS_INVALID_DATE_RANGE`).
  - [x] Sub-category cyclic parent category loop prevention check (`ERR_CRS_CYCLIC_CATEGORY`).
- [x] 2.5 Ensure mutations publish `COURSE_CREATED` and `COURSE_UPDATED` audit events.
- [x] 2.6 Refactor legacy course name references across the codebase to use `nameEnglish` to prevent build breaks:
  - [x] Update seed script `packages/database/prisma/seed.ts` (lines 581-605) to insert `nameEnglish` and seed draft categories.
  - [x] Update E2E test `tests/e2e/auto-assignment.spec.ts` (lines 244-250) to use `nameEnglish`.
  - [x] Update `leads/page.tsx` course selector select query.
  - [x] Update `leads/[id]/edit/page.tsx` course selector select query.
  - [x] Update `leads/create/page.tsx` course selector select query.
  - [x] Update `leads/[id]/page.tsx` mapping logic.

## 3. API Delivery

- [x] 3.1 Expose `POST /api/v1/courses` route handler, validating input shape and verifying permissions (`course.catalog.create`).
- [x] 3.1a Expose `POST /api/v1/courses/categories` and `GET /api/v1/courses/categories` route handlers for taxonomy management.
- [x] 3.2 Expose `PUT /api/v1/courses/:id` route handler, enforcing immutability rules and verifying permissions (`course.catalog.update`).
- [x] 3.3 Expose `GET /api/v1/courses` list route (global lookup, no branch scoping block).
- [x] 3.4 Expose `POST /api/v1/courses/:id/status` transition route, validating activation prerequisite rules (pricing/rules queries against stub tables) and verifying permissions (`course.catalog.publish` or `course.catalog.archive` depending on target status).

## 4. Admin Portal UI Components

- [x] 4.1 Implement `CRS-SCR-001` (Course Catalog List & Dashboard) in the admin portal (including layout filters, KPI metrics, dynamic directionality, and category taxonomy).
- [x] 4.2 Implement `CRS-SCR-002` (Create/Edit Course Form) with field validations, Arabic script checks, description input fields (English/Arabic), `allowWalkInCompletion` toggle switch, and permission-based visibility.

## 5. Automated Tests

- [x] 5.1 Write unit tests for Course Catalog Service checking duplicate code, parent cyclic loop prevention, invalid date range, invalid format, and name validation within department.
- [x] 5.2 Write integration tests for API handlers verifying authentication, validation, and permission checks.
- [x] 5.3 Write e2e tests using Playwright for course creation and editing forms.

## 6. Verification and Project Status

- [x] 6.1 Update `docs/project-status.md` to move Course Catalog from Planned to In Progress.
