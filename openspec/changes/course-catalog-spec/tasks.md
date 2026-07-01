## 1. Database Schema Extensions

- [ ] 1.1 Define `CourseCategory` model in `schema.prisma` with standard audit/version fields.
- [ ] 1.2 Define minimal stub models for `CoursePricing` and `CourseCompletionRule` in `schema.prisma` to allow publishing validators to query database constraints.
- [ ] 1.3 Update `Course` model to include `nameEnglish`, `nameArabic`, `descriptionEnglish`, `descriptionArabic`, `departmentId` (logical key index), `categoryId` (FK), `courseClassification`, `durationType`, `durationValue`, `allowWalkInCompletion`, `status` (Draft/InReview/Approved/Published/Archived), `effectiveStartDate`, `effectiveEndDate`, `createdBy`, `updatedBy`, `deletedBy`, `version`, and soft delete fields. (Do not add branchId to Course).
- [ ] 1.4 Add indexes: `@@index([categoryId])` and `@@index([departmentId])` on `Course`.
- [ ] 1.5 Generate Prisma migrations and apply to the database.

## 2. Domain & Application Logic (packages/course-catalog) and Refactoring

- [ ] 2.1 Create package setup for `course-catalog` including exports and tsconfig.
- [ ] 2.2 Define Zod validation schemas for course creation and updating, verifying Arabic character script regex check (`ERR_CRS_INVALID_ARABIC_SCRIPT`).
- [ ] 2.3 Implement the Course Catalog Application Service with service functions `createCourse`, `updateCourse`, and `transitionCourseStatus`.
- [ ] 2.3a Implement Category Service with functions `createCategory` and `listCategories`.
- [ ] 2.4 Add service validations and check specific error codes:
  - [ ] Name uniqueness within department scope (`ERR_CRS_DUPLICATE_NAME`).
  - [ ] Alphanumeric uppercase format regex check on course code (`ERR_CRS_INVALID_CODE_FORMAT`).
  - [ ] End date after start date validation check (`ERR_CRS_INVALID_DATE_RANGE`).
  - [ ] Sub-category cyclic parent category loop prevention check (`ERR_CRS_CYCLIC_CATEGORY`).
- [ ] 2.5 Ensure mutations publish `COURSE_CREATED` and `COURSE_UPDATED` audit events.
- [ ] 2.6 Refactor legacy course name references across the codebase to use `nameEnglish` to prevent build breaks:
  - [ ] Update seed script `packages/database/prisma/seed.ts` (lines 581-605) to insert `nameEnglish` and seed draft categories.
  - [ ] Update E2E test `tests/e2e/auto-assignment.spec.ts` (lines 244-250) to use `nameEnglish`.
  - [ ] Update `leads/page.tsx` course selector select query.
  - [ ] Update `leads/[id]/edit/page.tsx` course selector select query.
  - [ ] Update `leads/create/page.tsx` course selector select query.
  - [ ] Update `leads/[id]/page.tsx` mapping logic.

## 3. API Delivery

- [ ] 3.1 Expose `POST /api/v1/courses` route handler, validating input shape and verifying permissions (`course.catalog.create`).
- [ ] 3.1a Expose `POST /api/v1/courses/categories` and `GET /api/v1/courses/categories` route handlers for taxonomy management.
- [ ] 3.2 Expose `PUT /api/v1/courses/:id` route handler, enforcing immutability rules and verifying permissions (`course.catalog.update`).
- [ ] 3.3 Expose `GET /api/v1/courses` list route (global lookup, no branch scoping block).
- [ ] 3.4 Expose `POST /api/v1/courses/:id/status` transition route, validating activation prerequisite rules (pricing/rules queries against stub tables) and verifying permissions (`course.catalog.publish` or `course.catalog.archive` depending on target status).

## 4. Admin Portal UI Components

- [ ] 4.1 Implement `CRS-SCR-001` (Course Catalog List & Dashboard) in the admin portal (including layout filters, KPI metrics, dynamic directionality, and category taxonomy).
- [ ] 4.2 Implement `CRS-SCR-002` (Create/Edit Course Form) with field validations, Arabic script checks, description input fields (English/Arabic), `allowWalkInCompletion` toggle switch, and permission-based visibility.

## 5. Automated Tests

- [ ] 5.1 Write unit tests for Course Catalog Service checking duplicate code, parent cyclic loop prevention, invalid date range, invalid format, and name validation within department.
- [ ] 5.2 Write integration tests for API handlers verifying authentication, validation, and permission checks.
- [ ] 5.3 Write e2e tests using Playwright for course creation and editing forms.

## 6. Verification and Project Status

- [ ] 6.1 Update `docs/project-status.md` to move Course Catalog from Planned to In Progress.
