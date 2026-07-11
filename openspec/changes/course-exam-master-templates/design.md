## Context

Currently, the creation of batch-level exams requires the coordinator to manually specify the name, maximum marks, and passing marks from scratch. This introduces inconsistency in naming and pass thresholds across different batches of the same course. 

The application has a `Course` model managed under the Bounded Context **Course Catalog Management**, and an `Exam` model managed under the Bounded Context **Exam, Result & Completion Management**. 

We need to allow setting up standard course-level exam definitions ("Exam Masters") and instantiating/rescheduling them inside batch cohorts, creating a link between batch management and exam scheduling.

## Goals / Non-Goals

**Goals:**
- Implement a new `CourseExamTemplate` model in the Course Catalog Bounded Context to act as the source of truth for exam definitions.
- Provide a tab in the Course Catalog UI (`CourseConfigsPanel`) to manage these templates.
- Link scheduled batch `Exam` records back to `CourseExamTemplate` via `courseExamTemplateId`.
- Allow the batch details workspace (`BatchDetailsTabs`) to display course-level templates, schedule templates inline, reschedule exams inline, and redirect to the result-entry screen.
- Extend the generic Create Exam form to fetch and prefill details based on templates.

**Non-Goals:**
- Automatic batch exam scheduling (e.g. automatically creating `Exam` instances for all batches when a course template is created). Scheduling must remain an explicit user action per batch.
- Grading policies or custom grade mappings inside the master templates (out of scope for this phase).

## Decisions

### 1. Database Model Additions & Schema Changes

Add the `CourseExamTemplate` model in `packages/database/prisma/schema.prisma` and add a nullable foreign key `courseExamTemplateId` to `Exam` (representing the template instance relation):

```prisma
model CourseExamTemplate {
  id         String       @id @default(uuid()) @db.Uuid
  courseId   String       @db.Uuid
  course     Course       @relation(fields: [courseId], references: [id])
  examName   String       @db.VarChar(200)
  maxMarks   Decimal      @db.Decimal(10, 2)
  passMarks  Decimal      @db.Decimal(10, 2)
  status     ConfigStatus @default(Active)

  createdAt  DateTime     @default(now()) @db.Timestamptz(6)
  createdBy  String?      @db.Uuid
  updatedAt  DateTime?    @updatedAt @db.Timestamptz(6)
  updatedBy  String?      @db.Uuid
  deletedAt  DateTime?    @db.Timestamptz(6)
  deletedBy  String?      @db.Uuid
  isDeleted  Boolean      @default(false)

  exams      Exam[]

  @@index([courseId])
  @@map("course_exam_templates")
}

model Exam {
  // ... existing fields ...
  courseExamTemplateId String? @db.Uuid
  courseExamTemplate   CourseExamTemplate? @relation(fields: [courseExamTemplateId], references: [id])
  // ...
}
```

*Migration Mitigation*: Standard soft-delete patterns will apply. Deleting a master template will set `isDeleted = true` and `deletedAt = now()`. The database foreign key constraint will allow scheduled batch exams to persist their values even if the master is deleted.

### 2. Application Layer & DDD Boundaries (`packages/course-catalog`)

Keep domain boundaries intact. Course catalog owns the definitions (`CourseExamTemplate`), and exams & completions owns the execution (`Exam`).
- Create `CourseExamTemplate` domain entity interface in `packages/course-catalog/src/domain/course.ts`.
- Create `PrismaCourseExamTemplateRepository` in `packages/course-catalog/src/infrastructure/course-exam-template-repository.ts`.
- Create `CourseExamTemplateService` in `packages/course-catalog/src/application/course-exam-template-service.ts`.
- Register the new repository and service inside the server-side runtime `apps/admin-portal/app/lib/runtime.ts`.

### 3. API Design

We will build the endpoint `/api/v1/courses/[id]/exam-templates` in `apps/admin-portal/app/api/v1/courses/[id]/exam-templates/route.ts` supporting:
- `GET`: Fetch templates for the course.
- `POST`: Create a template.

And `/api/v1/courses/[id]/exam-templates/[templateId]/route.ts` supporting:
- `PUT`: Update a template.
- `DELETE`: Soft-delete a template.

Authorization checks will enforce permissions matching existing configs:
- Managing templates: Requires `course.catalog.update`.
- Fetching templates: Requires `course.catalog.view`.

We will also update `apps/admin-portal/app/api/v1/exams/route.ts` to accept `courseExamTemplateId` in the `POST` payload.

### 4. UI/UX Workflow Architecture

#### Tab: Course Edit CONFIGS Panel (`course-configs-panel.tsx`)
- Tab `exams` will render a standard Data Table listing: Exam Name, Max Marks, Pass Marks, Status.
- Add an "Add Master" button triggering a side drawer.
- Inputs validated with a Zod resolver.
- Success triggers `revalidatePath` and refreshes.

#### Tab: Batch details view (`batch-details-tabs.tsx`)
- Tab `exams` will render the list of templates.
- For scheduled templates, render the scheduled date and status. Allow inline rescheduling using a date input and an "Update" button, and redirect to the exam grading view `/exam-completion/exams/[examId]`.
- For unscheduled templates, show a date input and a "Schedule Exam" button. Clicking this triggers the `POST /api/v1/exams` endpoint.

## Risks / Trade-offs

- **Template Drift**: What happens if the master template changes (e.g. max marks updated from 50 to 100) after some batches have already completed their exams?
  - *Decision*: Batch exams copy the values at the time of scheduling. Changing the template will only affect future scheduled exams, preventing historic result corruption.
- **Custom Batch Exams**: The system will still support scheduling custom (one-off) batch exams that are not associated with any master template, by setting `courseExamTemplateId = null`. This preserves flexibility for fast-track walk-ins.
