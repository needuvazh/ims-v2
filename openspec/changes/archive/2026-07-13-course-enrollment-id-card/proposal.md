## Why

Students enrolled in courses at Al Saud Training Institute (ASTI) currently receive an Admission ID Card when their admission is approved — but have no equivalent physical or digital credential tied to their specific course enrollment. This gap means there is no printable, standardised document a student can carry to identify themselves as an enrolled participant for a specific course and batch.

The Course Enrollment ID Card fills this gap: when an enrollment reaches `Confirmed` status (invoice raised, enrollment confirmed), the system can generate a two-sided printable CR80 card that functions as a course-specific identity pass — analogous to the admission ID card but scoped to a single enrollment.

This also enables staff at the branch front desk to hand a card to the student at the time of fee collection or enrollment confirmation, reinforcing a professional onboarding experience.

## What Changes

1. **New API route** — `GET /api/v1/enrollments/[id]/id-card/download` — generates a two-sided PDF CR80 card (85.6mm × 54mm, landscape) using jsPDF.
2. **Front face** of the card includes: ASTI company logo, student full name, enrollment number, course name, batch code, branch, validity period (derived from batch end date or a fixed offset), and a real Code 128 barcode encoding the enrollment number.
3. **Back face** includes: course-specific Terms & Conditions, registrar signature line, institute contact, and a QR code linking to a future-ready verification URL.
4. **UI trigger** — a "Download Course Card" action button is added to the enrollment detail page (`/enrollments/[id]`) when `enrollmentStatus === 'Confirmed'`, requiring `enrollment.read` permission.
5. **Design improvement** — a teal/emerald colour scheme differentiates the course card visually from the deep-indigo admission card; photo placeholder is retained; card uses a distinct "ENROLLED" status badge instead of "ACTIVE".

## Capabilities

### New Capabilities
- `enrollment-id-card-generation`: Generates and downloads a two-sided PDF CR80 enrollment ID card for confirmed enrollments, with ASTI logo, student identity, course/batch details, barcode (Code 128 encoding enrollment number), QR code, and course-specific T&C on the back.

### Modified Capabilities
- `enrollment-detail-ui`: Adds a "Download Course Card" action button to the enrollment detail page, conditionally visible when status is `Confirmed`.

## Impact

**Bounded Context:** Admission & Enrollment Management  
**Affected Contexts (downstream read):** Course Catalog (course name), Training Delivery (batch code, batch end date), Organization (branch name), Identity & Access Management (photo URL via person profile)

**New API Route:** `GET /api/v1/enrollments/[id]/id-card/download`  
- Permission required: `enrollment.read`  
- Branch-scoped: yes — verifies session user has access to the enrollment's branch  
- Trigger condition: `enrollmentStatus === 'Confirmed'`

**New dependency:** `bwip-js` (server-side Code 128 barcode rendering) or equivalent, added to `apps/admin-portal`.  
**Existing dependency used:** `jspdf` (already installed), `node:fs/promises`, `node:path` (same pattern as admission card).

**No schema migration required.** No new Prisma models or columns needed — enrollment and batch data already exist.  
**No domain event or outbox impact.** Card generation is a read-only rendering operation.  
**Audit:** Log card download events (who downloaded, for which enrollment) via existing structured logger.  
**Test impact:** Add API-level test for download route (auth, branch scope, status guard).
