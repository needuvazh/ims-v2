## 1. Domain Query & Backend Setup

- [x] 1.1 Update `AdmissionQueryService` in `packages/admissions-enrollment/src/application/admission-query-service.ts` to include `createdAt` in the returned `admission` mapping.
- [x] 1.2 Include additional detailed properties (`nationalId`, `passportNumber`, `visaNumber`, `nationality`, `dateOfBirth`, `gender`, `photoUrl`) in the `person` sub-object of `getAdmissionDetail`.
- [x] 1.3 Update the delivery mapping in `apps/admin-portal/app/(protected)/admissions/[id]/page.tsx` to map `createdAt` to ISO string and safely convert `dateOfBirth` to ISO string format.

## 2. API Routes

- [x] 2.1 Create the API route file at `apps/admin-portal/app/api/v1/admissions/[id]/profile-photo/route.ts` to accept multi-part form data uploads.
- [x] 2.2 Validate request authentication and branch scoping constraints on the new route.
- [x] 2.3 Store the uploaded image in Vercel Blob and update `Person.photoUrl` in the database. Add an audit log entry for this action.
- [x] 2.4 Verify that the profile photo endpoint responds with success and a valid URL.

## 3. UI Component Restructuring

- [x] 3.1 Move the **Workflow Status Timeline** component to the bottom of the page in `apps/admin-portal/app/(protected)/admissions/[id]/_components/admission-details-client.tsx`.
- [x] 3.2 Display the Admission creation date (`createdAt`) in the header section of the details page.
- [x] 3.3 Add the profile avatar image rendering and an upload input with loader state in the **Learner Profile** card.
- [x] 3.4 Implement a "View More Details" collapsible toggle for showing secondary attributes (Nationality, DOB, Gender, National ID, Passport, Visa).
- [x] 3.5 Slice the enrollments list to show a maximum of 5, sorted by latest date, and add a link redirecting to the filtered enrollments page.
- [x] 3.6 Add a details redirection link on individual enrollment cards.
- [x] 3.7 Format enrollment date and style status badges with clean visual colors.
- [x] 3.8 Re-arrange the documents checklist into a responsive `grid grid-cols-1 md:grid-cols-2` layout, displaying clean download and delete buttons.
- [x] 3.9 Add an "Issue ID Card" button and form modal to initiate card creation for students whose cards are pending.

## 4. ID Card PDF Customization

- [x] 4.1 Update `apps/admin-portal/app/api/v1/admissions/[id]/id-card/download/route.ts` to load and render the ASTI logo in the header using `doc.addImage(...)`.
- [x] 4.2 Add fetch logic in the download route to download the student profile picture from `photoUrl` (if set) and embed it inside the PDF layout.
- [x] 4.3 Clean up spacing and styling inside the PDF coordinate definitions.

## 5. Testing & Verification

- [x] 5.1 Run full typecheck: `pnpm run typecheck`.
- [x] 5.2 Run workspace tests to verify no regressions: `pnpm test`.
- [x] 5.3 Verify upload flow and download outputs manually.

## 6. Student ID Card Back Side & Student Profile Page Realignment

- [x] 6.1 Implement 3D hover/click flip effect in student ID card preview UI.
- [x] 6.2 Render T&C text, campus contacts, and CSS barcode on reverse side in client component.
- [x] 6.3 Update download handler to generate 2-page PDF with front & back designs.
- [x] 6.4 Implement interactive LearnerProfileCard upload functionality on Student Profile page.
- [x] 6.5 Realign student profile page header spacing and back url mapping to match admissions view.
