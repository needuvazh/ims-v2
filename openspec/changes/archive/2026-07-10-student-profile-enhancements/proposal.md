## Why

The current Student Profile Dashboard lists basic profile information, admissions, enrollments, documents, and audit logs. However, admins and academic operators need a unified, 360-degree view of a student's lifecycle, including their CRM leads history, issued certificates, financial invoices/payments, and attendance statistics, to manage students effectively without navigating to multiple sections of the portal.

## What Changes

- **Modify `LearnerProfileCard`**: Display additional personal fields: Passport Number, Visa Number, Date of Birth, Gender, and Nationality. Passport and Visa numbers must be masked if the operator lacks PII reveal permissions.
- **Modify `StudentHistoryTabs`**:
  - **Leads Tab**: Add a tab that displays the CRM Lead history (Lead Number, Stage, Source, Counselor, Interested Course, Date Created) associated with the student's Person record.
  - **Certificates Tab**: Add a tab that lists certificates issued to the student (Certificate Number, Course, Batch, Issued Date, Status) with actions to view/download or check the QR verification code.
  - **Payments & Invoices (Finance) Tab**: Add a tab that details financial records including:
    - Invoices (Invoice Number, Date, Due Date, Total, Paid, Outstanding, Status).
    - Payments (Payment Number/Reference, Date, Method, Amount, Ref Number, Status).
  - **Attendance Tab**: Add a tab that summarizes attendance statistics per course enrollment (Total Sessions, Present, Absent, Excused, Attendance Rate).
- **Backend Query Updates**: Expand `StudentProfile` database queries on the server component to include `certificates`, `invoices`, `payments`, `attendanceRecords` in `enrollments`, and `person.leads` (including their counselor and interested course).
- **Enforce Security & Permissions**: Apply RBAC guards to conditionally display these tabs based on the operator's active permissions (`lead.read`, `certificate.view`, `payment.create` / `payment.read`, `attendance.record.read`).

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `student-profile-dashboard`: Expand the dashboard to display CRM lead history, certificates, financial invoices/payments, attendance metrics, and extra personal details under appropriate security controls.

## Impact

- **Affected Files**:
  - `apps/admin-portal/app/(protected)/students/[id]/page.tsx`
  - `apps/admin-portal/app/(protected)/students/[id]/_components/learner-profile-card.tsx`
  - `apps/admin-portal/app/(protected)/students/[id]/_components/student-history-tabs.tsx`
- **Database Schema**: No changes needed; all required relations already exist in `schema.prisma`.
- **API routes / Server-Side Queries**: Server component queries will include more relations.
