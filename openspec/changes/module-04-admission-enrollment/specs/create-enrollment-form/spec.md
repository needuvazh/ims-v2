## ADDED Requirements

### Requirement: Create Enrollment Form
The system SHALL provide an enrollment creation form that allows an authorized user to create a draft enrollment from an approved admission.

#### Scenario: Create a draft enrollment from the form
- **WHEN** the registrar submits the form with student profile, admission, course, batch, and enrollment type
- **THEN** the system SHALL create the enrollment draft and return the resulting enrollment details.

#### Scenario: Prevent walk-in enrollment on the generic form
- **WHEN** the user selects WalkIn in the generic create enrollment form
- **THEN** the system SHALL reject the request and direct the caller to the dedicated walk-in flow.

---

### Requirement: Enrollment Pricing Panel
The system SHALL show an inline pricing panel on the create enrollment form that reflects the resolved price snapshot.

#### Scenario: Display resolved pricing values
- **WHEN** the form has enough information to resolve pricing
- **THEN** the system SHALL display pricingSource, resolvedPrice, resolvedDiscount, finalAmount, and paymentValidationRequired.

#### Scenario: Recalculate pricing when inputs change
- **WHEN** the course, batch, branch, or discount inputs change
- **THEN** the system SHALL refresh the pricing snapshot before submission.

---

### Requirement: Enrollment Form Validation
The system SHALL validate course, batch, and admission references before allowing draft creation.

#### Scenario: Reject missing approved admission
- **WHEN** the form submits without an approved admission reference
- **THEN** the system SHALL reject the submission with `ERR_ENR_MISSING_ADMISSION`.

#### Scenario: Reject inactive course or batch
- **WHEN** the form references an inactive course or batch
- **THEN** the system SHALL reject the submission with a validation error.
