## Why

Currently, when scheduling or creating an exam for a batch cohort, the coordinator must manually enter all details from scratch, including the exam name, maximum marks, and passing marks. This manual process is error-prone, leads to inconsistent naming and evaluation standards across batches of the same course, and makes it difficult to enforce standard course syllabus requirements. 

By defining **Exam Master Templates** at the Course Catalog level, the institute can establish standardized exam definitions (e.g., "Theory Mid-term", "Practical Final") for each course. When a coordinator schedules an exam for a batch, they can select from these templates, auto-populating standard name and marks, and only select the specific exam date.

Furthermore, we need a clear link between these course-level templates and the batch view itself: if a course requires exams, the batch details page should show the scheduled status of each course exam template, provide inline scheduling/rescheduling capability, and link directly to the result-entry screen.

## What Changes

1. **Database Schema**:
   - Add a new `CourseExamTemplate` table to store course-level exam definitions (e.g., `examName`, `maxMarks`, `passMarks`, `status`).
   - Add a nullable `courseExamTemplateId` field to the `Exam` table to link batch exam instances back to their catalog templates.

2. **Backend & Package Layers (`packages/course-catalog`)**:
   - Introduce `CourseExamTemplate` interfaces, Zod validation schemas, repositories, and application services within the Course Catalog domain context.
   - Register the new services in the administrative portal runtime.

3. **API Routes**:
   - Implement `GET /api/v1/courses/[id]/exam-templates` to list templates for a course.
   - Implement `POST /api/v1/courses/[id]/exam-templates` to create a template.
   - Implement `PUT /api/v1/courses/[id]/exam-templates/[templateId]` to edit a template.
   - Implement `DELETE /api/v1/courses/[id]/exam-templates/[templateId]` to soft-delete a template.

4. **UI Changes**:
   - **Course Catalog Editor**: Add a new tab named "Exam Masters" in the Course Configuration panel to manage course exam templates.
   - **Batch Details View**: Add a new tab named "Exams" in the Batch details workspace.
     - Display a table of all `CourseExamTemplates` configured for the batch's course.
     - For scheduled templates, show their status, date (with inline rescheduling option), and a link to the result entry screen.
     - For unscheduled templates, show a "Pending Setup" status and provide an inline date picker and "Schedule Exam" button.
   - **Exam Creation Form**: Enable prefilling fields (name, max marks, pass marks) by selecting an available master template for the selected course.

## Capabilities

### New Capabilities
- `course-exam-master-templates`: Manage standard exam masters at the Course level.
- `batch-exam-cohort-scheduling`: Display, inline-schedule, and reschedule exam requirements within the Batch Workspace view.

### Modified Capabilities
- `exam-completion-optimization`: Extend exam creation and detail views to support templates and direct batch integration.

## Impact

- **Database**: Add `CourseExamTemplate` table, add foreign key `courseExamTemplateId` to `exams`.
- **API**: New route handlers for course-level exam templates.
- **UI Components**: `CourseConfigsPanel`, `BatchDetailsTabs`, and `ExamForm`.
- **Permissions**: Control template management using existing `course.catalog.update` permissions, and schedule instances using `exam.create` and `exam.update` permissions.
