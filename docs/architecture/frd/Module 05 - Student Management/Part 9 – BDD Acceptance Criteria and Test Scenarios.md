# Part 9 – BDD Acceptance Criteria and Test Scenarios

## Module 5 – Student Management

## 1. Purpose

This document defines comprehensive BDD acceptance criteria and test scenarios for **Module 5 – Student Management** using Gherkin syntax.

The scenarios cover:

- positive flows,
- negative flows,
- validation failures,
- boundary conditions,
- duplicate detection,
- merge logic,
- status lifecycle,
- archive and restore,
- ID card management,
- reporting,
- permission guards,
- branch data isolation,
- portal-specific read-only behavior.

---

## 2. Conventions

### Feature Tags

- `@student-management`
- `@api`
- `@ui`
- `@security`
- `@branch-scope`
- `@validation`
- `@duplicate`
- `@merge`
- `@reporting`
- `@portal`

### Default Test Data Assumptions

- Institute has branches:
  - Muscat Branch (`MCT`)
  - Sohar Branch (`SHR`)
- Users:
  - `super_admin`
  - `branch_admin_mct`
  - `student_ops_mct`
  - `counselor_mct`
  - `frontdesk_mct`
  - `compliance_user`
  - `reporting_user`
  - `finance_user`
  - `trainer_batch_101`
  - `student_portal_user_1`
- Existing records may include:
  - approved admission,
  - corporate participant,
  - active and archived student profiles,
  - duplicate cases,
  - merge history.

---

## 3. Student Creation Scenarios

@student-management @api @ui
Feature: Create student profile from approved admission

Scenario: Create a new student profile from an approved admission when no student exists for the person
Given an approved admission exists for person "P-1001" in branch "MCT"
And no active or archived student profile exists for person "P-1001"
And the user "counselor_mct" has permission "student.create"
When the user creates a student from that admission with joined date "2026-06-01"
Then the system should create a new student profile
And the student profile should be linked to person "P-1001"
And the student should receive a generated student number
And the student status should be "Active"
And an audit entry should be recorded for student creation

Scenario: Reuse existing student profile from approved admission when student already exists for the person
Given an approved admission exists for person "P-1002" in branch "MCT"
And an active student profile already exists for person "P-1002"
When the user creates a student from that admission
Then the system should not create a duplicate student profile
And the system should return the existing student profile
And the response mode should be "ReusedExisting"

Scenario: Block student creation from admission when admission is not approved
Given an admission exists in status "Submitted" for person "P-1003"
And the user has permission "student.create"
When the user attempts to create a student from the admission
Then the request should fail with error code "ERR_ADM_NOT_APPROVED"
And no student profile should be created

Scenario: Block student creation from admission when blocking duplicate is found
Given an approved admission exists for person "P-1004"
And an existing student in scope has an exact Civil ID match
When the user attempts to create a student from the admission
Then the request should fail with error code "ERR_STU_DUPLICATE_BLOCKING_MATCH"
And a duplicate case should exist in status "Open"

@student-management @validation
Feature: Create student profile by direct registration

Scenario: Create a student by direct registration with valid minimum data
Given the user "frontdesk_mct" has permission "student.create"
And the user has write access to branch "MCT"
When the user submits a direct registration with:
| firstNameEnglish | Ahmed |
| lastNameEnglish | Khalid |
| nationalityCode | OM |
| primaryPhone | +968\*\*\*\*4567 |
| joinedAt | 2026-06-01 |
| civilId | OMAN-12345 |
Then the system should create a student profile
And the creation source should be "DirectRegistration"
And the student should belong to branch "MCT"

Scenario Outline: Reject direct registration when a mandatory field is missing
Given the user "frontdesk_mct" has permission "student.create"
When the user submits direct registration with invalid payload missing "<field>"
Then the request should fail with error code "<errorCode>"
And no student profile should be created

    Examples:
      | field             | errorCode                      |
      | firstNameEnglish  | ERR_STU_MISSING_REQUIRED_NAME  |
      | lastNameEnglish   | ERR_STU_MISSING_REQUIRED_NAME  |
      | nationalityCode   | ERR_STU_MISSING_NATIONALITY    |
      | primaryPhone      | ERR_STU_MISSING_PRIMARY_PHONE  |

