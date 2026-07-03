## 1. Schema & Data Model

- [x] 1.1 Update `schema.prisma` to declare the 1:N Person-to-StudentProfile relationship and the 6 new tables.
- [x] 1.2 Generate database migrations using the `--create-only` flag to avoid interactive TTY prompts.
- [x] 1.3 Add custom partial unique indexes (`WHERE is_deleted = false`) to the migration SQL script for soft-delete uniqueness.
- [x] 1.4 Execute the migration against the local PostgreSQL database using the PTY script.

## 2. Application Services

- [x] 2.1 Update `student-query-service.ts` to implement the dynamic branch scoping check (checking admissions, enrollments, and leads).
- [x] 2.2 Implement the global preflight lookup query returning masked PII summaries for cross-branch duplicate records.
- [x] 2.3 Implement the verification `OtpService` to manage code generation, storage, and validation.
- [x] 2.4 Implement `StudentMergeService` to execute atomic remapping transactions inside a database transaction, remapping Admissions, Enrollments, Leads, duplicate Person soft-deletes, and handling User account conflict resolutions.
- [x] 2.5 Add audits and status histories in `enrollment-service` and status-change services.

## 3. API Routes

- [x] 3.1 Implement route `/api/v1/students/preflight-lookup` using Zod lookup validator schemas.
- [x] 3.2 Implement route `/api/v1/students/request-profile-otp` for SMS/Email challenge triggers.
- [x] 3.3 Implement route `/api/v1/students/claim-profile` for creating Admission records in claiming branches upon OTP verification.
- [x] 3.4 Implement route `/api/v1/merge` with strict Branch Manager and Compliance permission guards.

## 4. UI Screens

- [x] 4.1 Update Student Registration drawer form to execute the preflight lookup before displaying detail fields.
- [x] 4.2 Add OTP Verification claim modal window when cross-branch matching profiles are found during preflight.
- [x] 4.3 Add Merge Profile trigger action in Student Directory/Detail view for authorized roles to resolve historical duplicates.
- [x] 4.4 Build the ID Card Management panel allowing card issue/reissues and displaying print histories.
- [x] 4.5 Ensure Student Portal profile page inputs are completely disabled and read-only.

## 5. Tests

- [x] 5.1 Write integration tests verifying dynamic branch scoped access policies.
- [x] 5.2 Write unit tests verifying atomic profile merge reassignments and soft-deletes.
- [x] 5.3 Write UI validation tests checking form behavior and read-only states in the student portal.
- [ ] 5.4 Execute linting, typechecks (`pnpm run typecheck`), and Vitest test suites to verify stability.
