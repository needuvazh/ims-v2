## Why

This change implements Module 05 – Student Management in the ASTI IMS application. It resolves the multi-branch search deadlock by introducing a dynamic relationship-based branch scope model combined with a preflight OTP claim workflow. It also establishes database entities, API endpoints, UI scopes, and test scenarios for status history tracking, duplicate case management, profile merges, ID card reissues, and export auditing.

## What Changes

### Key FRD Decisions Integrated:
- **Lifecycle States:** Student Profiles follow a strict state machine of `Pending` -> `Active` -> `Suspended` -> `Archived`.
- **Single Source of Truth:** No duplicate overview files; all profile fields are mapped dynamically to the shared `Person` record.
- **PII Masking by Default:** Sensitive identity fields (Civil ID, Mobile, Email, Passports) are masked by default across all search drawers and directories unless explicit unmasking permission is granted.
- **Read-Only Student Portal:** The student portal has read-only access to view their own profile and cards (`student.portal.self.read`); modifications must go through administration.
- **Consistent Permission Set:** Permissions follow a standardized `student.*` naming convention (e.g. `student.create`, `student.update`, `student.merge`, `student.archive`, `student.idcard.manage`).
- **Archive, Restore, Merge, and Duplicate Rules:** Merging requires elevated `Branch Manager` authorization. Soft-deleted profiles are excluded from active search but kept for auditing.

## Capabilities

### New Capabilities
- `student-profile`: Complete CRUD and status history logs for student records.
- `duplicate-management`: Duplicate checking workbench, case generation, and profile merging.
- `id-card-management`: Printing logs, initial card issues, and security reissue counters.
- `student-portal-read`: Student-portal self-service view profile page.
- `permissions-and-branch-scope`: Dynamic relationship-based branch containment scopes.

### Modified Capabilities
- `student-directory`: Adjust directory lists and filters to support dynamic, relationship-based branch scoping.

## Impact

- **Database:** Schema migrations in `@ims/database`.
- **Backend API Routes:** Next.js route handlers under `apps/admin-portal/app/api/v1/students/...`.
- **Application Services:** Service implementations in `@ims/admissions-enrollment`.
- **Security:** Permission adjustments in RBAC matrix.
- **Frontend UI:** Drawer selectors, preflight search form, duplicate workbench, and student portal views.