Scenario: Reject direct registration when no deduplication key is supplied
Given the user "frontdesk_mct" has permission "student.create"
When the user submits direct registration without civil ID, passport number, visa number, email, and phone
Then the request should fail with error code "ERR_STU_MISSING_DEDUP_KEY"

Scenario: Reject direct registration when joined date is in the future
Given the user "frontdesk_mct" has permission "student.create"
When the user submits direct registration with joined date "2099-01-01"
Then the request should fail with error code "ERR_STU_JOINED_AT_IN_FUTURE"

Scenario: Reject direct registration when date of birth is after joined date
Given the user "frontdesk_mct" has permission "student.create"
When the user submits direct registration with date of birth "2026-06-02" and joined date "2026-06-01"
Then the request should fail with error code "ERR_STU_DOB_AFTER_JOINED_AT"

Scenario: Reject direct registration when English name contains invalid characters
Given the user "frontdesk_mct" has permission "student.create"
When the user submits direct registration with first name "Ahmed123"
Then the request should fail with error code "ERR_STU_INVALID_FIRST_NAME_EN"

---

## 4. Corporate Conversion Scenarios

@student-management
Feature: Convert corporate participant into student profile

Scenario: Create a student from a corporate participant when no student exists
Given a corporate participant exists with linked person "P-2001"
And no student profile exists for that person
And the user "corporate_coordinator" has permission "student.create"
When the user converts the corporate participant into a student in branch "MCT"
Then the system should create a student profile
And the corporate participant should be linked to that student profile
And the creation source should be "CorporateConversion"

Scenario: Reuse an existing student when corporate participant person already has a student profile
Given a corporate participant exists with linked person "P-2002"
And an active student profile already exists for person "P-2002"
When the user converts the corporate participant into a student
Then the system should not create another student profile
And the participant should be linked to the existing student profile

Scenario: Reject corporate conversion when participant is already linked to a student
Given a corporate participant is already linked to student "STU-1001"
When the user attempts conversion again
Then the request should fail with error code "ERR_CORP_PARTICIPANT_ALREADY_LINKED"

---

## 5. Student Search and Detail Scenarios

@student-management @ui
Feature: Search and view students

Scenario: View student list for active branch only
Given the user "student_ops_mct" is assigned to branch "MCT"
And the user has permission "student.read"
When the user opens the student list without consolidated view
Then only students from branch "MCT" should be returned

Scenario: View consolidated student list across assigned branches when permitted
Given the user "reporting_user" is assigned to branches "MCT" and "SHR"
And the user has consolidated reporting permission
When the user opens the student list with consolidated view
Then students from "MCT" and "SHR" should be returned
And no students from unassigned branches should be returned

Scenario: Search student list by global search term
Given a student exists with student number "ASTI-MCT-2026-000231"
When the user searches with term "000231"
Then the matching student should appear in the result set

Scenario: View student detail for an in-scope record
Given student "STU-1001" belongs to branch "MCT"
And the user "student_ops_mct" has access to branch "MCT"
When the user opens the detail page for "STU-1001"
Then the system should return the student profile summary

Scenario: Conceal student detail when record is outside branch scope
Given student "STU-2001" belongs to branch "SHR"
And the user "student_ops_mct" only has access to branch "MCT"
When the user requests the detail page for "STU-2001"
Then the system should respond with "ERR_STU_NOT_FOUND" or equivalent concealed denial
And no student data should be leaked

---

## 6. Update Validation Scenarios

@student-management @validation
Feature: Update student profile

Scenario: Update student contact details successfully
Given an active student exists in branch "MCT"
And the user "student_ops_mct" has permission "student.update"
When the user updates the student's primary email and phone with valid values
Then the system should save the changes
And the student version should increment
And an audit entry should be created

