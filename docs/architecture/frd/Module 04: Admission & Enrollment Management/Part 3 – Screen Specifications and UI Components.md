# Functional Requirement Document (Part 3)
## Module 04: Admission & Enrollment Management - UI Screen Specifications & Components

---

## 1. Screen Inventory

### Admin / Registrar Portal Screens
1. `ADM-UI-SCR-001`: Student Directory
2. `ADM-UI-SCR-002`: Create Admission Form
3. `ADM-UI-SCR-003`: Student Profile Dashboard
4. `ADM-UI-SCR-004`: Create Enrollment Form
5. `ADM-UI-SCR-005`: Enrollment Operations Console
6. `ADM-UI-SCR-006`: Batch Waitlist Review (read-only reference to Training Delivery waitlist entries)

---

## 2. Screen Specifications

### ADM-UI-SCR-001: Student Directory
* Purpose: Search and review branch-scoped student profiles and admissions.
* Filters: `branchId`, `admissionStatus`, `studentStatus`, global search.
* Columns: Student Number, Full Name, National ID, Primary Branch, Admission Date, Active Enrollments, Status, Actions.
* Actions: View Details, Create Admission, Create Enrollment, Download ID Card.
* Branch behavior: defaults to authenticated branch; Super Admin may switch branch only if explicitly permitted.

### ADM-UI-SCR-002: Create Admission Form
* Purpose: Create an admission by linking to an existing `Person` or creating a new `Person` in the same transaction.
* Fields:
  * Person lookup: national ID, mobile, email
  * Person details: first name, last name, nationality, date of birth, gender
  * Admission branch: derived from active branch for normal users; selectable for Super Admin only
  * Lead reference: optional
  * Remarks: optional
* Validation:
  * National ID / passport format is validated at the boundary.
  * Age must be at least 12 years.
  * Duplicate person matches are blocked.

### ADM-UI-SCR-003: Student Profile Dashboard
* Purpose: Show person and student profile information, linked admissions, linked enrollments, and ID card status.
* Sections: Profile summary, documents, admissions, enrollments, audit trail.
* Display rules: Person fields are read-only and sourced from the shared `Person` record.

### ADM-UI-SCR-004: Create Enrollment Form
* Purpose: Create an enrollment draft for an approved admission.
* Fields:
  * Student profile selector (read-only when launched from profile)
  * Admission reference
  * Course selector
  * Batch selector
  * Enrollment type: Regular, Corporate, WalkIn, Online
  * Corporate participant selector when applicable
  * Discount code / manual discount if permitted
* Pricing panel:
  * Resolved price
  * Resolved discount
  * Final amount
  * Payment validation required flag
  * Batch capacity indicator

### ADM-UI-SCR-005: Enrollment Operations Console
* Purpose: Approve, cancel, drop, and monitor enrollment transitions.
* Actions: Submit, Approve, Cancel, Drop.
* State display: Draft, Submitted, Approved, Confirmed, Active, Completed, Cancelled, Dropped, CertificateIssued.
* Branch behavior: records are always filtered to the active branch.

### ADM-UI-SCR-006: Batch Waitlist Review
* Purpose: Read-only view of waitlist entries owned by Training Delivery.
* Fields: Batch code, queue position, student name, requested course, created timestamp, current status.
* Note: This screen does not own waitlist data; it only consumes a read model.

---

## 3. Dynamic UI States

* Loading: skeleton cards and table placeholders.
* Empty state: no records message with create action for authorized users.
* Permission denied: hide action buttons and show server-validated denial message.
* Error state: validation banner and inline field errors.
* Audit state: show transition history for admissions and enrollments.

---

## 4. Bilingual Layout Rules

* Support both English LTR and Arabic RTL.
* Use logical spacing and mirrored navigation icons for RTL.
* Person name and identity fields must be rendered from the shared person model in the active locale.
