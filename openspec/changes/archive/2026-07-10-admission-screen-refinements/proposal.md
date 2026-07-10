## Why

The current Admission screen has several usability and functionality gaps:
1. **Layout Hierarchy:** The "Workflow Status Timeline" is in a 1/3 column that squashes the main details, and should be placed at the end of the page to prioritize candidate details.
2. **Missing Timestamps:** The admission creation date is not visible on the screen.
3. **Student Profile Image Upload:** There is no display or upload option for student profile pictures, which should be stored in the database's `Person` table under `photoUrl`.
4. **Detailed Profile Attributes:** Detailed canonical attributes (e.g. National ID, Passport, Visa, Nationality, Date of Birth, Gender) are hidden or not loaded.
5. **Enrollment Overload:** The "Enrolled Courses" section renders all historic enrollments, which can be noisy; it should show only the last 5 enrollments and provide navigation to the full list.
6. **Enrollment Details Linking:** Individual enrollment cards lack a quick redirect link to the specific enrollment details page.
7. **Enrollment Meta-data:** Enrollment creation dates are not shown, and status badges are styled with basic generic colors.
8. **Document Checklist View:** The documents list is a vertical stack of rows, which takes up a lot of screen space. A responsive multi-column grid is cleaner and should feature clear "View/Download" and "Delete" buttons.
9. **Card Generation Resolution:** The Student ID Card displays "Pending Generation" without a clear way to generate it initially from the Admission screen.
10. **Card PDF Customization:** The downloaded Student ID Card PDF renders a default blue box instead of the student's actual uploaded profile image, and lacks corporate branding elements like the ASTI logo.

## What Changes

1. **Query & Data Mapping:**
   - Modify `AdmissionQueryService` in the `admissions-enrollment` domain package to fetch and return `createdAt` and the full set of `Person` properties (`photoUrl`, `nationalId`, `passportNumber`, `visaNumber`, `nationality`, `dateOfBirth`, `gender`).
   - Sync `page.tsx` delivery mapping to pass these attributes to the client details component.
2. **API Route for Photo Upload:**
   - Create `apps/admin-portal/app/api/v1/admissions/[id]/profile-photo/route.ts` to receive image uploads, upload them to private Vercel Blob storage, and update the associated `Person` record.
3. **Client Component Enhancements:**
   - Re-organize page sections to move the timeline to the end.
   - Display admission creation date.
   - Render student avatar, upload handler, and expandable "View More" panel for detailed properties.
   - Limit enrollments display to the latest 5 with search link fallback, and add "View Enrollment" links.
   - Re-style enrollment status badges with modern Tailwind palettes.
   - Shift documents list to a 2-column responsive grid featuring "View" and "Delete" actions.
   - Implement an "Issue ID Card" button and form dialog that calls the existing `students/[id]/id-card` API.
4. **PDF Generator Improvements:**
   - Update `apps/admin-portal/app/api/v1/admissions/[id]/id-card/download/route.ts` to read `public/alsaud/logo.png`, load the remote student photo, and render both directly into the jsPDF structure.

## Capabilities

### Modified Capabilities
- `admission-enrollment-management`: Improve the Admission Details client screen, related query layers, and PDF card download generator.
- `document-management`: Improve document checklist viewing and deleting workflows inside admissions.

## Impact

* **Bounded Contexts:** Admission & Enrollment Management, Document Management.
* **Database:** No database migrations needed; fields already exist in `persons` table.
* **APIs:** New POST endpoint `/api/v1/admissions/[id]/profile-photo`.
* **UI:** A much denser, visually polished, and feature-rich Admission details interface.