Scenario: Reject update when archived student is edited directly
Given an archived student exists
And the user has permission "student.update"
When the user attempts to edit the archived student
Then the request should fail with error code "ERR_STU_ARCHIVED_READ_ONLY"

Scenario: Reject update when optimistic concurrency version is stale
Given an active student exists with current version "5"
When the user submits an update with version "4"
Then the request should fail with error code "ERR_STU_CONCURRENT_MODIFICATION"

Scenario: Reject update when email conflicts with another student identity
Given another existing person or student already uses email "same@example.com"
When the user updates a student with email "same@example.com"
Then the request should fail with error code "ERR_STU_EMAIL_CONFLICT" or "ERR_STU_IDENTITY_CONFLICT"

Scenario: Reject update when duplicate screening becomes blocking
Given an update changes Civil ID to match an existing student
When the user submits the update
Then the request should fail with error code "ERR_STU_DUPLICATE_BLOCKING_MATCH"

---

## 7. Status Lifecycle Scenarios

@student-management
Feature: Change student status

Scenario Outline: Allow valid status transitions
Given a student exists in status "<oldStatus>"
And the user has permission "student.status.change"
When the user changes the status to "<newStatus>" with valid reason and effective start date
Then the request should succeed
And a status history record should be created
And the student status should become "<newStatus>"

    Examples:
      | oldStatus | newStatus  |
      | Pending   | Active     |
      | Active    | Suspended  |
      | Suspended | Active     |
      | Active    | Archived   |

Scenario Outline: Reject invalid status transitions
Given a student exists in status "<oldStatus>"
And the user has permission "student.status.change"
When the user changes the status to "<newStatus>"
Then the request should fail with error code "ERR_STU_INVALID_STATUS_TRANSITION"

    Examples:
      | oldStatus | newStatus |
      | Archived  | Pending   |
      | Suspended | Pending   |
      | Active    | Pending   |

Scenario: Reject status change when reason is too short
Given an active student exists
When the user changes status with reason "bad"
Then the request should fail with error code "ERR_STU_STATUS_REASON_REQUIRED"

Scenario: Reject status change when effective end date is before effective start date
Given an active student exists
When the user changes status with effective start date "2026-07-10" and effective end date "2026-07-09"
Then the request should fail with error code "ERR_STU_INVALID_EFFECTIVE_DATES"

---

## 8. Archive and Restore Scenarios

@student-management
Feature: Archive and restore student

Scenario: Archive a student successfully
Given an active student exists in branch "MCT"
And the user has permission "student.archive"
When the user archives the student with valid reason
Then the student status should become "Archived"
And isDeleted should become true
And deletedAt should be populated
And an audit entry should be recorded

Scenario: Reject archive when student is already archived
Given an archived student exists
When the user archives the student again
Then the request should fail with error code "ERR_STU_ALREADY_ARCHIVED"

Scenario: Reject archive when policy blocks active-enrollment archival
Given an active student has active enrollments
And branch policy blocks archival while active enrollments exist
When the user attempts to archive the student
Then the request should fail with error code "ERR_STU_ARCHIVE_BLOCKED_BY_ACTIVE_ENROLLMENT_POLICY"

Scenario: Restore an archived student successfully
Given an archived student exists
And the user has permission "student.restore"
When the user restores the student to status "Active" with valid reason
Then the student should no longer be deleted
And the student status should become "Active"
And a restore audit event should be created

Scenario: Reject restore when student is not archived
Given an active student exists
When the user attempts to restore the student
Then the request should fail with error code "ERR_STU_NOT_ARCHIVED"

---

## 9. ID Card Scenarios

@student-management
Feature: Issue and reissue student ID card

Scenario: Issue an ID card for a student successfully
Given an active student exists with idCardIssued false
And the user has permission "student.idcard.manage"
When the user issues ID card number "ID-MCT-2026-0001" on date "2026-07-03"
Then the student should have idCardIssued true
And the current idCardNumber should be set
And an ID card history record should be created

