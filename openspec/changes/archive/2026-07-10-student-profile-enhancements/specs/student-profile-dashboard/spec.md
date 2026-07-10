## MODIFIED Requirements

### Requirement: Student Profile Dashboard

The system SHALL provide a student profile dashboard that shows the linked Person record, admissions, enrollments, documents, ID card status, and detailed canonical profile properties (Passport Number, Visa Number, Date of Birth, Gender, Nationality).

#### Scenario: Render the student profile summary
- **WHEN** an authorized user opens a student profile dashboard
- **THEN** the system SHALL show the person name, contact details (email, mobile), student number, status, branch-scoped history, and canonical profile details (Passport Number, Visa Number, Date of Birth, Gender, Nationality).

#### Scenario: Render linked admissions and enrollments
- **WHEN** the dashboard loads successfully
- **THEN** the system SHALL show linked admissions and enrollments with their current statuses and references.

### Requirement: Student Profile Visibility Controls

The system SHALL enforce branch scope and permission checks on the dashboard, including masking sensitive contact and identity fields (Mobile, Email, Civil ID, Passport Number, Visa Number).

#### Scenario: Deny cross-branch dashboard access
- **WHEN** a user requests a dashboard for a profile outside their authorized branch scope
- **THEN** the system SHALL return `403 Forbidden`.

#### Scenario: Mask sensitive contact data without permission
- **WHEN** a user lacks reveal permission for sensitive contact values or identity values
- **THEN** the system SHALL mask the restricted fields (Mobile, Email, Civil ID, Passport Number, Visa Number) in the dashboard response.

## ADDED Requirements

### Requirement: Student Profile CRM Leads Panel

The system SHALL provide a tab showing linked CRM Leads associated with the student's Person record.

#### Scenario: Render CRM leads tab
- **WHEN** a user with `lead.read` permission views the dashboard
- **THEN** the system SHALL render a tab displaying the list of CRM Leads including Lead Number, Stage, Source, Counselor name, Interested Course, and Created Date.

### Requirement: Student Profile Certificates Panel

The system SHALL provide a tab listing certificates issued to the student.

#### Scenario: Render certificates tab
- **WHEN** a user with `certificate.view` permission views the dashboard
- **THEN** the system SHALL render a tab listing the certificates including Certificate Number, Course Name, Batch Code, Issued Date, and Status (Generated, Issued, Revoked).

### Requirement: Student Profile Finance Panel

The system SHALL provide a tab detailing financial invoices and payments associated with the student profile.

#### Scenario: Render finance tab
- **WHEN** a user with `payment.create` permission views the dashboard
- **THEN** the system SHALL render a tab displaying:
  1. Invoices table (Invoice Number, Date, Due Date, Total, Paid, Outstanding, Status)
  2. Payments table (Payment Number/Reference, Date, Method, Amount, Ref Number, Status)

### Requirement: Student Profile Attendance Summary Panel

The system SHALL provide a tab summarizing attendance statistics per course enrollment.

#### Scenario: Render attendance tab
- **WHEN** a user with `attendance.record.read` or `attendance.report.student.view` permission views the dashboard
- **THEN** the system SHALL render a tab summarizing the student's attendance stats (Total Sessions, Present Count, Absent Count, Excused Count, and calculated Attendance Rate) for each course enrollment.
