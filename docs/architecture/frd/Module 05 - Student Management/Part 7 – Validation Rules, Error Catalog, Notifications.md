# Part 7 – Validation Rules, Error Catalog, Notifications

## Module 5 – Student Management

## 1. Purpose

This document defines:

1. custom business validations,
2. structured error catalog,
3. module-specific notification events and templates

for **Module 5 – Student Management**.

These rules are applied at the API boundary, domain service layer, persistence layer where appropriate, and workflow orchestration layer.

---

## 2. Validation Design Principles

1. Client-side validation improves usability but does not replace server-side validation.
2. Every branch-scoped rule must be re-checked server-side.
3. Duplicate detection is a domain validation, not merely a UI warning.
4. Identity uniqueness must consider soft-deleted records and merge history.
5. Date validation uses Oman business date (`Asia/Muscat`, UTC+4).
6. Sensitive workflows require reason text with minimum length.
7. Effective date validation must prevent inverted ranges.
8. Downstream policy checks may block student archival, restore, or merge.
9. Notification-triggering actions must commit successfully before dispatch.
10. Validation errors must return stable machine-readable codes.

---

## 3. Business Validation Schemas

## 3.1 Student Direct Registration Validation

### Rule ID: VAL-SM-001

**Name:** Minimum direct-registration identity set

**Rule**
A direct-registration request is valid only if all of the following are present:

- first name in English
- last name in English
- nationality
- primary phone
- joined date
- at least one deduplication key from:
  - civil ID
  - passport number
  - visa number
  - primary email
  - primary phone

**Failure Codes**

- `ERR_STU_MISSING_REQUIRED_NAME`
- `ERR_STU_MISSING_NATIONALITY`
- `ERR_STU_MISSING_PRIMARY_PHONE`
- `ERR_STU_MISSING_DEDUP_KEY`

---

## 3.2 Name Format Validation

### Rule ID: VAL-SM-002

**Name:** English and Arabic name format rules

**Rules**

- English names must match:
  - `^[A-Za-z][A-Za-z '.-]{0,98}[A-Za-z.]$`
- Arabic full name, when provided, must match:
  - `^[\u0600-\u06FF][\u0600-\u06FF\s'.-]{0,198}[\u0600-\u06FF]$`

**Failure Codes**

- `ERR_STU_INVALID_FIRST_NAME_EN`
- `ERR_STU_INVALID_MIDDLE_NAME_EN`
- `ERR_STU_INVALID_LAST_NAME_EN`
- `ERR_STU_INVALID_FULL_NAME_AR`

---

## 3.3 Date of Birth Validation

### Rule ID: VAL-SM-003

**Name:** Age and chronology bounds

**Rules**

1. `dateOfBirth <= currentBusinessDate`
2. Age cannot exceed 120 years.
3. `dateOfBirth <= joinedAt` when both are present.

**Failure Codes**

- `ERR_STU_DOB_IN_FUTURE`
- `ERR_STU_AGE_OUT_OF_RANGE`
- `ERR_STU_DOB_AFTER_JOINED_AT`

---

## 3.4 Joined Date Validation

### Rule ID: VAL-SM-004

**Name:** Joined date bounds

**Rules**

1. `joinedAt <= currentBusinessDate`
2. `joinedAt >= instituteEffectiveStartDate` if institute policy enforces it
3. On creation from admission or corporate participant, joined date must not be earlier than source business artifact date when policy blocks retroactive assignment

**Failure Codes**

- `ERR_STU_JOINED_AT_IN_FUTURE`
- `ERR_STU_JOINED_AT_BEFORE_INSTITUTE_START`
- `ERR_STU_JOINED_AT_BEFORE_SOURCE_ALLOWED_DATE`

---

## 3.5 Email Validation

### Rule ID: VAL-SM-005

**Name:** Email syntax and normalization

**Rules**

1. If present, email must be valid RFC-like business email syntax.
2. Email is stored lowercased.
3. Duplicate screening compares normalized lowercase email.

**Failure Codes**

- `ERR_STU_INVALID_EMAIL`
- `ERR_STU_EMAIL_CONFLICT`

---

## 3.6 Phone Validation

### Rule ID: VAL-SM-006

**Name:** Phone syntax and normalization

**Rules**

1. Primary phone must match `^\+?[1-9]\d{7,14}$`
2. System stores canonical format.
3. Duplicate screening compares canonicalized phone.

**Failure Codes**

- `ERR_STU_INVALID_PRIMARY_PHONE`
- `ERR_STU_PHONE_CONFLICT`

---

