## 1. Dependency Installation

- [x] 1.1 Add `bwip-js` as a direct dependency to `apps/admin-portal` — run `pnpm add bwip-js` from the `apps/admin-portal` directory and verify it resolves correctly in the monorepo workspace
- [x] 1.2 Add `@types/bwip-js` as a dev dependency if type definitions are not bundled — verify TypeScript recognises the module with `pnpm tsc --noEmit` in `apps/admin-portal`

## 2. API Route — Download Endpoint

- [x] 2.1 Create route file `apps/admin-portal/app/api/v1/enrollments/[id]/id-card/download/route.ts` following the same structural pattern as `apps/admin-portal/app/api/v1/admissions/[id]/id-card/download/route.ts`
- [x] 2.2 Implement authentication via `withPermission(request, 'enrollment.read', ...)` and add branch-scope check using `branchScopeResolver.resolveAllowedBranches`
- [x] 2.3 Fetch enrollment with Prisma `findUnique` including: `person`, `course`, `batch` (with `endDate`), and `studentProfile.branch` — throw `ERR_ENROLLMENT_NOT_FOUND` if missing or deleted
- [x] 2.4 Add status guard: throw `ERR_ENROLLMENT_NOT_CONFIRMED` with HTTP 422 if `enrollmentStatus !== 'Confirmed'`
- [x] 2.5 Implement validity date resolution — use `batch.endDate` if non-null, else fallback to `enrollment.updatedAt + 12 months`; format as `"MMM YYYY"` (e.g. "DEC 2026")
- [x] 2.6 Load ASTI logo from `public/alsaud/logo.png` via `node:fs/promises`; gracefully catch and continue without logo if file is missing
- [x] 2.7 Fetch student photo from `person.photoUrl` using `BLOB_READ_WRITE_TOKEN`; gracefully catch and fall back to placeholder
- [x] 2.8 Render Code 128 barcode PNG for `enrollmentNumber` using `bwip-js.toBuffer` (server-side); inject into jsPDF via `addImage`
- [x] 2.9 Render QR code PNG for `https://verify.asti.ae/enrollment/<enrollmentNumber>` using the `qrcode` package or inline SVG; inject into jsPDF via `addImage` on the back page

## 3. jsPDF Card Layout — Front Page (Page 1)

- [x] 3.1 Initialize jsPDF with `{ orientation: 'landscape', unit: 'mm', format: [85.6, 54] }`
- [x] 3.2 Draw teal-900 (`#134e4a`) full-bleed background rectangle
- [x] 3.3 Draw ASTI logo (6mm × 6mm at `x=6, y=4`), then "AL SAUD TRAINING INST." in white bold (8pt), and "ASTI Institute Management System" in teal-100 (5pt)
- [x] 3.4 Draw "ENROLLED" badge rectangle in emerald-500 (`#10b981`) at `x=68, y=5` with white bold 4pt label
- [x] 3.5 Draw student photo (16mm × 20mm at `x=6, y=16`) — JPEG/PNG from Blob, or teal placeholder with "PHOTO" label on failure
- [x] 3.6 Draw student name (bold white 8pt, truncated at 20 chars), enrollment number ("ID: ENR-XXXXX", teal-100 6pt), course name (truncated 28 chars, 5pt), batch code and branch (5pt) — all left-aligned from `x=26`
- [x] 3.7 Draw divider line in teal-700 (`#0f766e`) at `y=42`
- [x] 3.8 Draw "VALID UNTIL: <MMM YYYY>" (teal-100, 4.5pt) at `x=6, y=46` and "ASTI-ENR-CARD" label at `x=60, y=46`
- [x] 3.9 Draw Code 128 barcode PNG in white-backgrounded rectangle at `x=6, y=46` (below the validity line, or in the space available — adjust coordinates to fit within card bounds without overlap)

## 4. jsPDF Card Layout — Back Page (Page 2)

