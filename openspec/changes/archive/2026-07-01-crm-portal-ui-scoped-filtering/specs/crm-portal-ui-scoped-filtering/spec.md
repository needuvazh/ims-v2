## ADDED Requirements

### Requirement: Branch Scoped Lead and Inquiry Filtering
The system SHALL isolate leads and inquiries by the active branch context of the logged-in user. Non-global users MUST only access records belonging to branches they are explicitly scoped to in their session.

#### Scenario: Authorized branch access
- **WHEN** a counselor with branch scope for "Central Campus" views the leads page
- **THEN** the system fetches only leads belonging to the "Central Campus" branch

#### Scenario: Unauthorized branch access
- **WHEN** a user attempts to manually request leads for a branch ID they do not have scope for
- **THEN** the server returns a forbidden branch scope violation error

### Requirement: Counselor Scoped Lead and Inquiry Access
By default, counselors SHALL only have read and write access to leads and inquiries that are explicitly assigned to them. Users holding the branch-wide visibility permission `crm.leads.read.all` (such as Branch Managers) SHALL access all leads in the branch.

#### Scenario: Counselor viewing assigned leads
- **WHEN** a counselor without `crm.leads.read.all` permission views the leads page
- **THEN** the system restricts the results to leads where the counselorId matches the logged-in user's ID

#### Scenario: Manager viewing all branch leads
- **WHEN** a user with the permission `crm.leads.read.all` views the leads page
- **THEN** the system retrieves all leads in the active branch, regardless of the counselor assignment

### Requirement: Client-Side Validation and Server Action Error Mapping
All CRM form entries MUST be validated client-side against the Zod schemas using `react-hook-form` before network execution. Submissions MUST invoke Server Actions, and any server-side database unique constraint or domain error MUST be caught and mapped to the UI inputs using `setError` field-level updates.

#### Scenario: Invalid form submission
- **WHEN** a user submits the Create Lead form with an empty first name or invalid email format
- **THEN** react-hook-form halts submission and displays input-level validation error messages

#### Scenario: Server-side validation mapping
- **WHEN** the server action fails due to a uniqueness constraint violation (e.g., matching email index)
- **THEN** the action maps the error to the email input and react-hook-form displays the warning label under the email field

### Requirement: Duplicate Lead Warning and Bypass Flow
The system SHALL warn users if a lead or inquiry is captured with a duplicate mobile number or email, but SHALL allow authorized users to explicitly acknowledge and bypass the block during submission.

#### Scenario: Acknowledging and saving duplicate lead
- **WHEN** a user submits a lead with a phone number matching an existing record, receives the duplicate alert, checks the "Ignore duplicate warning and proceed" checkbox, and submits again
- **THEN** the system saves the duplicate lead record and logs the bypass action in the audit trace

### Requirement: Terminal Stage Transitions, Constraints, and DOB Mandates
The system SHALL enforce rules surrounding terminal stages and conversion prerequisites. Transitioning a lead to `Lost` MUST require capturing a valid reason code and notes. Transitioning a lead to `Converted` MUST be disabled for manual dropdown updates and occur only via the admission orchestrator. Conversion MUST fail if the linked Person's `dateOfBirth` is null or if identity document links are missing.

#### Scenario: Transitioning lead to Lost stage
- **WHEN** the user selects the "Lost" stage in the edit form
- **THEN** the form requires a "Lost Reason Code" selection, and the server action throws a validation error if the reason is missing

#### Scenario: Converting lead with identity documents and DOB
- **WHEN** the user clicks "Convert to Student" on a qualified lead
- **THEN** the UI displays a dialog modal requiring at least one identity document URL (such as national ID scan)
- **AND** the server action checks that the linked Person record contains a valid `dateOfBirth`
- **AND** the action invokes the `LeadConversionOrchestrator` transaction

### Requirement: Person Profile Synchronization
To prevent profile drift and satisfy admissions validation checks, any creation or modification of a Lead's `email` or `dateOfBirth` fields MUST synchronize directly to the associated `Person` record in the database.

#### Scenario: Updating lead email updates person profile
- **WHEN** a lead's email is updated via `updateLeadAction`
- **THEN** the system updates both the `Lead.email` field and the `Person.email` field of the linked Person record

### Requirement: Security Boundary Assertions (Branch & Counselor Isolation)
The system SHALL assert active branch boundaries and counselor-level assignment boundaries.
- Inquiry qualification MUST be blocked if the counselor's session branch context does not cover the inquiry's branch.
- Accessing or modifying a lead assigned to another counselor (for non-global readers) MUST throw `ERR_CRM_ASSIGNED_LEAD_SCOPE_VIOLATION` instead of general branch scope errors.
- The system SHALL enforce granular RBAC permissions (e.g. `lead.create`, `lead.update`, `lead.lost`, `lead.assign`, `lead.convert`) server-side.

#### Scenario: Unauthorized inquiry qualification
- **WHEN** a user from Branch "Central Campus" attempts to qualify an inquiry belonging to Branch "West Campus"
- **THEN** the server rejects the request with a branch scope violation

#### Scenario: Counselor accessing another counselor's lead
- **WHEN** a counselor without `crm.leads.read.all` attempts to read or update a lead assigned to another counselor
- **THEN** the server returns `ERR_CRM_ASSIGNED_LEAD_SCOPE_VIOLATION`
