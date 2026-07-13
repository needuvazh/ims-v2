## Context

ASTI currently generates an Admission ID Card (two-sided CR80 PDF via jsPDF) when an admission reaches `Approved` status. The implementation lives in `GET /api/v1/admissions/[id]/id-card/download/route.ts`. It uses `jsPDF` (already in `apps/admin-portal`), reads the ASTI logo from `public/alsaud/logo.png`, and fetches the student photo from Blob storage.

There is no equivalent card for course-level enrollment. This design adds a **Course Enrollment ID Card** that uses the same PDF infrastructure but is scoped to an `Enrollment` record (course + batch + student), with a refreshed visual identity (teal accent) and real barcode encoding.

The enrollment lifecycle is:  
`Draft → Submitted → Approved → Confirmed → Active → Dropped / Completed`

The card is only generated when `enrollmentStatus === 'Confirmed'`, meaning the enrollment has been formally confirmed (invoice raised, seat reserved).

---

## Goals / Non-Goals

**Goals:**
- Generate a two-sided CR80 (85.6mm × 54mm, landscape) PDF course card for `Confirmed` enrollments.
- Card front: ASTI logo, student name, enrollment number, course name, batch code, branch, validity, "ENROLLED" badge, photo placeholder, Code 128 barcode (encoding enrollment number).
- Card back: course-specific T&C, registrar signature line, institute contact, QR code (encoding a verification URL stub).
- Download exposed via `GET /api/v1/enrollments/[id]/id-card/download` with `enrollment.read` permission, branch-scope check, and status guard.
- UI trigger button added to enrollment detail page (`/enrollments/[id]`) — visible only when `enrollmentStatus === 'Confirmed'`.
- Visually distinct from admission card via a teal/emerald colour palette (`#0f766e` primary).
- Audit-logged: who downloaded, enrollment ID, timestamp.

**Non-Goals:**
- No new Prisma models or database columns. Card is generated on-the-fly.
- No issuance tracking table (unlike the admission card which has `idCardIssued` / `idCardNumber`). If needed later, that is a separate change.
- No online certificate verification endpoint (QR encodes a static stub URL).
- No walk-in or corporate enrollment card variants (covered by same route since they share the `Enrollment` model).
- No configurable T&C per course.
- No email delivery of the card. Staff downloads and prints.

---

## Decisions

### D1 — Trigger Status: `Confirmed` (not `Approved` or `Active`)
`Approved` means the enrollment has been reviewed but the invoice may not yet be raised. `Active` means the student is already attending. `Confirmed` is the right gate — the enrollment is formally committed and payment intent is established. This mirrors the pattern that the admission card requires `admissionStatus === 'Approved'`.

### D2 — Barcode Library: `bwip-js` (server-side, Node-compatible)
`bwip-js` renders Code 128 barcodes to a PNG buffer entirely on the server (no DOM, no canvas) and is well-maintained. The PNG is then injected into jsPDF via `addImage`. This avoids the simulated barcode pattern used in the admission card and produces a real, scannable Code 128 barcode encoding the `enrollmentNumber`.

```
Barcode value format: ENR-XXXXXX  (enrollment number)
Encoding: Code 128 (auto mode)
Dimensions: ~74mm wide × 7mm tall, placed in the front card footer area
```

### D3 — QR Code: `qrcode` npm package (server-side PNG output)
`qrcode` generates QR PNGs as Buffer. The QR encodes:  
`https://verify.asti.ae/enrollment/<enrollmentNumber>`  
This is a stub URL — no live verification endpoint exists yet. The QR is placed on the back of the card.

### D4 — Validity: Batch End Date → fallback to 1 year from enrollment `confirmedAt`
The Prisma `Batch` model has `endDate`. If populated, use it as the validity date. If not (batch is open-ended), fallback to 1 year after the enrollment's `updatedAt` (used as confirmation timestamp approximation).  
Format: `MMM YYYY` (e.g. "DEC 2026").

### D5 — Colour Scheme: Teal Accent (`#0f766e` / teal-700)
The admission card uses indigo (`#1e1b4b`). The course card uses teal to signal a different card type at a glance:
- Background: `#134e4a` (teal-900)
- Accent highlight: `#0f766e` (teal-700)
- Badge: `#10b981` (emerald-500) with "ENROLLED" text
- Back background: `#0f172a` (slate-900, same dark base as admission card back)

