## Why

Introduce the Course Catalog core management capability as part of Module 06. ASTI requires a single, bilingual catalog of courses (English and Arabic) to manage curriculum data, assign branches/departments, and enforce status transitions (Draft, Active, Inactive, Archived).

## What Changes

We will introduce the initial Course Catalog models and CRUD APIs, including department/branch scoping checks and bilingual validation.

## Capabilities

### New Capabilities
- `course-catalog`: Covers bilingual course creation, updates, and status state machine transitions.

### Modified Capabilities

## Impact

- **Database:** Introduces `CourseCategory` and `Course` tables in schema.prisma.
- **Backend:** Adds `packages/course-catalog` package for domain logic, repository interface, and validation schemas.
- **API:** Exposes `POST /api/v1/courses`, `PUT /api/v1/courses/:id`, `GET /api/v1/courses`, and `POST /api/v1/courses/:id/status`.
- **UI:** Implements screens `CRS-SCR-001` (List/Dashboard) and `CRS-SCR-002` (Create/Edit Form) in the admin portal.
