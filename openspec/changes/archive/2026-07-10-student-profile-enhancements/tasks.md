## 1. Backend Server-Side Query Enhancements

- [x] 1.1 Update `prisma.studentProfile.findFirst` query in `apps/admin-portal/app/(protected)/students/[id]/page.tsx` to fetch `certificates`, `invoices`, `payments`, `attendanceRecords` (under `enrollments`), and `person.leads` (with counselor username and interested course).
- [x] 1.2 Implement server-side masking logic for Passport and Visa numbers in the page component, checking for `student.reveal_pii` and `student.identity.unmasked.read` permissions.
- [x] 1.3 Map and pass retrieved lists (leads, certificates, invoices, payments, attendance summary) to `StudentHistoryTabs` props.

## 2. LearnerProfileCard Component Expansion

- [x] 2.1 Update `LearnerProfileCard` props interface in `apps/admin-portal/app/(protected)/students/[id]/_components/learner-profile-card.tsx` to accept `passportNumber`, `visaNumber`, `nationality`, `dateOfBirth`, `gender`.
- [x] 2.2 Add new grid elements and styling to render Passport, Visa, DOB, Gender, and Nationality details.
- [x] 2.3 Ensure display masking of passport and visa works correctly on the card layout when revealed PII flags are false.

## 3. StudentHistoryTabs Component Enhancements

- [x] 3.1 Update `StudentHistoryTabsProps` interface in `apps/admin-portal/app/(protected)/students/[id]/_components/student-history-tabs.tsx` to receive `leads`, `certificates`, `invoices`, `payments`, and calculated `attendance` summary data.
- [x] 3.2 Implement CRM Leads tab content showing Lead Number (linked to lead detail), Stage, Source, Counselor, and Interested Course.
- [x] 3.3 Implement Certificates tab content showing Certificate Number, Course Name, Batch Code, Issued Date, and Status (with view/download link).
- [x] 3.4 Implement Finance tab content with nested Invoices Table and Payments (Receipts) Table including invoice/receipt links, amounts, reference numbers, and status badges.
- [x] 3.5 Implement Attendance tab content showing the total sessions conducted, present, absent, excused counts, and calculated attendance rate percentage.
- [x] 3.6 Apply conditional check flags (`showLeads`, `showCertificates`, `showFinance`, `showAttendance`) in the tab rendering block based on resolved permissions.

## 4. Verification and Testing

- [x] 4.1 Run TypeScript typechecks on the admin portal app to verify correct prop types.
- [x] 4.2 Verify page layout, empty states for new tabs, tab navigation, masking controls, and console details link redirects.
