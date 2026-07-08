# Admission & Enrollment Management UI Gaps Specification

## Purpose

This specification identifies and defines the functional requirements and scenarios for the pending UI interfaces and controls within the **Admission & Enrollment Management** bounded context. It bridges the gap between the implemented backend services/APIs and the required operational admin portal screens.

## Requirements

### Requirement: Enrollment Operations Console & Actions

The system SHALL provide an interface (Operations Console) to view and manage enrollment status transitions, enforcing state validation rules and roles.

#### Scenario: Display Enrollment Details & Action Controls

- **GIVEN** an enrollment exists in the database
- **WHEN** an authorized user views the enrollment details page
- **THEN** the system SHALL display:
  - Enrollment Number and status badge (with dynamic styles matching the current state)
  - Linked student profile details, interested course, and batch code
  - Action buttons for all valid next-state transitions based on the transition matrix:
    - If status is `Draft`: Show "Submit for Review" (`enrollment.submit` permission) and "Cancel Draft" (`enrollment.cancel` permission)
    - If status is `Submitted`: Show "Approve Enrollment" and "Reject/Cancel" (Branch Manager / Super Admin with `enrollment.approve` permission)
    - If status is `Approved` (awaiting payment): Show "Cancel Unpaid" (`enrollment.cancel` permission)
    - If status is `Confirmed` or `Active`: Show "Drop Enrollment" (`enrollment.drop` permission)
- **AND** disable or hide actions if the current user lacks the required permission or if the enrollment belongs to another branch.

#### Scenario: Drop Active Enrollment with Mandatory Reason

- **GIVEN** an enrollment is in `Confirmed` or `Active` status
- **WHEN** an authorized user clicks the "Drop Enrollment" action
- **THEN** the system SHALL display a modal dialog requiring:
  - Withdrawal Date
  - Drop Reason Code (sourced from Master Data configurations)
  - Optional remarks text
- **WHEN** the user submits the form
- **THEN** the system SHALL dispatch a `POST /api/v1/enrollments/[id]/drop` request
- **AND** update the UI state to show the enrollment as `Dropped`
- **AND** trigger a refresh of the page to show the audit history entry.

---

### Requirement: Batch Enrollment Roster

The system SHALL display the list of active/confirmed student profiles registered in a specific batch under the Training Delivery screens, allowing lookup and management.

#### Scenario: Display Batch Students Tab

- **GIVEN** a batch details page is open (`/batches/[id]`)
- **WHEN** the user selects the "Enrolled Students" tab (alongside Sessions and Faculty)
- **THEN** the system SHALL query and display a table of all student profiles with an active or confirmed enrollment in this batch, containing:
  - Student Number
  - Student Full Name (linked to their profile page)
  - Enrollment Date & Current Enrollment Status (`Approved`, `Confirmed`, `Active`, `Completed`, `Dropped`)
  - Total Attendance Percentage (sourced from the Attendance context)
  - Quick action to "Drop Student" (if authorized)
- **AND** display a count badge next to the tab name showing the current count of enrolled students relative to max capacity (e.g., `Students (12/15)`).

---

### Requirement: Enrollment Pricing & Discount Snapshot Panel

The system SHALL render a detailed summary of resolved course pricing and discount overrides during the enrollment creation and detail views.

#### Scenario: Render Pricing Resolution Details

- **GIVEN** a user is creating or viewing an enrollment
- **WHEN** the course and batch are selected (in creation) or when viewing a saved record
- **THEN** the system SHALL display a Pricing Panel showing:
  - **Pricing Source:** Indicates if pricing was resolved from `BatchLevelOverride`, `BranchLevelOverride`, or `GlobalDefault`
  - **Base Resolved Price:** The standard catalog price for the course/batch
  - **Applied Discount:** The breakdown of any global, branch-scoped, or manual discounts applied
  - **Final Computed Amount:** The net amount calculated (`resolvedPrice - resolvedDiscount`)
  - **Payment Validation Status:** Indication of whether payment clearance is required (`paymentValidationRequired = true`)
  - **Price Evaluation Timestamp:** Date and time of pricing resolution

---

### Requirement: Student ID Card Preview & Actions

The system SHALL support visual preview and downloading of generated Student ID cards from the student profile and admission details screens.

#### Scenario: Download and Preview ID Card

- **GIVEN** an admission has been approved and a Student Profile exists
- **WHEN** an authorized user views the Student Profile Dashboard or Admission Detail page
- **THEN** the system SHALL display a Student ID Card section showing:
  - ID Card Status (e.g. `Generated`, `Issued`, `Pending`)
  - Preview card thumbnail showing Student Number, Full Name, photo placeholder, and validity dates
  - A "Download ID Card" button triggering the download of the card PDF via a signed storage URL
  - A "Regenerate ID Card" button for administrators to trigger card rebuilding in case of updates.