## 3.7 Identity Number Validation

### Rule ID: VAL-SM-007

**Name:** Civil ID, passport, and visa validation

**Rules**

1. Civil ID must match `^[A-Za-z0-9-]{5,30}$`
2. Passport number must match `^[A-Za-z0-9]{3,20}$`
3. Visa number must match `^[A-Za-z0-9/-]{3,30}$`
4. Uniqueness checks are case-insensitive where applicable.
5. Identity fields may be null individually but not all deduplication keys can be absent in direct registration flow.

**Failure Codes**

- `ERR_STU_INVALID_CIVIL_ID`
- `ERR_STU_INVALID_PASSPORT_NUMBER`
- `ERR_STU_INVALID_VISA_NUMBER`
- `ERR_STU_CIVIL_ID_CONFLICT`
- `ERR_STU_PASSPORT_CONFLICT`
- `ERR_STU_VISA_CONFLICT`

---

## 3.8 Duplicate Detection Validation

### Rule ID: VAL-SM-008

**Name:** Blocking duplicate rule

**Rules**

1. Duplicate screening is mandatory before create and on identity-affecting updates.
2. Exact student match returns existing student instead of creating a new one.
3. Exact person match without student routes to reuse/create-student-on-existing-person.
4. Blocking risk prevents create/update until duplicate case is resolved.
5. Duplicate scoring considers:
   - exact civil ID match,
   - exact passport match,
   - exact visa match,
   - exact phone match,
   - exact email match,
   - high-confidence bilingual name similarity plus date of birth match.

**Suggested Scoring Thresholds**

- 100: exact same existing student by person ID
- 95+: blocking duplicate
- 75–94.99: review required
- <75: informational / no block unless policy tightens

**Failure Codes**

- `ERR_STU_DUPLICATE_BLOCKING_MATCH`
- `ERR_STU_DUPLICATE_REVIEW_REQUIRED`
- `ERR_STU_PERSON_ALREADY_HAS_PROFILE`

---

## 3.9 One Active Student Profile Per Person

### Rule ID: VAL-SM-009

**Rule**
A person may have at most one active, non-deleted `StudentProfile`.

**Failure Code**

- `ERR_STU_PERSON_ALREADY_HAS_PROFILE`

---

## 3.10 Student Number Generation Validation

### Rule ID: VAL-SM-010

**Rule**
Creation requires an active numbering series applicable to the target branch or institute fallback policy.

**Failure Codes**

- `ERR_CFG_NUMBERING_SERIES_NOT_FOUND`
- `ERR_CFG_NUMBERING_SERIES_EXHAUSTED`
- `ERR_STU_STUDENT_NUMBER_GENERATION_FAILED`

---

## 3.11 ID Card Validation

### Rule ID: VAL-SM-011

**Rules**

1. `idCardIssued = true` requires non-empty `idCardNumber`
2. `idCardIssued = false` requires null current `idCardNumber`
3. Current active ID card number must be unique among non-deleted students
4. Reissue requires existing issued card
5. Reissue new number must differ from current number
6. Reissue reason required, minimum 10 characters
7. Reissue date must be <= current business date

**Failure Codes**

- `ERR_STU_ID_CARD_NUMBER_REQUIRED`
- `ERR_STU_ID_CARD_NUMBER_FORBIDDEN_WHEN_NOT_ISSUED`
- `ERR_STU_ID_CARD_NUMBER_EXISTS`
- `ERR_STU_ID_CARD_NOT_ISSUED`
- `ERR_STU_ID_CARD_REISSUE_NUMBER_SAME_AS_CURRENT`
- `ERR_STU_INVALID_REISSUE_DATE`

---

## 3.12 Status Transition Validation

### Rule ID: VAL-SM-012

**Allowed Transitions**

- `Pending -> Active`
- `Pending -> Archived`
- `Active -> Suspended`
- `Suspended -> Active`
- `Active -> Archived`
- `Suspended -> Archived`
- `Archived -> Active`
- `Archived -> Suspended` only if policy permits

**Rules**

1. Transition reason required for all non-creation changes.
2. Effective date cannot be inverted.
3. Archived record cannot be edited directly until restored.
4. Archived transition must set soft delete markers.

**Failure Codes**

- `ERR_STU_INVALID_STATUS_TRANSITION`
- `ERR_STU_STATUS_REASON_REQUIRED`
- `ERR_STU_INVALID_EFFECTIVE_DATES`
- `ERR_STU_ARCHIVED_READ_ONLY`

---

## 3.13 Archive Policy Validation

### Rule ID: VAL-SM-013

