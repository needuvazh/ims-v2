## ADDED Requirements

### Requirement: REQ-SM-SCOPE-001 — Dynamic Branch Isolation Scope

Access to student profiles is verified dynamically. A user SHALL be granted visibility to a student profile if they have access to at least one branch with which the student has a Home Branch, Admission, Enrollment, or Lead relationship.

#### Scenario: Block viewing out-of-scope student profile

- **WHEN** counselor_mct attempts to view a Sohar branch student who has no active relationship in MCT
- **THEN** the request throws a branch access error

#### Scenario: Authorize profile view once relationship is established

- **WHEN** counselor_mct claims a student profile by creating a new Admission record in MCT
- **THEN** MCT counselor is immediately granted read/write access to the profile

---

### Requirement: REQ-SM-SCOPE-002 — Consistent Permission set

RBAC authorizations MUST follow standard `student.*` names. Merge permissions MUST be assigned only to elevated roles.

#### Scenario: Prevent standard officer from merging profiles

- **WHEN** a standard Student Administration Officer attempts to execute a merge
- **THEN** the action fails due to permission validation
- **WHEN** a Branch Manager attempts to execute a merge
- **THEN** the merge executes successfully
