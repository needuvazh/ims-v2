## ADDED Requirements

### Requirement: Course Profile Creation (FR-CRS-001)
The system SHALL support creating a training course profile in a draft state, enforcing bilingual names, unique course codes, and valid branch/department associations.

#### Scenario: Successfully create course profile with valid inputs
- **WHEN** a course creation request is submitted with a unique uppercase course code, valid English name, valid Arabic name (Arabic script), active department ID, active branch ID (logical reference), valid classification, duration type/value, and effective start date in the future or present
- **THEN** the system SHALL persist the course in a `Draft` status, link the logical branch context, record a `COURSE_CREATED` audit log, and return the created course details.

#### Scenario: Prevent cyclic parent category mapping in sub-categories
- **WHEN** a course category creation or update is requested with a `parentCategoryId` that creates a loop (e.g., Category A's parent is Category B, and Category B's parent is updated to Category A)
- **THEN** the system SHALL reject the operation and throw an `InvalidCategoryHierarchy` DomainError (`ERR_CRS_CYCLIC_CATEGORY`).

#### Scenario: Course creation fails due to duplicate course code
- **WHEN** a course creation is attempted with a course code that already exists (case-insensitive check)
- **THEN** the system SHALL reject the operation and throw a `DuplicateCourseCode` DomainError (`ERR_CRS_DUPLICATE_CODE`).

#### Scenario: Course creation fails due to non-unique name in branch/department
- **WHEN** a course creation is attempted with an English or Arabic name that already exists within the same branch and department scope
- **THEN** the system SHALL reject the operation and throw a `DuplicateCourseName` DomainError (`ERR_CRS_DUPLICATE_NAME`).

#### Scenario: Course creation fails due to invalid Arabic characters
- **WHEN** a course creation is attempted with Arabic name or description containing non-Arabic script characters
- **THEN** the system SHALL reject the operation and return field-level validation errors.

---

### Requirement: Course Detail Updates (FR-CRS-002)
The system SHALL support modifying course details, preventing mutations to immutable fields or active courses with ongoing batches.

#### Scenario: Successfully update draft course details
- **WHEN** a request to modify name, description, duration, or classification is submitted for a course in `Draft` status
- **THEN** the system SHALL update the course details and append a `COURSE_UPDATED` event to the audit log.

#### Scenario: Block modifying duration/classification on active course with active batches
- **WHEN** an update to `durationValue` or `courseClassification` is requested for a course in `Active` status that has ongoing batches (in `OpenForEnrollment` or `InProgress` state)
- **THEN** the system SHALL block the change and throw an `ActiveCourseLocked` DomainError (`ERR_CRS_ACTIVE_COURSE_LOCKED`).

---

### Requirement: Course State Transitions (FR-CRS-003)
The system SHALL support transitioning course status through the lifecycle (Draft -> Active -> Inactive -> Archived), validating configuration prerequisites and restricting deactivation if active batches depend on it.

#### Scenario: Activate course with pricing and completion rules
- **WHEN** a request to transition a course status from `Draft` to `Active` is received, and the course has at least one active pricing rule and one active completion rule configured
- **THEN** the system SHALL update the status to `Active` and log a `COURSE_STATUS_CHANGED` event.

#### Scenario: Activation fails if pricing or completion rules are missing
- **WHEN** a request to transition a course status from `Draft` to `Active` is received, but the course lacks either active pricing rules or active completion rules
- **THEN** the system SHALL reject the activation and throw a `MissingPricingOrRules` DomainError (`ERR_CRS_MISSING_PRICING_OR_RULES`).

#### Scenario: Deactivation blocks if active batches exist
- **WHEN** a request to transition a course status from `Active` to `Inactive` is received, and there are batches in `OpenForEnrollment` or `InProgress` status associated with this course
- **THEN** the system SHALL block the transition and throw an `ActiveBatchesExist` DomainError (`ERR_CRS_ACTIVE_BATCHES_EXIST`).

#### Scenario: Archiving a course marks it as logically deleted
- **WHEN** a course status is transitioned to `Archived`
- **THEN** the system SHALL set `isDeleted = true`, populate `deletedAt`, transition status to `Archived`, and ensure all associated batches are either completed or cancelled.

---

### Requirement: Course Catalog Branch Scoping
The system SHALL filter courses returned in search queries based on the user's active session branch and consolidated report permissions.

#### Scenario: Filter courses by active session branch
- **WHEN** a list query for courses is executed by a user with `course.catalog.view` permission, and the user lacks `consolidatedVisibility` reporting privileges
- **THEN** the system SHALL restrict the results to only include courses belonging to the user's active session branch.

#### Scenario: Bypass branch scoping filters for global administrators
- **WHEN** a list query for courses is executed by a user who is a Super Admin or has `consolidatedVisibility = true`
- **THEN** the system SHALL return courses from all branches without branch-level filtering.