**Rules**
Archive is blocked when:

- downstream policy says active enrollments block archival,
- unresolved duplicate merge transaction is running,
- mandatory compliance hold prevents archival.

**Failure Codes**

- `ERR_STU_ARCHIVE_BLOCKED_BY_ACTIVE_ENROLLMENT_POLICY`
- `ERR_STU_ARCHIVE_BLOCKED_BY_MERGE_IN_PROGRESS`
- `ERR_STU_ARCHIVE_BLOCKED_BY_COMPLIANCE_HOLD`

---

## 3.14 Restore Validation

### Rule ID: VAL-SM-014

**Rules**

1. Restore allowed only for archived records.
2. Restore target status must be `Active` or `Suspended`.
3. Restore effective date must be <= current business date.
4. Restore requires reason.

**Failure Codes**

- `ERR_STU_NOT_ARCHIVED`
- `ERR_STU_INVALID_RESTORE_TARGET_STATUS`
- `ERR_STU_RESTORE_REASON_REQUIRED`

---

## 3.15 Merge Validation

### Rule ID: VAL-SM-015

**Rules**

1. Survivor and source must differ.
2. Both records must exist and be in caller scope.
3. Source must not already be merged.
4. Required reason minimum 20 characters.
5. Merge must run in one transaction across:
   - student master resolution,
   - source archival,
   - reference reassignment,
   - duplicate case resolution,
   - audit creation.
6. Downstream reference reassignment must succeed or merge fails atomically.
7. Merge confirmation text must exactly match survivor student number in UI/API command contract if enabled.

**Failure Codes**

- `ERR_STU_MERGE_SELF_FORBIDDEN`
- `ERR_STU_MERGE_SCOPE_DENIED`
- `ERR_STU_MERGE_ALREADY_COMPLETED_FOR_SOURCE`
- `ERR_STU_MERGE_REASON_REQUIRED`
- `ERR_STU_MERGE_REFERENCE_REASSIGN_FAILED`
- `ERR_STU_MERGE_TRANSACTION_FAILED`

---

## 3.16 Export Validation

### Rule ID: VAL-SM-016

**Rules**

1. Export requires `student.export`.
2. Export cannot exceed branch scope.
3. Sensitive identity inclusion requires elevated permission.
4. Reason required when sensitive identity data is included.
5. Selected-row export requires non-empty `selectedStudentIds`.
6. Large exports may be queued instead of returned immediately.
7. Export logs must always be written.

**Failure Codes**

- `ERR_STU_EXPORT_PERMISSION_REQUIRED`
- `ERR_STU_UNMASKED_IDENTITY_PERMISSION_REQUIRED`
- `ERR_STU_EXPORT_REASON_REQUIRED`
- `ERR_STU_INVALID_EXPORT_SCOPE`
- `ERR_STU_EXPORT_ROW_LIMIT_EXCEEDED`
- `ERR_STU_EXPORT_FAILED`

---

## 3.17 Branch Scope Validation

### Rule ID: VAL-SM-017

**Rules**

1. Caller must have permission and branch access.
2. Cross-branch reads require assigned branch and, where applicable, consolidated permission.
3. Cross-branch writes are allowed only where explicit assigned branch write rights exist.
4. Trainer quick view is roster-context scoped only.
5. Student portal is self-profile scoped only.

**Failure Codes**

- `ERR_AUTH_BRANCH_SCOPE_DENIED`
- `ERR_STU_MERGE_SCOPE_DENIED`
- `ERR_TRN_BATCH_OR_STUDENT_NOT_FOUND_IN_CONTEXT`

---

## 3.18 Concurrency Validation

### Rule ID: VAL-SM-018

**Rules**

1. Update, status change, archive, restore, ID card update, and merge use optimistic concurrency version checks.
2. If the submitted version does not match the latest persisted version, reject.

**Failure Code**

- `ERR_STU_CONCURRENT_MODIFICATION`

---

## 4. Structured Error Code Catalog

## 4.1 Authentication and Authorization Errors

| Code                           | HTTP | Meaning                               | Typical Trigger                          |
| ------------------------------ | ---: | ------------------------------------- | ---------------------------------------- |
| `ERR_AUTH_UNAUTHENTICATED`     |  401 | User is not authenticated             | Missing/expired session                  |
| `ERR_AUTH_PERMISSION_DENIED`   |  403 | Required permission missing           | Role lacks action/menu/report permission |
| `ERR_AUTH_BRANCH_SCOPE_DENIED` |  403 | Requested branch outside caller scope | Cross-branch access without rights       |

