# enrollment-pricing-resolution Specification

## Purpose
TBD - created by syncing change module-04-admission-enrollment. Update Purpose after archive.

## Requirements

### Requirement: Enrollment Pricing Hierarchy Resolution
The system SHALL resolve enrollment pricing using the hierarchy Batch override, then Branch override, then Global course pricing.

#### Scenario: Resolve batch-level pricing first
- **WHEN** an authorized user creates or refreshes an enrollment draft and a batch-specific pricing rule exists
- **THEN** the system SHALL use the batch-level price as the resolved price source.

#### Scenario: Fall back to branch-level pricing
- **WHEN** no batch-level pricing exists but a branch-level rule exists
- **THEN** the system SHALL resolve pricing from the branch rule.

#### Scenario: Fall back to global pricing
- **WHEN** neither batch-level nor branch-level pricing exists
- **THEN** the system SHALL resolve pricing from the global course catalog default.

---

### Requirement: Enrollment Discount Authorization
The system SHALL apply discounts only when the caller is authorized to grant the discount level being requested.

#### Scenario: Reject manual discount above branch threshold without permission
- **WHEN** a manual discount request exceeds the branch threshold and the caller lacks the required permission
- **THEN** the system SHALL reject the discount and preserve the original pricing snapshot.

#### Scenario: Apply valid discount and snapshot final amount
- **WHEN** a valid discount code or manual discount is approved
- **THEN** the system SHALL calculate `resolvedDiscount` and `finalAmount` and persist them as an immutable pricing snapshot.

---

### Requirement: Enrollment Pricing Panel Visibility
The system SHALL expose the resolved pricing snapshot in the create enrollment screen so the registrar can review the financial impact before submitting.

#### Scenario: Show resolved pricing panel
- **WHEN** the registrar opens the create enrollment form
- **THEN** the system SHALL display resolved price, resolved discount, final amount, and payment-validation requirement.

#### Scenario: Refresh pricing before submission
- **WHEN** a course, batch, or discount input changes on the draft form
- **THEN** the system SHALL recalculate the resolved snapshot before the enrollment is submitted.