### D6 — Photo: Same fetch pattern as admission card
Read `person.photoUrl`, fetch with `BLOB_READ_WRITE_TOKEN`, convert to base64. On failure, render a teal placeholder rectangle with "PHOTO" label.

### D7 — Cross-context reads: Direct Prisma query in route handler
The download route is a read-only rendering operation. It reads from `Enrollment`, `Course`, `Batch`, `Branch`, and `Person` in a single Prisma `findUnique` with `include`. This is acceptable for a reporting/export route — no write-path cross-context join. No application service boundary is crossed for a download-only operation.

### D8 — No new packages for QR if `qrcode` already present; add `bwip-js` only
Check `apps/admin-portal/package.json` for existing QR support. `bwip-js` will be added as a direct dependency to `apps/admin-portal`.

---

## Architecture Sketch

```
Browser (staff) clicks "Download Course Card" on /enrollments/[id]
         │
         │ GET /api/v1/enrollments/[id]/id-card/download
         ▼
┌─────────────────────────────────────────────────┐
│  Route Handler (thin delivery adapter)          │
│  1. withPermission('enrollment.read')           │
│  2. Fetch enrollment + course + batch + person  │
│     via Prisma (read-only, single query)        │
│  3. Branch-scope check                          │
│  4. Status guard: Confirmed only                │
│  5. Load logo from public/alsaud/logo.png       │
│  6. Fetch photo from Blob storage               │
│  7. Render barcode PNG via bwip-js              │
│  8. Render QR PNG via qrcode                    │
│  9. Build jsPDF doc (front page + back page)    │
│  10. Stream PDF buffer as response              │
│  11. Log audit event (structured logger)        │
└─────────────────────────────────────────────────┘
         │
         ▼
    PDF (arraybuffer) → Content-Type: application/pdf
    filename: course-card-<enrollmentNumber>.pdf
```

---

## Card Layout

### Front (Page 1)
```
┌──────────────────────────────────────────────────────────────────────┐
│ [LOGO]  AL SAUD TRAINING INST.                     [ENROLLED badge]  │
│         ASTI Institute Management System                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [PHOTO]   STUDENT FULL NAME                                          │
│  16×20mm   ID: ENR-XXXXXX                                             │
│            Course: Advanced Python Programming                        │
│            Batch: BATCH-2026-001 | Branch: Dubai                     │
│                                                                       │
├──────────────────────────────────────────────────────────────────────┤
│ VALID UNTIL: DEC 2026             ASTI-ENR-CARD                      │
│ ████████████████████ (Code 128 barcode, enrollment number) ██████   │
└──────────────────────────────────────────────────────────────────────┘
```

### Back (Page 2)
```
┌──────────────────────────────────────────────────────────────────────┐
│ TERMS & CONDITIONS                               ASTI-ENR-V1         │
│ ────────────────────────────────────────────────────────────────────│
│ 1. This card is issued for the enrolled course only (non-transferable)│
│ 2. Cardholder must attend sessions assigned to their batch.          │
│ 3. If withdrawn or cancelled, this card becomes void immediately.    │
│ 4. For batch changes or re-enrollment, contact administration.       │
│ ────────────────────────────────────────────────────────────────────│
│ ASTI Dubai Campus                      [QR Code 20×20mm]            │
│ Tel: +971 4 123 4567 | info@asti.ae    verify.asti.ae               │
│                             ─────────────────                        │
│                             Registrar                                │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Risks / Trade-offs

| Risk | Likelihood | Mitigation |
|---|---|---|
| `bwip-js` adds ~300KB to the server bundle | Low | It is server-only (route handler), no client bundle impact |
| Batch `endDate` is null for open-ended batches | Medium | Fallback to `updatedAt + 1 year` as described in D4 |
| Student photo unavailable (Blob token missing/expired) | Medium | Graceful fallback to teal placeholder rectangle, same as admission card pattern |
| Card downloaded before batch is fully assigned | Low | Guard: `Confirmed` status implies batch is assigned (enrollment requires batchId) |
| QR verification URL is a stub | Accepted | Document in code; verification route is a future change |
| jsPDF font limitation (no Arabic) | Accepted | English-only card, consistent with current admission card behaviour |