## 4.2 Student Existence and Lookup Errors

| Code                                            | HTTP | Meaning                                   | Typical Trigger                           |
| ----------------------------------------------- | ---: | ----------------------------------------- | ----------------------------------------- |
| `ERR_STU_NOT_FOUND`                             |  404 | Student profile not found                 | Bad UUID or concealed out-of-scope record |
| `ERR_STU_PORTAL_PROFILE_NOT_LINKED`             |  404 | Student portal user has no linked profile | Missing portal linkage                    |
| `ERR_TRN_BATCH_OR_STUDENT_NOT_FOUND_IN_CONTEXT` |  404 | Trainer roster context invalid            | Student not in trainer batch              |

## 4.3 Input and Validation Errors

| Code                                           | HTTP | Meaning                                   |
| ---------------------------------------------- | ---: | ----------------------------------------- |
| `ERR_STU_INVALID_PAYLOAD`                      |  400 | Request payload invalid                   |
| `ERR_STU_INVALID_QUERY`                        |  400 | Query string invalid                      |
| `ERR_STU_INVALID_LOOKUP_PAYLOAD`               |  400 | Lookup payload invalid                    |
| `ERR_STU_INVALID_DUPLICATE_CHECK_PAYLOAD`      |  400 | Duplicate screening payload invalid       |
| `ERR_STU_MISSING_REQUIRED_NAME`                |  422 | Mandatory name field missing              |
| `ERR_STU_MISSING_NATIONALITY`                  |  422 | Nationality missing                       |
| `ERR_STU_MISSING_PRIMARY_PHONE`                |  422 | Primary phone missing                     |
| `ERR_STU_MISSING_DEDUP_KEY`                    |  422 | No deduplication key provided             |
| `ERR_STU_INVALID_FIRST_NAME_EN`                |  422 | Invalid English first name                |
| `ERR_STU_INVALID_MIDDLE_NAME_EN`               |  422 | Invalid English middle name               |
| `ERR_STU_INVALID_LAST_NAME_EN`                 |  422 | Invalid English last name                 |
| `ERR_STU_INVALID_FULL_NAME_AR`                 |  422 | Invalid Arabic full name                  |
| `ERR_STU_DOB_IN_FUTURE`                        |  422 | DOB in future                             |
| `ERR_STU_AGE_OUT_OF_RANGE`                     |  422 | Age exceeds allowed range                 |
| `ERR_STU_DOB_AFTER_JOINED_AT`                  |  422 | DOB after joined date                     |
| `ERR_STU_JOINED_AT_IN_FUTURE`                  |  422 | Joined date in future                     |
| `ERR_STU_JOINED_AT_BEFORE_INSTITUTE_START`     |  422 | Joined date before allowed institute date |
| `ERR_STU_JOINED_AT_BEFORE_SOURCE_ALLOWED_DATE` |  422 | Joined date before source workflow allows |
| `ERR_STU_INVALID_EMAIL`                        |  422 | Invalid email                             |
| `ERR_STU_INVALID_PRIMARY_PHONE`                |  422 | Invalid phone                             |
| `ERR_STU_INVALID_CIVIL_ID`                     |  422 | Invalid civil ID                          |
| `ERR_STU_INVALID_PASSPORT_NUMBER`              |  422 | Invalid passport number                   |
| `ERR_STU_INVALID_VISA_NUMBER`                  |  422 | Invalid visa number                       |
| `ERR_STU_INVALID_JOINED_AT`                    |  422 | Joined date invalid                       |
| `ERR_STU_INVALID_DOB`                          |  422 | DOB invalid                               |
| `ERR_STU_INVALID_EFFECTIVE_DATES`              |  422 | Effective dates invalid                   |
| `ERR_STU_INVALID_RESTORE_TARGET_STATUS`        |  422 | Invalid restore target status             |
| `ERR_STU_INVALID_REISSUE_DATE`                 |  422 | Invalid reissue date                      |
| `ERR_STU_INVALID_EXPORT_REQUEST`               |  422 | Export payload invalid                    |
| `ERR_STU_INVALID_EXPORT_SCOPE`                 |  422 | Export scope invalid                      |
| `ERR_STU_INVALID_DUPLICATE_RESOLUTION`         |  422 | Duplicate resolution invalid              |
| `ERR_STU_INVALID_MERGE_PAYLOAD`                |  422 | Merge payload invalid                     |

## 4.4 Duplicate and Identity Conflict Errors

