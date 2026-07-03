# ASTI IMS: Functional Requirement Document
## Module 03: Lead & Inquiry Management
### Part 9 – BDD Acceptance Criteria and Test Scenarios

---

## 1. Feature: Manual Inquiry Validation and Duplicate Check

### 1.1 Scenario: Validate phone format and mandatory parameters
```gherkin
Feature: Inquiry Form Input Validation
  As a Counselor
  I want the system to reject invalid inquiries during manual entry
  So that ASTI CRM maintains clean contact data

  Scenario Outline: Validate mobile phone number formatting
    Given the Counselor is logged in to the Muscat branch
    And the Counselor has "lead.create" permission
    When the Counselor inputs first name "Salem", last name "Al-Ghafri"
    And inputs source "WalkIn"
    And inputs phone number "<PhoneInput>"
    And saves the inquiry
    Then the system should return status code 422
    And return validation error code "ERR_CRM_INVALID_PHONE"
    And display bilingual error message "Must be a valid Omani mobile number starting with 7 or 9"

    Examples:
      | PhoneInput     |
      | 12345678       |
      | +96824445555   |
      | +97191234567   |
      | 9687123456     |
      | abcdefgh       |
```

### 1.2 Scenario: Duplicate check alerts and override logic
```gherkin
Scenario: Warn user of matching mobile number during creation
  Given the Counselor is logged in to the Muscat branch
  And a lead exists for "Said Al-Hosni" with phone "+96892223333" and Lead ID "LD-2026-MCT-00055"
  When the Counselor attempts to save a new inquiry for "Said Al-Hosni" with phone "+96892223333"
  And set "bypassDuplicateBlock" flag to false
  Then the system blocks the database insert
  And returns error code "ERR_CRM_DUPLICATE_LEAD_DETECTED"
  And includes matching reference ID "LD-2026-MCT-00055" in the metadata

Scenario: Allow counselor to force create duplicate lead after confirmation
  Given the Counselor is logged in to the Muscat branch
  And a lead exists for "Said Al-Hosni" with phone "+96892223333" and Lead ID "LD-2026-MCT-00055"
  When the Counselor saves a new inquiry with phone "+96892223333"
  And sets "bypassDuplicateBlock" flag to true
  Then the system bypasses the duplicate block
  And saves the inquiry with status "Captured"
  And links the duplicate reference field "duplicateRefId" to "LD-2026-MCT-00055"
```

---

## 2. Feature: Lead Stage Transitions and Invariants

### 2.1 Scenario: Validate preconditions for Won stage
```gherkin
Feature: Lead Stage Transition Policies
  As a Counselor or Branch Admin
  I want the stage transitions to follow strict business validation policies
  So that unqualified leads cannot trigger admissions processes

  Scenario: Prevent lead from transitioning to Won without mandatory files
    Given the Counselor is logged in and assigned to lead "LD-2026-MCT-00099"
    And the lead has:
      | Field | Value |
      | email | prospect@gmail.com |
      | phone | +96891234567 |
      | interestedCourseId | c182b740-12ef-4cb3-912b-40ab12f00101 |
    And the lead has no linked files of type "CIVIL_ID_FRONT"
    When the Counselor transitions the lead stage to "Won"
    Then the system rejects the transaction
    And returns error code "ERR_CRM_WON_PRECONDITIONS_MISSED"
    And sets lead stage to its previous value "Qualified"
```

### 2.2 Scenario: Enforce lost reason capture
```gherkin
Scenario: Prevent lead from transitioning to Lost without reason code
  Given the Counselor is logged in and assigned to lead "LD-2026-MCT-00104"
  When the Counselor attempts to transition the stage to "Lost"
  And leaves "lostReasonCode" empty
  Then the system rejects the update
  And returns error code "ERR_CRM_LOST_REASON_REQUIRED"
  And lead stage remains active
```

### 2.3 Scenario: Block backward transitions from terminal state
```gherkin
Scenario Outline: Block illegal transition out of Converted state
  Given the Counselor is logged in
  And the lead "LD-2026-MCT-00022" is in stage "Converted"
  When the Counselor attempts to change the stage to "<TargetStage>"
  Then the system rejects the state transition
  And returns error code "ERR_CRM_INVALID_STAGE_TRANSITION"
  And lead stage remains "Converted"

  Examples:
    | TargetStage |
    | New         |
    | Contacted   |
    | FollowUp    |
    | Won         |
    | Lost        |
```

---

## 3. Feature: Follow-up Scheduling Boundaries

### 3.1 Scenario: Verify future date-time constraints
```gherkin
Feature: Follow-up Schedule Validation
  As a Counselor
  I want scheduled follow-ups to occur in the future
  So that tracking records remain chronologically valid

  Scenario Outline: Reject past date-times
    Given the Counselor is logged in
    And the Counselor is assigned to lead "LD-2026-MCT-00055"
    When the Counselor attempts to schedule a follow-up for "<ScheduledTime>"
    Then the system rejects the schedule request
    And returns error code "ERR_CRM_PAST_FOLLOWUP_DATE"

    Examples:
      | ScheduledTime |
      | 2020-01-01T10:00:00.000Z |
      | 2026-06-30T10:00:00.000Z |
      | 2026-06-30T14:00:00.000Z |
```

---

## 4. Feature: Branch Data Isolation and Access Controls

### 4.1 Scenario: Block counselor access to leads in unauthorized branches
```gherkin
Feature: Branch Data Isolation Scoping
  As a Branch Admin
  I want counselors to only access leads and inquiries in their authorized branches
  So that branch client data is isolated and secured

  Scenario: Counselor A attempts to view Lead assigned to Branch B
    Given Counselor "Said Al-Masri" is logged in
    And "Said Al-Masri" is assigned to branch "Muscat" (MCT) only
    And Lead "LD-2026-SLL-00012" is registered under branch "Salalah" (SLL)
    When "Said Al-Masri" requests details for Lead "LD-2026-SLL-00012"
    Then the system blocks the request
    And returns HTTP status 403 Forbidden
    And returns error code "ERR_CRM_BRANCH_SCOPE_VIOLATION"
```

### 4.2 Scenario: Block counselor access to unauthorized counselor portfolios
```gherkin
Scenario: Counselor A attempts to edit Lead assigned to Counselor B
  Given Counselor "Said Al-Masri" is logged in
  And "Said Al-Masri" is assigned to branch "Muscat" (MCT)
  And Counselor "Hilal Al-Kindi" is assigned to branch "Muscat" (MCT)
  And Lead "LD-2026-MCT-00044" is assigned to counselor "Hilal Al-Kindi"
  When "Said Al-Masri" attempts to edit Lead "LD-2026-MCT-00044"
  Then the system blocks the update
  And returns HTTP status 403 Forbidden
  And returns error code "ERR_CRM_BRANCH_SCOPE_VIOLATION"
```

### 4.3 Scenario: Allow Branch Admin access to all branch leads
```gherkin
Scenario: Branch Admin accesses any lead within their branch scope
  Given Branch Admin "Mona Al-Said" is logged in
  And "Mona Al-Said" is assigned to branch "Muscat" (MCT)
  And Lead "LD-2026-MCT-00044" is assigned to counselor "Hilal Al-Kindi"
  When "Mona Al-Said" requests details for Lead "LD-2026-MCT-00044"
  Then the system allows the read request
  And returns Lead details successfully
```
