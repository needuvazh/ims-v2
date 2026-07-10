## Context

Currently, the Lead details screen at `/leads/[id]` only shows follow-up logs and basic lead attributes. When a Lead is successfully converted, an Admission is created, which spawns a StudentProfile and subsequent Enrollments. Counselors, who own the lead relationship, lose line-of-sight on their student's registration progress, batch assignments, attendance, payments, and final certificate issuance.

## Goals / Non-Goals

**Goals:**
- Provide a unified, read-only "Student Registry & Enrollment Progress Console" (Handoff Console) directly inside the Lead Details page.
- Show Admission status, Enrollment status, Batch code, Attendance percentage, Course Completion status, and Certificate status.
- Support deep linking/redirecting to the canonical detail screen of each registry element (e.g. view Admission, Student, Enrollment, Attendance, Invoice, Certificate details).
- Implement permission-based conditional rendering for financial data (if session has `finance.invoice.read`, show invoices; otherwise, show high-level validation status).
- Render this console only if the Lead's stage is `Converted` or `Won`.

**Non-Goals:**
- Provide editing or mutations inside the Handoff Console (it is purely read-only; editing is performed in the respective domains).
- Support corporate group enrollments or multi-student views within a single lead (leads are single-person).

## Decisions

### 1. Unified Handoff Query
We will fetch the associated student lifecycle entities on the server-side Next.js route page `app/(protected)/leads/[id]/page.tsx` using Prisma. 
To minimize performance impact, we will join these relations with a single database roundtrip or scoped sub-queries:
- `Admission`: Match via `leadId = lead.id`.
- `Enrollment`: Match via `leadId = lead.id` (includes Batch, CourseCompletion, Certificates, Invoices, and AttendanceRecords count).

### 2. Tabbed Client UI
We will introduce a `LeadRegistryConsole` tabbed card component inside `app/(protected)/leads/[id]/_components/lead-details-client.tsx` using `@ims/shared-ui` tabs.
- **Academic Handoff Tab**: Contains Admission status and details, Enrollment status and details, and Certificate details (with download PDF buttons).
- **Attendance & Progress Tab**: Contains progress bar for attendance percentage (total records vs Present/Late counts) and last 5 attendance logs.
- **Payments & Finance Tab**: Displays invoice numbers, categories, total invoice amount, paid amount, outstanding dues, and payment statuses.

### 3. Financial Conditional Masking
If the user does not possess `finance.invoice.read` permission:
- The **Payments & Finance** tab will **not** show the detailed invoice table.
- Instead, it will display a simplified text line: `Payment validation: Pass` or `Payment validation: Pending` based on `CourseCompletion.paymentOutcome` or `Enrollment.paymentValidationRequired` fields.

### 4. Deep-linking Redirect Paths
Each element in the handoff console will redirect to its canonical route:
- Admission details: `/admissions/[id]`
- Student profile: `/students/[id]`
- Enrollment details: `/enrollments/[id]`
- Invoice details: `/finance/invoices/[id]`
- Attendance: `/students/[studentProfileId]?tab=attendance` or a direct route if applicable.
- Certificate file download: `/api/v1/documents/[certificateId]/download` or signed certificate URL.

## Risks / Trade-offs

- **Performance**: Deeply nested Prisma queries can be slow. By requesting only the required fields via `select`, we optimize query response times and avoid overloading the server.
- **Permission Leaks**: Since Next.js server component checks permission codes inside `session.permissions`, frontend route guards are robust and secure.