Scenario: Reject ID card issue when number already exists
Given another active student already has current ID card number "ID-MCT-2026-0001"
When the user issues the same ID card number to a different student
Then the request should fail with error code "ERR_STU_ID_CARD_NUMBER_EXISTS"

Scenario: Reissue an ID card successfully
Given a student has current ID card number "ID-MCT-2026-0001"
When the user reissues the card with new number "ID-MCT-2026-0002" and valid reason
Then the current ID card number should become "ID-MCT-2026-0002"
And an ID card history record with event type "Reissued" should be created
And the old and new numbers should both be stored in history

Scenario: Reject reissue when current card was never issued
Given a student exists with idCardIssued false
When the user requests ID card reissue
Then the request should fail with error code "ERR_STU_ID_CARD_NOT_ISSUED"

Scenario: Reject reissue when new number equals current number
Given a student has current ID card number "ID-MCT-2026-0001"
When the user reissues the ID card using "ID-MCT-2026-0001"
Then the request should fail with error code "ERR_STU_ID_CARD_REISSUE_NUMBER_SAME_AS_CURRENT"

---

## 10. Duplicate Case Scenarios

@student-management @duplicate
Feature: Duplicate detection and resolution

Scenario: Create blocking duplicate case during direct registration
Given an existing student has Civil ID "OMAN-12345"
When a user submits direct registration with Civil ID "OMAN-12345"
Then the system should create a duplicate case
And the case should have risk level "Blocking"
And the request should fail with error code "ERR_STU_DUPLICATE_BLOCKING_MATCH"

Scenario: View duplicate case details
Given a duplicate case exists in branch "MCT"
And the user has permission "student.duplicate.read"
When the user opens the duplicate case detail
Then the system should return the case summary
And candidate items should be listed with match scores and reasons

Scenario: Resolve duplicate case as not duplicate
Given an open duplicate case exists
And the user has permission "student.duplicate.resolve"
When the user resolves the case with resolution type "NotDuplicate" and valid reason
Then the case status should become "ResolvedNoDuplicate"
And the resolution type should be stored
And the case should no longer appear in open backlog widgets

Scenario: Reject duplicate resolution when case is already resolved
Given a duplicate case already has status "ResolvedNoDuplicate"
When the user attempts to resolve it again
Then the request should fail with error code "ERR_STU_DUPLICATE_CASE_ALREADY_RESOLVED"

---

## 11. Merge Scenarios

@student-management @merge
Feature: Merge duplicate student profiles

Scenario: Merge source student into survivor successfully
Given two student profiles exist and are confirmed duplicates
And the user has permission "student.merge"
When the user merges source student "STU-2002" into survivor "STU-1001" with valid reason
Then the merge should complete in one transaction
And the source student should be archived
And a merge log should be created
And downstream references should be reassigned to the survivor
And the duplicate case should be resolved as merged when linked

Scenario: Reject merge when source and survivor are the same
Given a student exists
When the user submits a merge with the same student as source and survivor
Then the request should fail with error code "ERR_STU_MERGE_SELF_FORBIDDEN"

Scenario: Reject merge when source student was already merged previously
Given a source student already has a completed merge log as source
When the user attempts another merge using the same source
Then the request should fail with error code "ERR_STU_MERGE_ALREADY_COMPLETED_FOR_SOURCE"

Scenario: Reject merge when actor lacks cross-branch scope
Given the survivor student belongs to branch "MCT"
And the source student belongs to branch "SHR"
And the user only has write scope to branch "MCT"
When the user attempts the merge
Then the request should fail with error code "ERR_STU_MERGE_SCOPE_DENIED"

Scenario: Reject merge when transactional reassignment fails
Given a duplicate merge is initiated
And a downstream reference reassignment fails during transaction
When the merge is executed
Then the merge should roll back fully
And the source student should remain unchanged
And the request should fail with error code "ERR_STU_MERGE_TRANSACTION_FAILED"