| Code                                      | HTTP | Meaning                                  |
| ----------------------------------------- | ---: | ---------------------------------------- |
| `ERR_STU_DUPLICATE_BLOCKING_MATCH`        |  409 | Blocking duplicate found                 |
| `ERR_STU_DUPLICATE_REVIEW_REQUIRED`       |  409 | Review required duplicate match          |
| `ERR_STU_PERSON_ALREADY_HAS_PROFILE`      |  409 | Person already linked to student profile |
| `ERR_STU_EMAIL_CONFLICT`                  |  409 | Email conflict                           |
| `ERR_STU_PHONE_CONFLICT`                  |  409 | Phone conflict                           |
| `ERR_STU_CIVIL_ID_CONFLICT`               |  409 | Civil ID conflict                        |
| `ERR_STU_PASSPORT_CONFLICT`               |  409 | Passport conflict                        |
| `ERR_STU_VISA_CONFLICT`                   |  409 | Visa conflict                            |
| `ERR_STU_IDENTITY_CONFLICT`               |  409 | General identity conflict                |
| `ERR_STU_DUPLICATE_CASE_NOT_FOUND`        |  404 | Duplicate case not found                 |
| `ERR_STU_DUPLICATE_CASE_ALREADY_RESOLVED` |  409 | Duplicate case already resolved          |

## 4.5 Status and Lifecycle Errors

| Code                                                  | HTTP | Meaning                           |
| ----------------------------------------------------- | ---: | --------------------------------- |
| `ERR_STU_INVALID_STATUS_TRANSITION`                   |  409 | Status transition not allowed     |
| `ERR_STU_STATUS_REASON_REQUIRED`                      |  422 | Status reason missing             |
| `ERR_STU_ARCHIVED_READ_ONLY`                          |  422 | Archived record cannot be edited  |
| `ERR_STU_ALREADY_ARCHIVED`                            |  409 | Record already archived           |
| `ERR_STU_NOT_ARCHIVED`                                |  409 | Restore attempted on non-archived |
| `ERR_STU_ARCHIVE_BLOCKED_BY_POLICY`                   |  409 | Archive blocked by policy         |
| `ERR_STU_ARCHIVE_BLOCKED_BY_ACTIVE_ENROLLMENT_POLICY` |  409 | Active enrollments block archival |
| `ERR_STU_ARCHIVE_BLOCKED_BY_MERGE_IN_PROGRESS`        |  409 | Merge in progress blocks archival |
| `ERR_STU_ARCHIVE_BLOCKED_BY_COMPLIANCE_HOLD`          |  409 | Compliance hold blocks archival   |
| `ERR_STU_RESTORE_REASON_REQUIRED`                     |  422 | Restore reason required           |

## 4.6 ID Card Errors

| Code                                               | HTTP | Meaning                                  |
| -------------------------------------------------- | ---: | ---------------------------------------- |
| `ERR_STU_ID_CARD_NUMBER_REQUIRED`                  |  422 | ID card number required when issuing     |
| `ERR_STU_ID_CARD_NUMBER_FORBIDDEN_WHEN_NOT_ISSUED` |  422 | ID card number present when issued=false |
| `ERR_STU_ID_CARD_NUMBER_EXISTS`                    |  409 | Duplicate current ID card number         |
| `ERR_STU_ID_CARD_NOT_ISSUED`                       |  409 | Reissue attempted without issued card    |
| `ERR_STU_ID_CARD_REISSUE_NUMBER_SAME_AS_CURRENT`   |  422 | Reissue number equals current            |

## 4.7 Merge Errors

| Code                                         | HTTP | Meaning                                  |
| -------------------------------------------- | ---: | ---------------------------------------- |
| `ERR_STU_MERGE_SELF_FORBIDDEN`               |  409 | Source and survivor are same             |
| `ERR_STU_MERGE_SCOPE_DENIED`                 |  409 | Merge scope not allowed                  |
| `ERR_STU_MERGE_ALREADY_COMPLETED_FOR_SOURCE` |  409 | Source already merged                    |
| `ERR_STU_MERGE_REASON_REQUIRED`              |  422 | Merge reason missing                     |
| `ERR_STU_MERGE_REFERENCE_REASSIGN_FAILED`    |  500 | Downstream reference reassignment failed |
| `ERR_STU_MERGE_TRANSACTION_FAILED`           |  500 | Merge transaction failed                 |

## 4.8 Export Errors

