## 1. Backend Data Integration

- [x] 1.1 Update `app/(protected)/leads/[id]/page.tsx` to query Admission and Enrollment records associated with the current `leadId`.
- [x] 1.2 Include batch details, course completion details, certificates, invoices, and attendance logs count in the Prisma query.
- [x] 1.3 Map the database models into clean DTO structures suitable for transmission to the client component.
- [x] 1.4 Pass the mapped handoff console properties (`admission`, `enrollment`) as props to `<LeadDetailsClient />`.

## 2. Frontend Client Console

- [x] 2.1 Update `app/(protected)/leads/[id]/_components/lead-details-client.tsx` to conditionally render the handoff console only when the lead's stage is `Converted` or `Won`.
- [x] 2.2 Construct the "Student Registry & Enrollment Progress Console" tab structure using `@ims/shared-ui` Tabs.
- [x] 2.3 Implement the **Academic Handoff** tab showing status cards for Admission, Enrollment, Batch, and Certificate with clickable redirect links.
- [x] 2.4 Implement the **Attendance & Progress** tab showcasing attendance metrics (present vs total sessions, percentage, and logs).
- [x] 2.5 Implement the **Payments & Finance** tab. Conditionally show the detailed invoice list if the user has `finance.invoice.read`. Otherwise, display a masked high-level payment status check outcome.
- [x] 2.6 Verify redirect link paths point correctly to:
  - `/admissions/[id]`
  - `/students/[id]`
  - `/enrollments/[id]`
  - `/finance/invoices/[id]`
  - Certificate download APIs.

## 3. Verification & Quality Control

- [x] 3.1 Run TypeScript typechecks across the monorepo: `pnpm run typecheck` or workspace build check to ensure no API boundary mismatch.
- [x] 3.2 Run lint tests: `pnpm run lint` for the affected packages and apps.
- [x] 3.3 Verify branch scope validation and permissions checks behave as expected on the server-side Next.js route guard.
