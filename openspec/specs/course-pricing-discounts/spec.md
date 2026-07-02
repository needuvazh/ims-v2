# course-pricing-discounts Specification

## Purpose
TBD - created by archiving change course-pricing-discounts-spec. Update Purpose after archive.
## Requirements
### Requirement: Course Pricing Overrides (FR-CRS-004)
The system SHALL support configuring global base pricing and branch-level pricing overrides with effective date ranges, enforcing OMR currency formatting, tax defaults, and tax exemption compliance.

#### Scenario: Configure global default course pricing
- **WHEN** a pricing configuration is submitted with a null branch ID, OMR currency, base price greater than zero, default 5% tax, and active start date by a user with `course.catalog.create` permission
- **THEN** the system SHALL persist the price record as a global fallback.

#### Scenario: Configure branch-scoped pricing override
- **WHEN** a pricing override is submitted for a specific branch ID by a user with `course.pricing.override` permission
- **THEN** the system SHALL save the override, and ensure that the billing engine resolves this branch price instead of the global price for students enrolled at this branch.

#### Scenario: Configure course pricing with tax exemption
- **WHEN** a pricing configuration is submitted with `isTaxExempt = true`
- **THEN** the system SHALL validate that both `taxExemptionReason` and `taxExemptionCode` are provided, and persist the record with `taxPercentage = 0.000` and the exemption metadata.

#### Scenario: Reject pricing override on start-date collisions
- **WHEN** a new pricing record is submitted with an `effectiveStartDate` that is less than or equal to the start date of an existing active pricing record for the same course, branch, customer type, batch type, and currency
- **THEN** the system SHALL reject the operation and throw `ERR_CRS_MULTIPLE_ACTIVE_PRICING` because historical starts cannot be superseded.

#### Scenario: Pricing overrides automatic sequential deprecation
- **WHEN** a new pricing record is submitted with an `effectiveStartDate` that is after the start date of an existing active pricing record for the same course, branch, customer type, batch type, and currency
- **THEN** the system SHALL deprecate the existing pricing record by updating its status to `Superseded` (type-safe `ConfigStatus`) and updating its `effectiveEndDate` to the day before the new price starts, ensuring historical price values remain unmodified.

#### Scenario: Reject pricing override if user lacks override credentials
- **WHEN** a pricing override is requested by a user lacking the `course.pricing.override` permission
- **THEN** the system SHALL reject the operation and return a 403 forbidden error.

---

### Requirement: Course Discounts Configuration
The system SHALL support configuring course discounts (Individual, Corporate, EarlyBird) in percentage or flat OMR values, enforcing supervisor approval policies.

#### Scenario: Add course discount requiring approval
- **WHEN** a discount is configured with `requiresApproval = true` by a user with `course.pricing.override` permission
- **THEN** the system SHALL flag this discount to require supervisor authorization before it can be applied to student registrations.

#### Scenario: Validate flat discount decimals and bounds
- **WHEN** a flat OMR discount is configured with decimal precision other than three decimal places or a value less than or equal to zero
- **THEN** the system SHALL reject the configuration and throw a validation error.

---

### Requirement: Course Completion Rules Definition (FR-CRS-005)
The system SHALL support defining academic graduation benchmarks (minimum attendance, exam requirements, fee clearance) for each course.

#### Scenario: Successfully configure completion rules
- **WHEN** completion rules are submitted with minimum attendance percentage between 0 and 100, exam toggles, and fee clearance flags by a user with `course.catalog.create` permission
- **THEN** the system SHALL save the rules and set their status to `Active`.

#### Scenario: Enforce rule deactivation and versioning
- **WHEN** completion rules are modified for a course
- **THEN** the system SHALL deactivate the old rule record by setting its status to `Superseded` (type-safe `ConfigStatus`) and its `effectiveEndDate` to the day before the new rules start, and create a new version of the rules, preserving past graduation evaluation records.

---

### Requirement: Pricing and Discount Hierarchy Resolution
The system SHALL expose pricing and discount resolution service endpoints for the billing engine, resolving overrides matching the student's batch or branch, falling back to global defaults.

#### Scenario: Resolve pricing overrides with highest priority (Batch level)
- **WHEN** the pricing is requested for a student enrolled in a batch (which carries `batchType`), and that batch has a batch-specific pricing override configured for that customer sector
- **THEN** the system SHALL return the batch-level override price, and any applicable batch-level discounts matching the customer profile, in a unified response payload.

#### Scenario: Resolve pricing overrides with second priority (Branch level)
- **WHEN** the pricing is requested for a student in a branch that has a branch pricing override, but the student's batch has no batch override
- **THEN** the system SHALL return the branch-level override price and branch-level discounts.

#### Scenario: Resolve pricing with global default fallback
- **WHEN** the pricing is requested, and no batch-level or branch-level override is active for the course as of `asOfDate`
- **THEN** the system SHALL return the global default course price and global default discounts.

---

### Requirement: Batch Type Integration (End-to-End)
The system SHALL carry `batchType` across the batch execution domain to differentiate learning delivery pricing.

#### Scenario: Create batch with execution delivery type
- **WHEN** a batch is instantiated with `batchType` set to `Regular`, `FastTrack`, or `Weekend`
- **THEN** the system SHALL save the batch, defaulting to `Regular` if omitted to preserve backward compatibility with existing tests and scripts.