| Code                                            | HTTP | Meaning                                    |
| ----------------------------------------------- | ---: | ------------------------------------------ |
| `ERR_STU_EXPORT_PERMISSION_REQUIRED`            |  403 | Export permission missing                  |
| `ERR_STU_UNMASKED_IDENTITY_PERMISSION_REQUIRED` |  403 | Unmasked sensitive export not allowed      |
| `ERR_STU_EXPORT_REASON_REQUIRED`                |  422 | Export reason missing for sensitive export |
| `ERR_STU_EXPORT_ROW_LIMIT_EXCEEDED`             |  422 | Export exceeds permitted limit             |
| `ERR_STU_EXPORT_FAILED`                         |  500 | Export processing failed                   |
| `ERR_STU_EXPORT_LOG_NOT_FOUND`                  |  404 | Export log not found                       |

## 4.9 Configuration and System Errors

| Code                                       | HTTP | Meaning                           |
| ------------------------------------------ | ---: | --------------------------------- |
| `ERR_CFG_NUMBERING_SERIES_NOT_FOUND`       |  404 | Required numbering series missing |
| `ERR_CFG_NUMBERING_SERIES_EXHAUSTED`       |  409 | Numbering series exhausted        |
| `ERR_STU_STUDENT_NUMBER_GENERATION_FAILED` |  500 | Could not generate student number |
| `ERR_SYS_INTERNAL`                         |  500 | Generic internal failure          |

## 4.10 External Context Errors

| Code                                      | HTTP | Meaning                                             |
| ----------------------------------------- | ---: | --------------------------------------------------- |
| `ERR_ADM_NOT_FOUND`                       |  404 | Admission not found                                 |
| `ERR_ADM_NOT_APPROVED`                    |  409 | Admission not approved                              |
| `ERR_CORP_PARTICIPANT_NOT_FOUND`          |  404 | Corporate participant not found                     |
| `ERR_CORP_PARTICIPANT_ALREADY_LINKED`     |  409 | Corporate participant already linked                |
| `ERR_STU_MISSING_CORPORATE_IDENTITY_DATA` |  422 | Corporate conversion lacks required identity fields |

---

## 5. Notification Principles

1. Notifications are sent only after successful transaction commit.
2. Branch-scoped communication policies determine channel eligibility.
3. Templates must support English and Arabic where configured.
4. Personal data included in notifications must be minimal.
5. Audit-worthy notifications should create communication log records in the Communication context.
6. Some notifications are optional and policy-driven rather than mandatory.

---

## 6. Notification Event Catalog

## 6.1 Event: `StudentProfileCreated`

**Trigger**

- Successful student creation via admission, direct registration, corporate conversion, walk-in handoff, or online handoff

**Default Recipients**

- Student Administration Officer who initiated the action
- Branch Admin / Branch Manager optional
- Student optional if self-notification policy enabled and verified contact exists

**Recommended Channels**

- SystemNotification: Yes
- Email: Optional
- SMS: Optional
- WhatsApp: Optional

**Template Variables**

- `studentNumber`
- `studentFullNameEn`
- `studentFullNameAr`
- `branchNameEn`
- `branchNameAr`
- `creationSource`
- `joinedAt`
- `createdByDisplayName`
- `portalUrl` (internal or student-facing where applicable)

---

## 6.2 Event: `StudentDuplicateCaseCreated`

**Trigger**

- Duplicate screening opens a review or blocking duplicate case

**Default Recipients**

- Student Administration Officer group for target branch
- Compliance Officer group if risk is `Blocking`
- Initiating user

**Channels**

- SystemNotification: Yes
- Email: Yes for `Blocking`
- SMS: No
- WhatsApp: Optional for urgent branch ops group if policy allows

**Template Variables**

- `duplicateCaseNumber`
- `riskLevel`
- `triggerSummary`
- `sourceType`
- `branchNameEn`
- `branchNameAr`
- `initiatedByDisplayName`
- `candidateCount`
- `workbenchUrl`

---

## 6.3 Event: `StudentDuplicateCaseResolved`

**Trigger**

- Duplicate case resolved without merge

**Recipients**

- Initiating user
- Student Administration Officer
- Compliance Officer optional

**Channels**

- SystemNotification: Yes
- Email: Optional

**Template Variables**

- `duplicateCaseNumber`
- `resolutionType`
- `resolutionReason`
- `resolvedByDisplayName`
- `resolvedAt`
- `branchNameEn`
- `branchNameAr`

---

## 6.4 Event: `StudentProfilesMerged`

**Trigger**

- Successful merge completion

**Recipients**

- Student Administration Officer
- Branch Manager
- Compliance Officer
- Initiating user
- Downstream module ops mailbox optional

**Channels**

- SystemNotification: Yes
- Email: Yes
- SMS: No
- WhatsApp: Optional internal ops group only

**Template Variables**

