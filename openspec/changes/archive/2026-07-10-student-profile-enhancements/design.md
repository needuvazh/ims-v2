## Context

The `StudentProfileDashboardPage` currently renders canonical user profiles with a tabbed interface showcasing Admissions, Enrollments, Documents, and Audit Logs. As part of a larger push to give administrators a full 360-degree view of a student's history, we need to display their CRM Lead history, Certificates, Financial Invoice/Payment transactions, and Attendance summaries directly on the dashboard.

## Goals / Non-Goals

**Goals:**
- Provide a single, integrated view of all lifecycle events associated with a student.
- Safely mask Passport and Visa details when PII viewing permission is absent.
- Ensure that sections corresponding to separate contexts (CRM, Certificates, Finance, Attendance) check their respective granular permissions.

**Non-Goals:**
- Provide forms to edit leads, create invoices, or issue certificates from the profile dashboard (these actions will link to their respective full consoles/pages).
- Introduce client-side polling or web sockets; all related info is statically pre-rendered or updated on page refresh.

## Decisions

### Decision 1: Query Aggregation in Server Component
- **Approach**: Fetch all related entities (`invoices`, `payments`, `certificates`, `person.leads`, and `enrollments.attendanceRecords`) in the main server-side Prisma query inside the page handler `page.tsx`.
- **Alternatives Considered**: Separate client-side API fetches (`/api/v1/students/[id]/payments` etc.) using TanStack Query.
  - *Why Chosen*: Direct query inclusion in the server component reduces roundtrips, simplifies authorization checks to page-level, keeps the delivery layer thin, and aligns with current Next.js patterns in the codebase.

### Decision 2: Finance Tab Consolidation
- **Approach**: Combine both Invoices and Payments (Receipts) tables into a single "Finance" tab. The tab will show two side-by-side or stacked card sections: Invoices on top (or left) and Payments on the bottom (or right).
- **Alternatives Considered**: Creating two separate tabs ("Invoices" and "Payments").
  - *Why Chosen*: Finance and receivables are deeply coupled. An operator looking at outstanding invoices is likely to want to cross-reference payment receipts in the same view.

### Decision 3: Personal ID and Contact Details Masking
- **Approach**: Passport Number and Visa Number will be rendered as `********* (Masked)` if the operator lacks `student.reveal_pii` and `student.identity.unmasked.read` permissions.
- **Alternatives Considered**: Omit the fields entirely from the profile card.
  - *Why Chosen*: Retaining the masked field indicates that the field exists and allows privileged users (with PII reveal permission) to view the details without editing.

### Decision 4: Attendance Metrics Calculation
- **Approach**: Instead of fetching all individual daily attendance records (which can grow extremely large over time), calculate the total conducted, present, absent, and excused counts on the server side using a lightweight aggregate mapping over `enrollment.attendanceRecords`.
- **Alternatives Considered**: Fetching full attendance lists with pagination.
  - *Why Chosen*: A high-level attendance rate per enrollment is sufficient for general student overview. Deep attendance analysis is already available on the Attendance portal page.

## Risks / Trade-offs

- **[Risk] Heavy Prisma Queries**: Including too many relations (`person.leads`, `admissions`, `enrollments`, `certificates`, `invoices`, `payments`, `attendanceRecords`) in a single SQL query can lead to database performance issues due to Cartesian product joins.
  - *Mitigation*: Limit the count of related records where appropriate, or query them in separate Prisma calls if query timings degrade. Since student records (leads, payments) are typically less than 20 per student, the performance impact is negligible.
