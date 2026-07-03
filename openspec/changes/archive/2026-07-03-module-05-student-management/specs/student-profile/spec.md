## ADDED Requirements

### Requirement: REQ-SM-PROFILE-001 — Student Profile Lifecycle States
The system SHALL enforce that all student profiles transition through the allowed states: `Pending`, `Active`, `Suspended`, and `Archived`. All status changes MUST be audited and written to the `StudentStatusHistory` table.

#### Scenario: Verify initial profile state is Active
- **WHEN** a student profile is created through direct registration
- **THEN** its status starts as "Active"
- **And** a status history entry is created documenting the default activation

#### Scenario: Transition profile status safely with reason
- **WHEN** an authorized officer suspends a student profile with reason "Fee overdue"
- **THEN** the student profile status is updated to "Suspended"
- **And** a row is inserted in `StudentStatusHistory` with the old/new status and the override reason

---

### Requirement: REQ-SM-PROFILE-002 — Soft Delete Auditability
When a student profile is archived, the system SHALL perform a soft delete (`isDeleted = true`, `deletedAt = now()`) to preserve history and prevent data loss.

#### Scenario: Soft delete student profile
- **WHEN** an admin archives a student profile
- **THEN** the profile's `isDeleted` flag becomes true
- **And** `deletedAt` matches the current timestamp
- **And** the record is excluded from active directory searches
