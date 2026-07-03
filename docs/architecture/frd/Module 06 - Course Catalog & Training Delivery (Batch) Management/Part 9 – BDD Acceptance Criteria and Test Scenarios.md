# Module 06 — Course Catalog & Training Delivery (Batch) Management

## Part 9 — BDD Acceptance Criteria and Test Scenarios

**Version:** 3.0  
**Status:** Draft  
**Domain:** Course Catalog & Training Delivery  
**Module Code:** CRS  

---

# Feature: Course Profile Administration & Publishing

  As an Academic Director  
  I want to create, validate, and publish training courses in the catalog  
  So that they can be used for scheduling student batches.

  ---

  ### Scenario: Successfully create and publish a new course profile
    Given the user is authenticated as "Academic Director" (User UUID: "987a46b8-adfb-0af496bd58cd")
    And has the "course.catalog.create" and "course.catalog.publish" permissions
    And the department "Health & Safety Division" (UUID: "89f4b007-4235-46b0-bb82-f54228da3542") is Active
    When the user creates a course with code "HS-OSHA-30", name "OSHA 30-Hour General Industry", and duration "30 Hours"
    Then the system creates the Course record in "Draft" status
    And the user adds an active Pricing record:
      | Branch ID | Customer Type | Batch Type | Base Price | Tax Percentage | Start Date |
      | NULL      | Individual    | Regular    | 120.000    | 5.000          | 2026-07-01 |
    And the user adds active Completion Rules:
      | Attendance Min % | Exam Required | Fee Clearance Required | Start Date |
      | 80               | true          | true                   | 2026-07-01 |
    When the user requests to transition the course "HS-OSHA-30" to "Active" status
    Then the system updates the Course status to "Active"
    And registers the "COURSE_STATUS_CHANGED" audit ledger record with old value "Draft" and new value "Active"

  ---

  ### Scenario Outline: Block course creation on invalid input validation boundaries
    Given the user is authenticated as "Academic Director"
    And has the "course.catalog.create" permission
    When the user attempts to create a course with code "<Code>", English name "<Name>", and duration value <Duration>
    Then the system blocks the creation and returns the error code "<Error>"

    Scenarios:
      | Code         | Name                         | Duration | Error                          |
      | HS-OS-99     | OSHA                         | 0        | ERR_CRS_INVALID_DURATION       |
      | hs-os-99     | OSHA 30-Hour                 | 30       | ERR_CRS_INVALID_CODE_FORMAT    |
      | HS           | OSHA 30-Hour                 | 30       | ERR_CRS_INVALID_CODE_FORMAT    |
      | HS-OSHA-LONG | OSHA 30-Hour                 | -5       | ERR_CRS_INVALID_DURATION       |

---

# Feature: Batch Capacity & Waiting List Promotion

  As a Counselor or Automated System  
  I want the system to manage batch seat capacities and queue promotions dynamically  
  So that seat allocations are optimized.

  ---

  ### Scenario Outline: Check capacity limits and redirect to waitlist when batch is full
    Given a batch "B-OSHA-01" exists with capacity <Capacity> and current enrollment count <CurrentCount>
    And the batch configuration parameters are:
      | waitingListEnabled | allowOverbooking |
      | <WaitlistEnabled>  | <Overbooking>    |
    When a student request for <SeatsRequested> seat(s) is processed by the system
    Then the system response is "<Response>"
    And the final batch current enrollment count is <FinalCount>

    Scenarios:
      | Capacity | CurrentCount | WaitlistEnabled | Overbooking | SeatsRequested | Response          | FinalCount |
      | 25       | 20           | true            | false       | 1              | SUCCESS           | 21         |
      | 25       | 25           | true            | false       | 1              | WAITLIST_REDIRECT | 25         |
      | 25       | 25           | false           | false       | 1              | ERR_CRS_BATCH_FULL| 25         |
      | 25       | 25           | false           | true        | 1              | SUCCESS_OVERBOOKED| 26         |

  ---

  ### Scenario: Auto-promote waitlisted student when a seat is vacated
    Given a batch "B-OSHA-01" has capacity 20 and current enrollment count 20
    And the waitlist for "B-OSHA-01" is populated chronologically:
      | Student Name | Queue Position | Status  | Requested At             |
      | Salim        | 1              | Waiting | 2026-06-30T10:00:00+04:00|
      | Khadija      | 2              | Waiting | 2026-06-30T11:00:00+04:00|
    When Student "Hamad" (who had a confirmed seat) is cancelled from the batch
    Then the system decrements the batch current enrollment count to 19
    And locking the waitlist transaction, it selects the entry at queue position 1 ("Salim")
    And creates an enrollment record for "Salim"
    And updates "Salim"'s waitlist status to "Promoted"
    And increments the batch current enrollment count to 20
    And updates "Khadija"'s queue position to 1
    And dispatches the "WaitlistEntryPromoted" WhatsApp alert to "Salim"

---

# Feature: Trainer Assignment & Scheduling Conflicts

  As an Academic Coordinator  
  I want the system to intercept trainer schedules during assignment  
  So that double-bookings are prevented.

  ---

  ### Scenario: Block trainer mapping on session day and hour overlap
    Given a batch "B-OSHA-01" has scheduled sessions:
      | Day    | Start Time | End Time | Date Range            |
      | Monday | 18:00      | 20:00    | 2026-07-01 to 2026-07-31 |
    And Trainer "Eng. Said" is already assigned as Primary Trainer to batch "B-OSHA-02" which has scheduled sessions:
      | Day    | Start Time | End Time | Date Range            |
      | Monday | 19:00      | 21:00    | 2026-07-01 to 2026-07-31 |
    When the user attempts to assign "Eng. Said" as Primary Trainer to batch "B-OSHA-01" for the range "2026-07-01" to "2026-07-31"
    Then the system executes the trainer overlap validation check
    And blocks the assignment
    And returns the error "ERR_CRS_TRAINER_SCHEDULE_CONFLICT: Trainer is already scheduled on Monday from 19:00 to 21:00"

---

# Feature: Server-Side Branch Scoping Isolation Guards

  As an ASTI security guard  
  I want the system to isolate batch data access by branch  
  So that unauthorized branch managers cannot modify or view other branch operations.

  ---

  ### Scenario: Block branch manager from accessing batches of another branch
    Given the user is authenticated as "Branch Manager (Sohar Branch)" (User ID: "ca8012d3-0e1e-4227-8f9a-88ff5ae056f8")
    And their active session branch context is "Sohar Branch" (UUID: "89f4b007-4235-46b0-bb82-f54228da3542")
    And they do not possess the `consolidatedVisibility` or `report.batch.utilization` permissions
    When the user requests to edit a batch "B-OSHA-01" that belongs to branch "Muscat HQ" (UUID: "35428da6-c66d-4ea1-bb85-74c203bfd11f")
    Then the server-side API guard interceptor evaluates the batch's owner branch ID
    And matching it against the user's active branch list, finds no match
    And returns a `403 Forbidden` response with error code "ERR_IAM_INSUFFICIENT_PERMISSIONS"
    And registers an access violation record in the security audit database

  ---

  ### Scenario: Allow consolidated visibility manager to query cross-branch data
    Given the user is authenticated as "General Manager"
    And possesses the "consolidatedVisibility" flag set to true in their `UserBranchAccess` mapping
    When the General Manager requests the batch utilization report across all branches
    Then the API guard bypasses the single-branch matching filter
    And returns aggregated batch statistics for all branches
