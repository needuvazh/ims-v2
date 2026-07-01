## Context

The system currently lacks a structured Course Catalog. We need to introduce the database tables (`CourseCategory`, `Course`) and implement core domain logic, repository patterns, API handlers, and UI admin screens.

## Goals / Non-Goals

**Goals:**
- Implement `Course` and `CourseCategory` models in PostgreSQL.
- Enforce strict bilingual name validation and uniqueness scope constraints.
- Provide a clear lifecycle state machine (Draft -> Active -> Inactive -> Archived).
- Maintain branch isolation/scoping during read lists and permissions validation.

**Non-Goals:**
- Online payment gateway integration.
- Course pricing and completion rules definition (deferred to subsequent changes).
- Front-end client-facing course page edits (CMS) or student login pages (future portals).

## Decisions

### 1. Database Schema
We will add `CourseCategory` and update `Course` in `packages/database/prisma/schema.prisma`.
*   `CourseCategory` includes `code`, `nameEnglish`, `nameArabic`, and a self-referencing `parentCategoryId`.
*   `Course` includes `courseCode` (unique, uppercase alphanumeric check), `nameEnglish`, `nameArabic`, logical reference `branchId` (logical reference to `Branch.id`), logical reference `departmentId` (without physical foreign key to cross-context tables), `categoryId` (FK to same context), and metadata fields (`durationType`, `durationValue`, `status`, etc.).
*   Standard indexes `@@index([categoryId])`, `@@index([branchId])`, and logical key index `@@index([departmentId])` will be added.

### 2. Domain & Application Logic
*   Create `packages/course-catalog` exposing application services: `createCourse`, `updateCourse`, and `transitionCourseStatus`.
*   Sub-category cyclic mapping check: Before creating or updating a category, we will recursively traverse parents to verify that the category's ID does not appear in its own parent tree.
*   Domain invariants (like bilingual regex and name uniqueness within branch/dept) will be validated inside the application service layer.
*   Transactions will wrap changes, and mutations will publish audit events like `COURSE_CREATED` and `COURSE_UPDATED` to `AuditLog`.

### 3. API Delivery
*   Zod validation checks format at the boundary. Request validation restricts non-Arabic script input for Arabic names.
*   Permissions checks: `course.catalog.view` (read), `course.catalog.create` (write), `course.catalog.update` (update), `course.catalog.publish` (status transitions).

## Risks / Trade-offs

- **Soft-Delete Cascade:** Deactivating or archiving a course does not trigger native cascading in Prisma. We choose to programmatically check and handle dependencies inside application service transactions.
