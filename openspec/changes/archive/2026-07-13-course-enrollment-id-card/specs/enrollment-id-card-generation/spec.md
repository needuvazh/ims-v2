## ADDED Requirements

### Requirement: Enrollment ID Card Download API

The system MUST expose a `GET /api/v1/enrollments/[id]/id-card/download` route that generates and streams a two-sided PDF course enrollment ID card.

#### Scenario: Successful download by authorized staff
- **WHEN** a user with `enrollment.read` permission calls `GET /api/v1/enrollments/[id]/id-card/download` for an enrollment in `Confirmed` status that belongs to their allowed branch scope
- **THEN** the response MUST be `200 OK` with `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="course-card-<enrollmentNumber>.pdf"`, and a valid two-sided CR80 PDF binary body

#### Scenario: Enrollment not found
- **WHEN** the requested enrollment ID does not exist or `isDeleted = true`
- **THEN** the response MUST be `404 Not Found` with `errorCode: "ERR_ENROLLMENT_NOT_FOUND"`

#### Scenario: Branch scope denied
- **WHEN** the requesting user does not have access to the branch that owns the enrollment
- **THEN** the response MUST be `403 Forbidden` with `errorCode: "ERR_AUTH_BRANCH_DENIED"`

#### Scenario: Enrollment not Confirmed
- **WHEN** the enrollment's `enrollmentStatus` is anything other than `Confirmed` (e.g., Draft, Submitted, Approved, Active, Dropped, Completed)
- **THEN** the response MUST be `422 Unprocessable Entity` with `errorCode: "ERR_ENROLLMENT_NOT_CONFIRMED"`

#### Scenario: Missing permission
- **WHEN** the session user does not have `enrollment.read` permission
- **THEN** the response MUST be `403 Forbidden`

---

### Requirement: Card Front Content

The front face of the generated PDF MUST include all of the following fields:

#### Scenario: All data available
- **WHEN** a valid PDF is generated with complete enrollment data
- **THEN** the front page MUST contain: ASTI company logo (loaded from `public/alsaud/logo.png`), the text "AL SAUD TRAINING INST.", an "ENROLLED" status badge, the student's full name (first + last, uppercase, truncated at 20 chars), enrollment number prefixed with "ID:", the course name (truncated at 28 chars), the batch code, the branch name, a validity line ("VALID UNTIL: <MMM YYYY>"), a Code 128 barcode rendering the enrollment number, and the card type label "ASTI-ENR-CARD"

#### Scenario: Logo file missing
- **WHEN** `public/alsaud/logo.png` cannot be read from the filesystem
- **THEN** the card MUST still generate successfully — the logo area is omitted and text is left-aligned from the card edge, consistent with graceful degradation in the admission card

#### Scenario: Student photo available
- **WHEN** `person.photoUrl` is populated and the Blob fetch succeeds
- **THEN** the photo MUST be rendered in a 16mm × 20mm rectangle on the left side of the card body

#### Scenario: Student photo unavailable
- **WHEN** `person.photoUrl` is null or the Blob fetch fails
- **THEN** a teal placeholder rectangle (`#134e4a` fill, `#0f766e` border) MUST be rendered in place of the photo, with the label "PHOTO" in teal-200

---

### Requirement: Card Validity Date Resolution

The validity date displayed on the card MUST be resolved from the enrollment's associated batch.

#### Scenario: Batch has an end date
- **WHEN** the enrollment's linked `Batch` record has a non-null `endDate`
- **THEN** the validity line MUST display "VALID UNTIL: <MMM YYYY>" using the batch's `endDate`

#### Scenario: Batch has no end date
- **WHEN** the enrollment's linked `Batch` record has a null `endDate`
- **THEN** the validity line MUST display "VALID UNTIL: <MMM YYYY>" using the enrollment's `updatedAt` timestamp plus 12 months as a fallback

---

### Requirement: Card Back Content

The back face of the generated PDF MUST include the following.

#### Scenario: Back page generation
- **WHEN** a valid PDF is generated
- **THEN** page 2 MUST contain: a "TERMS & CONDITIONS" header, four numbered T&C lines, the label "ASTI-ENR-V1", the institute address line ("ASTI Dubai Campus"), the contact line ("Tel: +971 4 123 4567 | info@asti.ae"), a registrar signature underline with label, and a QR code encoding `https://verify.asti.ae/enrollment/<enrollmentNumber>`

---

### Requirement: Colour Scheme Differentiation

The course enrollment ID card MUST use a teal colour palette to be visually distinct from the admission ID card (which uses indigo).

#### Scenario: Colour rendering
- **WHEN** the card PDF is generated
- **THEN** the front background MUST be teal-900 (`#134e4a`), the "ENROLLED" badge background MUST be emerald-500 (`#10b981`), accent lines MUST use teal-700 (`#0f766e`), and body text on the dark background MUST be teal-100 (`#ccfbf1`) or white

---

### Requirement: Audit Logging

The card download event MUST be recorded in the structured audit log.

#### Scenario: Successful card download
- **WHEN** a card is successfully generated and returned
- **THEN** the logger MUST record: event name `"api.enrollments.idcard.download.success"`, `enrollmentId`, `enrollmentNumber`, `userId` (from session), `branchId`, and a UTC timestamp

#### Scenario: Failed card generation
- **WHEN** card generation fails for any reason
- **THEN** the logger MUST record: event name `"api.enrollments.idcard.download.failed"`, `enrollmentId`, `userId`, error message, and a UTC timestamp

---

### Requirement: UI Download Button

The enrollment detail page MUST expose a "Download Course Card" action button.

#### Scenario: Enrollment is Confirmed
- **WHEN** the enrollment detail page renders with `enrollmentStatus === 'Confirmed'` and the session user has `enrollment.read` permission
- **THEN** a "Download Course Card" button with an `id="enrollment-course-card-download-btn"` MUST be visible in the action bar

#### Scenario: Enrollment is not Confirmed
- **WHEN** `enrollmentStatus` is any value other than `Confirmed`
- **THEN** the "Download Course Card" button MUST NOT be rendered

#### Scenario: Button interaction
- **WHEN** the user clicks "Download Course Card"
- **THEN** the browser MUST initiate a file download of the PDF by calling `GET /api/v1/enrollments/[id]/id-card/download` and triggering a browser download via a temporary anchor element or `window.open`
