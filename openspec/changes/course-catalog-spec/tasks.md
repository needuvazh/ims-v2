## 1. Database Schema Extensions

- [ ] 1.1 Define `CourseCategory` model in `schema.prisma`.
- [ ] 1.2 Update `Course` model to include `nameEnglish`, `nameArabic`, `descriptionEnglish`, `descriptionArabic`, `departmentId` (logical key index), `branchId` (logical reference index to Branch), `categoryId` (FK), `courseClassification`, `durationType`, `durationValue`, `allowWalkInCompletion`, `status`, `effectiveStartDate`, and `effectiveEndDate`.
- [ ] 1.3 Add indexes: `@@index([categoryId])`, `@@index([branchId])`, and `@@index([departmentId])` on `Course`.
- [ ] 1.4 Generate Prisma migrations and apply to the database.

## 2. Domain & Application Logic (packages/course-catalog)

- [ ] 2.1 Create package setup for `course-catalog` including exports and tsconfig.
- [ ] 2.2 Define Zod validation schemas for course creation and updating, verifying Arabic character regex check.
- [ ] 2.3 Implement the Course Catalog Application Service with service functions `createCourse`, `updateCourse`, and `transitionCourseStatus`.
- [ ] 2.4 Add service checks for name uniqueness within branch/dept, sub-category cyclic hierarchy loop prevention, and state transitions constraints.
- [ ] 2.5 Ensure mutations publish `COURSE_CREATED` and `COURSE_UPDATED` audit events.

## 3. API Delivery

- [ ] 3.1 Expose `POST /api/v1/courses` route handler, validating input shape and verifying permissions (`course.catalog.create`).
- [ ] 3.2 Expose `PUT /api/v1/courses/:id` route handler, enforcing immutability rules and verifying permissions (`course.catalog.update`).
- [ ] 3.3 Expose `GET /api/v1/courses` list route, applying branch-scoped access filters.
- [ ] 3.4 Expose `POST /api/v1/courses/:id/status` transition route, validating activation prerequisite rules and verifying permissions (`course.catalog.publish`).

## 4. Admin Portal UI Components

- [ ] 4.1 Implement `CRS-SCR-001` (Course Catalog List & Dashboard) in the admin portal (including layout filters, KPI metrics, dynamic directionality).
- [ ] 4.2 Implement `CRS-SCR-002` (Create/Edit Course Form) with field validations, Arabic script checks, and permission-based visibility.

## 5. Automated Tests

- [ ] 5.1 Write unit tests for Course Catalog Service checking duplicate code and name validation.
- [ ] 5.2 Write integration tests for API handlers verifying authentication, validation, and permission checks.
- [ ] 5.3 Write e2e tests using Playwright for course creation and editing forms.

## 6. Verification and Project Status

- [ ] 6.1 Update `docs/project-status.md` to move Course Catalog from Planned to In Progress.