---

## 12. Export and Audit Scenarios

@student-management @reporting
Feature: Export student data and audit usage

Scenario: Export filtered student data successfully
Given the user "reporting_user" has permission "student.export"
And the user has report access to branch "MCT"
When the user exports the student register in format "CSV"
Then an export log should be created
And the export status should be "Completed" or "Queued"
And the user should receive export metadata

Scenario: Reject export with selected rows scope when no rows are selected
Given the user has permission "student.export"
When the user requests export with scope "SelectedRows" and no selected student IDs
Then the request should fail with error code "ERR_STU_INVALID_EXPORT_REQUEST"

Scenario: Reject sensitive export when caller lacks unmasked identity permission
Given the user has permission "student.export"
But the user does not have permission "student.identity.unmasked.read"
When the user requests export including masked identity fields
Then the request should fail with error code "ERR_STU_UNMASKED_IDENTITY_PERMISSION_REQUIRED"

Scenario: Require reason for sensitive export
Given the user has permissions "student.export" and "student.identity.unmasked.read"
When the user requests sensitive export without reason
Then the request should fail with error code "ERR_STU_EXPORT_REASON_REQUIRED"

Scenario: View export audit report
Given export logs exist
And the user has permission "report.studentExportHistory"
When the user opens the export audit report
Then the system should show export log entries filtered by branch scope

---

## 13. Reporting Scenarios

@student-management @reporting
Feature: Student management dashboards and reports

Scenario: View Student Management dashboard with allowed widgets
Given the user has `menu.studentManagement` and `student.read`
When the user opens the Student Management dashboard
Then active students, new students, and ID card coverage widgets should be visible
And duplicate widgets should only be visible if the user also has `student.duplicate.read`

Scenario: View branch-wise chart only when multi-branch permission exists
Given the user only has active branch access and no consolidated permission
When the user opens the dashboard
Then the branch-wise active student comparison widget should be hidden

Scenario: Run Student Master Register report with filters
Given the user has `report.studentMaster`
When the user runs the Student Master Register report filtered by branch "MCT" and status "Active"
Then the report should return only active students in branch "MCT"

Scenario: Run Duplicate Backlog report
Given the user has `report.studentDuplicateCases`
When the user runs the duplicate backlog report
Then open duplicate cases in the allowed branch scope should be listed
And archived or resolved cases should be excluded unless explicitly filtered in

Scenario: Run Merge History report
Given the user has `report.studentMergeHistory`
When the user runs the merge history report for the last 30 days
Then completed merge logs in scope should be returned
And source and survivor student numbers should be shown

---

## 14. Student Portal Scenarios

@student-management @portal
Feature: Student portal self-view

Scenario: Student views own profile
Given the portal user is linked to a student profile
And the user has permission "student.portal.self.read"
When the student opens My Profile
Then the system should show only that student's own profile data

Scenario: Student cannot browse another student profile by ID
Given the portal user is linked to student "STU-1001"
When the user attempts to access student "STU-2002"
Then access should be denied or concealed
And no other student's data should be returned

Scenario: Student sees linked enrollment count summary only for self
Given the portal user is linked to a student profile with 2 enrollments
When the student opens the self summary view
Then the enrollments summary should show count 2
And no branch-wide metrics should be shown

---

## 15. Trainer Portal Scenarios

@student-management @portal
Feature: Trainer roster quick view

Scenario: Trainer views quick profile for student in assigned batch roster
Given trainer "trainer_batch_101" is assigned to batch "BATCH-101"
And student "STU-1001" is enrolled in batch "BATCH-101"
And the trainer has permission "student.trainer.roster.read"
When the trainer opens the quick view for the student from the roster
Then the system should show the student quick profile
And only read-only fields should be available

Scenario: Trainer cannot access student outside roster context
Given trainer "trainer_batch_101" is not assigned to batch "BATCH-102"
When the trainer requests quick view for a student in batch "BATCH-102"
Then the request should fail with error code "ERR_TRN_BATCH_OR_STUDENT_NOT_FOUND_IN_CONTEXT"