- `mergeLogId`
- `survivorStudentNumber`
- `survivorStudentFullNameEn`
- `survivorStudentFullNameAr`
- `sourceStudentNumber`
- `sourceStudentFullNameEn`
- `sourceStudentFullNameAr`
- `reassignedAdmissionsCount`
- `reassignedEnrollmentsCount`
- `reassignedDocumentsCount`
- `mergedByDisplayName`
- `mergeReason`
- `branchNameEn`
- `branchNameAr`
- `detailUrl`

---

## 6.5 Event: `StudentStatusChanged`

**Trigger**

- Successful status change

**Recipients**

- Initiating user
- Branch Manager
- Student optional if configured and communication is appropriate
- Related operational role group if status is `Suspended` or `Archived`

**Channels**

- SystemNotification: Yes
- Email: Optional
- SMS: Optional for student-facing suspension notice if policy allows
- WhatsApp: Optional

**Template Variables**

- `studentNumber`
- `studentFullNameEn`
- `studentFullNameAr`
- `oldStatus`
- `newStatus`
- `effectiveStartDate`
- `effectiveEndDate`
- `reason`
- `changedByDisplayName`
- `branchNameEn`
- `branchNameAr`

---

## 6.6 Event: `StudentArchived`

**Trigger**

- Archive committed

**Recipients**

- Initiating user
- Branch Manager
- Compliance Officer optional

**Channels**

- SystemNotification: Yes
- Email: Optional

**Template Variables**

- `studentNumber`
- `studentFullNameEn`
- `studentFullNameAr`
- `archiveReason`
- `archivedByDisplayName`
- `archivedAt`
- `branchNameEn`
- `branchNameAr`

---

## 6.7 Event: `StudentRestored`

**Trigger**

- Restore committed

**Recipients**

- Initiating user
- Branch Manager
- Student Administration Officer group

**Channels**

- SystemNotification: Yes
- Email: Optional

**Template Variables**

- `studentNumber`
- `studentFullNameEn`
- `studentFullNameAr`
- `restoreTargetStatus`
- `restoreReason`
- `restoredByDisplayName`
- `restoredAt`
- `branchNameEn`
- `branchNameAr`

---

## 6.8 Event: `StudentIdCardIssued`

**Trigger**

- First ID card issue

**Recipients**

- Initiating user
- Student optional
- Branch Admin optional

**Channels**

- SystemNotification: Yes
- Email: Optional
- SMS: Optional student-facing
- WhatsApp: Optional student-facing if enabled

**Template Variables**

- `studentNumber`
- `studentFullNameEn`
- `studentFullNameAr`
- `idCardNumberMasked`
- `issueDate`
- `issuedByDisplayName`
- `branchNameEn`
- `branchNameAr`

---

## 6.9 Event: `StudentIdCardReissued`

**Trigger**

- ID card reissue committed

**Recipients**

- Initiating user
- Student optional
- Branch Admin optional
- Compliance Officer optional

**Channels**

- SystemNotification: Yes
- Email: Optional
- SMS: Optional
- WhatsApp: Optional

**Template Variables**

- `studentNumber`
- `studentFullNameEn`
- `studentFullNameAr`
- `oldIdCardNumberMasked`
- `newIdCardNumberMasked`
- `reissueDate`
- `reissueReason`
- `reissuedByDisplayName`
- `branchNameEn`
- `branchNameAr`

---

## 6.10 Event: `StudentExportRequested`

**Trigger**

- Export request submitted

**Recipients**

- Requesting user only by default
- Compliance Officer optional for sensitive exports

**Channels**

- SystemNotification: Yes
- Email: Optional

**Template Variables**

- `exportLogId`
- `exportScope`
- `exportFormat`
- `rowCount`
- `includedMaskedIdentity`
- `requestedByDisplayName`
- `branchNameEn`
- `branchNameAr`

---

## 6.11 Event: `StudentExportCompleted`

**Trigger**

- Export generated successfully

**Recipients**

- Requesting user

**Channels**

- SystemNotification: Yes
- Email: Optional

**Template Variables**

- `exportLogId`
- `exportFormat`
- `rowCount`
- `downloadUrl`
- `completedAt`

---

## 6.12 Event: `StudentExportFailed`

**Trigger**

- Export job fails

**Recipients**

- Requesting user
- Ops support mailbox optional

**Channels**

- SystemNotification: Yes
- Email: Optional

**Template Variables**

- `exportLogId`
- `exportFormat`
- `failureReason`
- `failedAt`

---

## 7. Template Variable Dictionary