- [x] 4.1 Add second page with `doc.addPage([85.6, 54], 'landscape')`
- [x] 4.2 Draw slate-900 (`#0f172a`) full-bleed background rectangle
- [x] 4.3 Draw "TERMS & CONDITIONS" header (indigo-200, bold 5pt) and "ASTI-ENR-V1" label at `x=68`; draw divider line at `y=12`
- [x] 4.4 Write four T&C lines (indigo-100, 4.2pt): (1) non-transferable / course-only, (2) attend assigned batch sessions, (3) voided on withdrawal, (4) contact admin for changes
- [x] 4.5 Draw divider line at `y=32`, institute address line, contact details (indigo-300, 4.2pt)
- [x] 4.6 Draw registrar signature underline (indigo-600) from `x=60` to `x=80` at `y=37`; label "Registrar" in 3.8pt
- [x] 4.7 Draw QR code PNG (20mm × 20mm) at `x=60, y=14`; add "verify.asti.ae" label below in 3.5pt

## 5. Response and Observability

- [x] 5.1 Return the jsPDF buffer as a `NextResponse` with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="course-card-<enrollmentNumber>.pdf"`
- [x] 5.2 Log structured success event `"api.enrollments.idcard.download.success"` with `enrollmentId`, `enrollmentNumber`, `userId`, `branchId`
- [x] 5.3 Log structured error event `"api.enrollments.idcard.download.failed"` in the catch block with `enrollmentId`, `userId`, and error
- [x] 5.4 Apply observability response headers via `applyObservabilityResponseHeaders`

## 6. Error Handling

- [x] 6.1 Implement `errorResponse` helper for the route — map `ERR_ENROLLMENT_NOT_FOUND` → 404, `ERR_AUTH_BRANCH_DENIED` → 403, `ERR_ENROLLMENT_NOT_CONFIRMED` → 422, all others → 500
- [x] 6.2 Ensure logo and photo fetch failures are caught individually and do not cause the overall card generation to fail

## 7. UI — Enrollment Detail Page Button

- [x] 7.1 In `apps/admin-portal/app/(protected)/enrollments/[id]/_components/enrollment-details-client.tsx`, locate the action bar at the top of the component
- [x] 7.2 Add a conditional "Download Course Card" button: visible only when `enrollment.enrollmentStatus === 'Confirmed'`; requires the session user to have `enrollment.read` permission (check `sessionPermissions.includes('enrollment.read')`)
- [x] 7.3 Implement the click handler — call `GET /api/v1/enrollments/[id]/id-card/download` as a `fetch`, receive the blob, create an object URL, trigger download via a temporary `<a>` element, and revoke the URL
- [x] 7.4 Add loading state on the button while the PDF is being generated (show a spinner icon, disable button)
- [x] 7.5 Show a `toast.error` on fetch failure with a user-readable message
- [x] 7.6 Assign `id="enrollment-course-card-download-btn"` to the button element

## 8. Tests

- [x] 8.1 Write an API test for the download route: test unauthenticated request → 401, missing permission → 403, wrong branch → 403, not-Confirmed status → 422, non-existent enrollment → 404, and Confirmed enrollment → 200 with `application/pdf` content type
- [x] 8.2 Verify button visibility in the UI: render `EnrollmentDetailsClient` with `enrollmentStatus === 'Confirmed'` and assert the download button is present; render with `enrollmentStatus === 'Approved'` and assert it is absent

## 9. Verification

- [x] 9.1 Run `pnpm tsc --noEmit` in `apps/admin-portal` — must pass with zero type errors
- [x] 9.2 Run `pnpm lint` in `apps/admin-portal` — must pass
- [x] 9.3 Run `pnpm test` in `apps/admin-portal` — must pass including new route tests
- [x] 9.4 Manual verification: create a test enrollment, advance it to `Confirmed` status, click "Download Course Card", open the PDF, verify front page layout (logo, name, ENROLLED badge, barcode), verify back page (T&C, QR code), and confirm the barcode is scannable with a standard barcode reader or mobile app
- [x] 9.5 Verify that calling the route with a `Submitted` enrollment returns HTTP 422 with `ERR_ENROLLMENT_NOT_CONFIRMED`
- [x] 9.6 Run `pnpm build` in `apps/admin-portal` to confirm the production build succeeds with `bwip-js` included
