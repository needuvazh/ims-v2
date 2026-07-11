## 1. Database Schema & Migrations

- [x] 1.1 Add `CourseExamTemplate` model in `schema.prisma` and establish relations to `Course` and `Exam`.
- [x] 1.2 Add `courseExamTemplateId` to the `Exam` model.
- [x] 1.3 Generate and apply the database migration.

## 2. Course Catalog package enhancements (`packages/course-catalog`)

- [x] 2.1 Update `src/domain/course.ts` to export interfaces for `CourseExamTemplate` and Zod validation schemas.
- [x] 2.2 Implement `src/infrastructure/course-exam-template-repository.ts` for database CRUD.
- [x] 2.3 Implement `src/application/course-exam-template-service.ts` to manage template business logic and validate marks constraints.
- [x] 2.4 Export these new classes in the package's `index.ts`.

## 3. Server-Side Runtime Registration

- [x] 3.1 Instantiate and export `courseExamTemplateRepository` and `courseExamTemplateService` in `apps/admin-portal/app/lib/runtime.ts`.

## 4. REST API Handlers

- [x] 4.1 Create route handlers under `/api/v1/courses/[id]/exam-templates` for list and create operations, validating input with Zod.
- [x] 4.2 Create route handlers under `/api/v1/courses/[id]/exam-templates/[templateId]` for update and soft-delete operations.
- [x] 4.3 Update `apps/admin-portal/app/api/v1/exams/route.ts` to support saving `courseExamTemplateId`.

## 5. User Interface (Course Catalog Configurations)

- [x] 5.1 Add "Exam Masters" tab to `CourseConfigsPanel` client component.
- [x] 5.2 Implement the Master Exam List table component with columns: Name, Max Marks, Pass Marks, Status, and Actions.
- [x] 5.3 Implement the side drawer form component to add/edit exam templates, integrating Zod validations.

## 6. User Interface (Batch details workspace)

- [x] 6.1 Update `BatchDetailPage` to fetch course completion rule requirements, active course-level exam templates, and batch scheduled exam records.
- [x] 6.2 Add "Exams" tab to `BatchDetailsTabs` component.
- [x] 6.3 Implement a table rendering course exam templates with status (Scheduled / Pending Setup).
- [x] 6.4 Implement inline date pickers and actions:
  - "Schedule Exam" (submits POST request to schedule a new batch exam instance using template details).
  - "Update Date" (submits PATCH request to reschedule exam date inline).
  - Link to go directly to `/exam-completion/exams/[id]` to record student marks.

## 7. User Interface (Exam Creation Form)

- [x] 7.1 Update `ExamForm` on the generic create exam screen to fetch active course exam templates when a course is chosen.
- [x] 7.2 Implement a dropdown selector "Select from Course Exam Templates" which automatically prefills Name, Max Marks, and Passing Marks fields upon selection.

## 8. Verification & Tests

- [x] 8.1 Write unit tests in `packages/course-catalog` verifying that `CourseExamTemplate` validation fails when passing marks exceed maximum marks.
- [x] 8.2 Verify the page loads successfully and the build completes without errors using `pnpm build`.
- [x] 8.3 Run type-checking and lints across the monorepo to ensure compliance.