| Variable                     | Meaning                              |
| ---------------------------- | ------------------------------------ |
| `studentNumber`              | Institutional student number         |
| `studentFullNameEn`          | English student full name            |
| `studentFullNameAr`          | Arabic student full name             |
| `branchNameEn`               | Branch name in English               |
| `branchNameAr`               | Branch name in Arabic                |
| `creationSource`             | Origin of student profile creation   |
| `joinedAt`                   | Student joining date                 |
| `createdByDisplayName`       | Display name of creator              |
| `duplicateCaseNumber`        | Duplicate case human-readable number |
| `riskLevel`                  | Duplicate case risk level            |
| `triggerSummary`             | Duplicate trigger explanation        |
| `candidateCount`             | Count of case candidates             |
| `workbenchUrl`               | Duplicate workbench link             |
| `resolutionType`             | Duplicate resolution decision        |
| `resolutionReason`           | Resolution explanation               |
| `resolvedByDisplayName`      | Resolver display name                |
| `mergeLogId`                 | Merge log identifier                 |
| `survivorStudentNumber`      | Surviving student number             |
| `sourceStudentNumber`        | Source merged student number         |
| `reassignedAdmissionsCount`  | Count of admissions reassigned       |
| `reassignedEnrollmentsCount` | Count of enrollments reassigned      |
| `reassignedDocumentsCount`   | Count of documents reassigned        |
| `mergeReason`                | Merge reason                         |
| `oldStatus`                  | Previous student status              |
| `newStatus`                  | New student status                   |
| `effectiveStartDate`         | Status effective start date          |
| `effectiveEndDate`           | Status effective end date            |
| `archiveReason`              | Archive reason                       |
| `restoreReason`              | Restore reason                       |
| `restoreTargetStatus`        | Status after restore                 |
| `idCardNumberMasked`         | Masked current ID card number        |
| `oldIdCardNumberMasked`      | Masked previous ID card number       |
| `newIdCardNumberMasked`      | Masked new ID card number            |
| `issueDate`                  | ID card issue date                   |
| `reissueDate`                | ID card reissue date                 |
| `exportLogId`                | Export request identifier            |
| `exportScope`                | Requested export scope               |
| `exportFormat`               | Export output format                 |
| `rowCount`                   | Exported row count                   |
| `includedMaskedIdentity`     | Sensitive identity inclusion flag    |
| `downloadUrl`                | Temporary export file URL            |
| `detailUrl`                  | Internal detail link                 |
| `portalUrl`                  | Portal link where relevant           |

---

## 8. Notification Delivery Rules

1. Student-facing notifications are sent only if:
   - contact method is verified or trusted by policy,
   - communication preference allows the channel,
   - message content does not expose restricted internal-only details.
2. Internal notifications should include direct deep links to the relevant page where feasible.
3. Duplicate-case blocking notifications should be high-priority system notifications.
4. Merge notifications should never include full unmasked identity numbers.
5. Export notifications must not attach sensitive files directly by email unless policy explicitly allows it; prefer secure download links.
6. All notifications should be logged in the Communication context with:
   - template code,
   - channel,
   - recipient,
   - payload,
   - delivery status.

---

## 9. Recommended Template Codes

| Event                        | Template Code                 |
| ---------------------------- | ----------------------------- |
| StudentProfileCreated        | `STU_PROFILE_CREATED`         |
| StudentDuplicateCaseCreated  | `STU_DUPLICATE_CASE_CREATED`  |
| StudentDuplicateCaseResolved | `STU_DUPLICATE_CASE_RESOLVED` |
| StudentProfilesMerged        | `STU_PROFILES_MERGED`         |
| StudentStatusChanged         | `STU_STATUS_CHANGED`          |
| StudentArchived              | `STU_ARCHIVED`                |
| StudentRestored              | `STU_RESTORED`                |
| StudentIdCardIssued          | `STU_IDCARD_ISSUED`           |
| StudentIdCardReissued        | `STU_IDCARD_REISSUED`         |
| StudentExportRequested       | `STU_EXPORT_REQUESTED`        |
| StudentExportCompleted       | `STU_EXPORT_COMPLETED`        |
| StudentExportFailed          | `STU_EXPORT_FAILED`           |

---

## 10. Final Notes

1. Error codes are stable contract values and should not be changed without versioning.
2. Notifications are policy-driven; channels may be enabled branch-by-branch.
3. Business validation must remain stronger than UI validation.
4. Duplicate, merge, archive, restore, ID-card, and export workflows are all compliance-sensitive and must create audit records in addition to returning API errors or success responses.
