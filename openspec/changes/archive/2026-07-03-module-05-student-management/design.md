## Context

We are implementing Module 05 – Student Management for ASTI. The database schema has been updated to support status history, merge logs, and ID card reissues. The TypeScript monorepo codebase has also been updated and typechecks cleanly.

This design document outlines the runtime decisions for API routes, application services, dynamic visibility scoping, duplicate blocking, and profile merging.

---

## Goals / Non-Goals

**Goals:**

- Implement dynamic visibility checks to allow multiple branches to view a student profile if active business relationships (Admissions, Enrollments, or Leads) exist in those branches.
- Implement a global preflight lookup search that checks active mobile numbers and email addresses across all branches.
- Enforce strict blocking at registration: do not allow the creation of duplicate student records if a mobile number or email address matches an active profile.
- Establish an OTP-based verification workflow to authorize claiming and linking a student to a new branch.
- Provide a transactional merge profile handler to consolidate historical duplicates.

**Non-Goals:**

- Real-time or batch fuzzy matching engines (fuzzy names, DOB, Civil ID).
- Duplicate case review workbench or case lifecycle state machines (duplicate creation is blocked by design at registration).
- Online payment integrations or automated gateway transactions.

---

## Decisions & Detailed Technical Design

### 1. Duplicate Blocking Policy

- Uniqueness of `mobile` and `email` is strictly enforced at the application boundary for active student profiles.
- If a counselor attempts to register a student with an email or mobile that already exists globally on an active student profile, the request is **blocked** with `ERR_STU_IDENTITY_CONFLICT`.
- **No overrides are permitted.** The counselor must either:
  1. Initiate the OTP claim flow to link the existing student profile to their branch.
  2. Register the student with different, unique contact details.

### 2. Preflight OTP Claim Sequence

- The Counselor does not have access to a student profile in another branch initially.
- The `POST /api/v1/students/preflight-lookup` endpoint uses a global query and returns a masked DTO if a matching phone/email exists.
- To claim/associate the student, the counselor calls `POST /api/v1/students/request-profile-otp` which triggers an outbox message to email/SMS the student a 6-digit OTP.
- The counselor submits the code to `POST /api/v1/students/claim-profile`. If correct, the system creates a new `Admission` record in the counselor's branch. This Admission automatically grants the branch scope view permission on the student profile.

### 3. Dynamic Visibility & Authorization Scoping

- **Access Rule:** Profile visibility is checked dynamically. A Counselor or manager in Branch X has full access if the student has a linked `Admission`, `Enrollment`, or `Lead` in Branch X, or if Branch X is the student's Home/Origin Branch.

### 4. Deep-Identity Merge Remapping & User Conflict Resolution

For historical duplicate records (or administrative adjustments), authorized managers can execute a merge of `STU-Source` into `STU-Survivor`:

#### Remapping Sequence inside Prisma Transaction:

1. **Admissions Remap:** Update all `admissions` matching `studentProfileId = STU-Source` to point to:
   - `studentProfileId = STU-Survivor`
   - `personId = Person-Survivor`
2. **Enrollments Remap:** Update all `enrollments` matching `studentProfileId = STU-Source` to point to `studentProfileId = STU-Survivor`.
3. **Leads Remap:** Update all `leads` matching `personId = Person-Source` to point to `personId = Person-Survivor`.
4. **Duplicate Person Soft-Delete:** Mark `Person-Source` as soft-deleted (`isDeleted = true`, `deletedAt = now()`).
5. **Duplicate StudentProfile Soft-Delete:** Mark `STU-Source` as soft-deleted (`isDeleted = true`, `status = "Archived"`, `deletedAt = now()`).
6. **StudentMergeLog:** Insert a log entry summarizing remapped foreign key row counts.

#### User Account Conflict Resolution Matrix:

- **Case 1: No User Accounts exist.** (No action needed).
- **Case 2: Only one User Account exists.**
  - If it belongs to `Person-Source`: Update `User.personId` to point to `Person-Survivor` (authorized by checking that `Person-Survivor` does not have an existing user account).
  - If it belongs to `Person-Survivor`: Keep as is.
- **Case 3: Both Person-Source and Person-Survivor have active User Accounts.**
  - Transaction MUST abort and throw `ERR_STU_MERGE_USER_CONFLICT`.
  - Resolution: The operator must manually suspend or delete one of the User accounts in the IAM panel before re-attempting the merge.

---

## Risks / Trade-offs

- **Performance Risk:** Dynamic visibility checks require joining `admissions` and `enrollments` tables.
  - _Mitigation:_ We have added database indexes on `StudentProfile(person_id)`, `StudentProfile(branch_id, student_status)`, `Admission(student_profile_id)`, and `Enrollment(student_profile_id)`.
- **OTP Delivery Failure:** If the student's phone number or email is incorrect, the OTP cannot be received.
  - _Mitigation:_ An administrator can update the student's contact details at the origin branch first after manual ID check.