---

## 16. Authorization Guard Scenarios

@student-management @security
Feature: Permission-based access control

Scenario Outline: Deny action when required action-level permission is missing
Given the user "<user>" is authenticated
But the user does not have permission "<permission>"
When the user attempts operation "<operation>"
Then the request should fail with error code "ERR_AUTH_PERMISSION_DENIED"

    Examples:
      | user              | permission                 | operation                |
      | finance_user      | student.update             | update student           |
      | counselor_mct     | student.merge              | merge students           |
      | frontdesk_mct     | student.archive            | archive student          |
      | trainer_batch_101 | student.read               | open admin student list  |

Scenario: Hide duplicate workbench menu when user lacks menu permission
Given the user does not have permission "menu.studentManagement.duplicateWorkbench"
When the user opens the navigation menu
Then the duplicate workbench menu item should not be visible

Scenario: Hide export action when user lacks export permission
Given the user has `student.read` but not `student.export`
When the user opens the student list
Then the export button should not be visible

Scenario: Mask sensitive identity fields without unmasked permission
Given the user has `student.read`
But does not have `student.identity.unmasked.read`
When the user opens student detail
Then Civil ID, passport number, visa number, and full ID card number should be masked

---

## 17. Branch Isolation Scenarios

@student-management @security @branch-scope
Feature: Branch data isolation

Scenario: Branch user can read records only in assigned branch
Given user "student_ops_mct" is assigned only to branch "MCT"
And student "STU-MCT-001" belongs to branch "MCT"
And student "STU-SHR-001" belongs to branch "SHR"
When the user lists students
Then "STU-MCT-001" should be visible
And "STU-SHR-001" should not be visible

Scenario: Branch user cannot create student in unassigned branch
Given user "student_ops_mct" is assigned only to branch "MCT"
When the user submits direct registration for branch "SHR"
Then the request should fail with error code "ERR_AUTH_BRANCH_SCOPE_DENIED"

Scenario: Reporting user with consolidated permission sees assigned branches only
Given user "reporting_user" is assigned to branches "MCT" and "SHR"
And the user has consolidated reporting permission
And another branch "NZW" exists but is not assigned
When the user runs the Student Master Register in consolidated mode
Then the report should include only "MCT" and "SHR"
And branch "NZW" should not appear

Scenario: Cross-branch merge is denied without explicit cross-branch permission
Given source and survivor students belong to different branches
And the user lacks cross-branch merge scope
When the user attempts merge
Then the request should fail with error code "ERR_STU_MERGE_SCOPE_DENIED"

Scenario: Conceal out-of-scope student detail from admin API
Given the user is authenticated
But the student belongs to a branch outside user scope
When the user requests student detail by ID
Then the API should return "ERR_STU_NOT_FOUND" or equivalent concealed not found response
And the response should not disclose branch or identity metadata

Scenario: Prevent unauthorized branch access to student profile
Given a student profile exists for person "P-2001" with Home Branch "SHR"
And the student has no Admission or Enrollment in branch "MCT"
And the user "counselor_mct" has branch access to "MCT" only
When the user "counselor_mct" attempts to view the student profile for "P-2001"
Then the request should fail with error code "ERR_AUTH_BRANCH_DENIED"

Scenario: Grant read access to other branches after successful enrollment
Given a student profile exists for person "P-2001" with Home Branch "SHR"
And an approved Admission exists for the student in branch "MCT"
And the user "counselor_mct" has branch access to "MCT" only
When the user "counselor_mct" views the student profile
Then the profile details should be returned successfully
And the Sohar branch history should remain visible to authorized SHR users

Scenario: Match existing global profile on Civil ID during preflight check
Given an active student profile exists for person "P-3001" in branch "SHR" with Civil ID "OMAN-9999"
And no profile exists for person "P-3001" in branch "MCT"
When the user "counselor_mct" runs a preflight lookup with Civil ID "OMAN-9999"
Then the response should indicate a match was found
And the response details should be masked
And the active branch should list "SHR"

