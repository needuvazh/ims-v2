## ADDED Requirements

This specification defines two distinct capabilities under the **Admission & Enrollment Management** bounded context to maintain data isolation while preventing identity duplication.

---

### 1. Capability: `person-lookup` (Global Deduplication Check)

The system SHALL allow authorized users to check the global `Person` registry using unique keys before registering new admissions or converting leads.

#### Scenario: Global Person Lookup by Unique Key
- **WHEN** an authorized user searches by a unique key (`mobile`, `email`, or `nationalId`)
- **THEN** the system SHALL search the central `Person` directory globally.
- **AND** if a match is found:
  - Return the masked details of the `Person` record.
  - Return whether a linked `StudentProfile` exists.
  - Return a preflight status indicating if there is already an active `Admission` or `Enrollment` in the user's active branch scope.

#### Scenario: Surface Active Admission Conflict in Lookup Preflight
- **WHEN** a user queries a Person who already has a `StudentProfile` linked to an active `Admission` in the target branch (`admissionStatus` is `Draft`, `Submitted`, or `Approved`)
- **THEN** the system SHALL flag this in the preflight metadata with `conflictCode: 'ERR_ADM_ACTIVE_ADMISSION_EXISTS'`
- **AND** the client UI SHALL disable the option to create a duplicate admission.

---

### 2. Capability: `student-profile-lookup` (Branch-Scoped Directory)

The system SHALL support directory searches for student profiles restricted to the user's authorized branch scope.

#### Scenario: Search within Authorized Branch Scope
- **WHEN** a user searches by student number or name
- **THEN** the system SHALL return matching `StudentProfile` records.
- **AND** verify that each profile is linked to at least one `Admission` in status `Submitted` or `Approved` (excluding `Draft` and `Cancelled`) OR any non-deleted `Enrollment` record in the user's active branch scope.

#### Scenario: Query Deduplication and Sorting
- **WHEN** a query matches a student with multiple admissions or enrollments in the active branch
- **THEN** the search results SHALL deduplicate the profile by `StudentProfile.id` so each student appears exactly once.
- **AND** sort the results by `joinedAt` DESC (latest student registrations first).

#### Scenario: Reject Inactive Profile Selection in Downstream APIs
- **WHEN** a user attempts to select a student profile for enrollment or waitlist placement
- **THEN** the API layer SHALL reject the selection with `ERR_STU_PROFILE_INACTIVE` if:
  - `StudentProfile.status !== 'Active'`
  - `StudentProfile.isDeleted === true`
  - The parent `Person.isDeleted === true`

---

### 3. Capability: `student-pii-reveal` (Audited Data Reveal)

To prevent contract drift, we register the following updates to the Module 04 Bounded Context:

#### A. Permission Matrix Updates (Part 6)
The following permission is added to the Bounded Context registry:
*   `student.reveal_pii`: Registrar, Branch Manager, Super Admin (scoped to branch context). Allows requesting unmasked sensitive fields.

#### B. API Contract Updates (Part 5)
*   **`POST /api/v1/students/{id}/reveal-pii`**
    *   Request: `{ "field": "email" | "phone" | "nationalId", "reason": string }`
    *   Response: `{ "value": string, "revealedAt": datetime }`
    *   Permission: `student.reveal_pii`
    *   Side effects: Write an entry to the central `AuditLog` containing the request parameters (without the unmasked value).

#### Scenario: Mask Sensitive Details in Search Responses
- **WHEN** a student profile is returned in search queries
- **THEN** the system SHALL mask `Person.mobile`, `Person.email`, and `Person.nationalId` in the default API payload.
- **AND** allow users with `student.reveal_pii` permission to request specific unmasking via the reveal API.
