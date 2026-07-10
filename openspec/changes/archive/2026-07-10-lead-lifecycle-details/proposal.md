## Why

Currently, student counselors using the ASTI IMS have no visibility into the downstream student lifecycle once a lead is converted or won. They cannot easily verify if the admission was generated, if the student got enrolled, which batch was assigned, whether attendance is being logged, whether payments are posted, or if course completion and certificate generation have occurred. 

This forces counselors to navigate away from the Lead detail screen to search for student profiles, enrollments, invoices, and completion records separately. Providing a unified handoff console directly on the Lead Details screen resolves this friction and keeps counselors fully informed within their primary workspace.

## What Changes

We will introduce a read-only "Student Registry & Enrollment Progress Console" (Academic & Financial Handoff Console) directly inside the Lead Details screen under the standard Lead Profile accordion, visible only when the lead's stage is `Converted` or `Won`.

This console will feature:
1. **Academic Handoff Card**: High-level status of the linked Admission and Enrollment records with clickable navigation links.
2. **Attendance & Progress Tab**: Summary of total classes conducted, present sessions, and current attendance percentage, with a link to the attendance roster.
3. **Payments & Finance Tab**: 
   - If the user has `finance.invoice.read`, displays payment progress (Paid vs Invoiced), invoices, outstanding dues, and a link to the finance screen.
   - If the user does not have `finance.invoice.read`, displays only the high-level payment status check outcome (Pass/Fail) from the course completion record.
4. **Course Completion & Certification Card**: Displays evaluation milestones, final approval status, and certificate details (with download link) if issued.

## Capabilities

### New Capabilities
- `lead-handoff-console`: Introduces a read-only handoff console displaying admissions, enrollments, payments, batch assignments, attendance, completions, and certificates directly on the Lead details screen.

### Modified Capabilities
- `lead-to-admission-handoff`: Updates the lead conversion status view to include downstream training, financial, and certificate lifecycles.

## Impact

- **UI Components**: Updates `LeadDetailsClient` component to include the tabbed handoff console.
- **Backend Data Fetching**: Updates Next.js route/page `leads/[id]/page.tsx` to fetch linked Admission, Enrollment, Invoices, CourseCompletion, Attendance, and Certificates in a performant query.
- **Permissions**: Enforces conditional rendering for financial data depending on whether the counselor session has `finance.invoice.read` permission.