Scenario: Claim and link profile with valid OTP
Given a masked duplicate match was found for person "P-3001"
And a valid 6-digit OTP code "123456" was sent to the student's phone
When the user "counselor_mct" submits a claim profile request with:
| personId | e30dcd1e-a4b5-4b08-9df2-bb53a5c18e10 |
| otp | 123456 |
| branchId | MCT-BRANCH-UUID |
Then the system should create an Admission in branch "MCT"
And the student profile should remain active
And "counselor_mct" should now be authorized to view the student profile

---

## 18. Boundary and Volume Scenarios

@student-management @validation
Feature: Boundary conditions

Scenario Outline: Accept valid maximum-length field values
Given the user has permission "student.create"
When the user submits a valid payload where "<field>" has length "<length>"
Then the request should be accepted if all other validations pass

    Examples:
      | field            | length |
      | firstNameEnglish | 100    |
      | lastNameEnglish  | 100    |
      | fullNameArabic   | 200    |
      | primaryEmail     | 254    |
      | remarks          | 1000   |
      | idCardNumber     | 50     |

Scenario Outline: Reject field values exceeding maximum length
Given the user has permission "student.create"
When the user submits a payload where "<field>" exceeds maximum length
Then the request should fail with error code "<errorCode>"

    Examples:
      | field            | errorCode                |
      | firstNameEnglish | ERR_STU_INVALID_PAYLOAD  |
      | fullNameArabic   | ERR_STU_INVALID_PAYLOAD  |
      | remarks          | ERR_STU_INVALID_PAYLOAD  |
      | idCardNumber     | ERR_STU_INVALID_PAYLOAD  |

Scenario: Support list page size upper boundary
Given the user has permission "student.read"
When the user requests page size "100"
Then the request should succeed

Scenario: Reject list page size above allowed boundary
Given the user has permission "student.read"
When the user requests page size "101"
Then the request should fail with error code "ERR_STU_INVALID_QUERY"

Scenario: Reject export selected rows above configured limit
Given the export selected-row limit is 1000
When the user submits 1001 selected student IDs
Then the request should fail with error code "ERR_STU_INVALID_EXPORT_REQUEST" or "ERR_STU_EXPORT_ROW_LIMIT_EXCEEDED"

---

## 19. Audit and Notification Scenarios

@student-management
Feature: Audit and notification side effects

Scenario: Create student emits audit event
Given a valid student creation request succeeds
When the transaction commits
Then an audit event should be written with action "student.create"
And the actor, branch, entity ID, and creation source should be recorded

Scenario: Archive student emits audit event
Given a valid archive request succeeds
When the transaction commits
Then an audit event should be written with action "student.archive"
And the archive reason should be recorded

Scenario: Blocking duplicate case triggers internal notification
Given a duplicate case is created with risk level "Blocking"
When the transaction commits
Then a system notification should be created for branch student operations users
And the duplicate case number should be included in the notification payload

Scenario: Export completion triggers completion notification
Given an export request was queued
And export generation later completes successfully
When the export status changes to "Completed"
Then the requesting user should receive an export completion notification

---

## 20. Final Acceptance Conditions

A release candidate for Module 5 – Student Management is acceptable only if:

1. Student creation works for admission, direct registration, and corporate conversion flows.
2. Duplicate detection blocks unsafe create/update operations.
3. Merge is transactional and audit-safe.
4. Archive and restore respect branch scope and downstream blocking policy.
5. ID card workflows enforce uniqueness and history.
6. Student list/detail/reporting enforce branch isolation server-side.
7. Permission-based UI hiding and API denial are both implemented.
8. Student and trainer portals remain read-only and scope-limited.
9. Reports and dashboards return only in-scope, permission-allowed data.
10. All critical actions produce audit trails and appropriate notification events.
