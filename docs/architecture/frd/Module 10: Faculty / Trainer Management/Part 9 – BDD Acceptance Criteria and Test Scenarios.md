# Part 9 – BDD Acceptance Criteria and Test Scenarios

This document outlines the behavior-driven development (BDD) test scenarios for the Faculty / Trainer Management module, covering unit, integration, validation boundaries, and security constraints.

---

## 1. Feature: Trainer Registry and Profile Management

### Scenario Outline: Successfully Register Trainer with Valid Person Link
  Given the authenticated user is a "Branch Admin"
  And the active branch context is set to "<activeBranch>"
  And a Person record exists with ID "<personId>"
  And no TrainerProfile is associated with "<personId>"
  When the user submits a trainer profile registration with:
    | personId           | <personId>           |
    | trainerType        | <trainerType>        |
    | specialization     | <specialization>     |
    | effectiveStartDate | <effectiveStartDate> |
  Then the system should return status "201 Created"
  And generate a unique trainer code starting with "TRN-"
  And persist the record with status set to "Draft"

  Examples:
    | activeBranch | personId                             | trainerType | specialization | effectiveStartDate |
    | Muscat       | a2a2a2a2-b2b2-c2c2-d2d2-e2e2e2e2e2e2 | Freelance   | IT Security    | 2026-07-01         |
    | Salalah      | b3b3b3b3-c3c3-d3d3-e3e3-f3f3f3f3f3f3 | FullTime    | Cyber Security | 2026-07-01         |

### Scenario: Prevent Registration if Person is Already Associated with a Trainer Profile
  Given the authenticated user is a "Branch Admin"
  And a TrainerProfile already exists linked to Person ID "a2a2a2a2-b2b2-c2c2-d2d2-e2e2e2e2e2e2"
  When the user attempts to register a new trainer profile with Person ID "a2a2a2a2-b2b2-c2c2-d2d2-e2e2e2e2e2e2"
  Then the system should block the registration
  And return an error payload matching status "400 Bad Request"
  And the error code must be "ERR_TRN_PERSON_ALREADY_LINKED"

---

## 2. Feature: Availability Mapping and Overlap Validations

### Scenario: Accept Non-Overlapping Availability time blocks
  Given a Trainer "TRN-2026-1010" has an active availability block:
    | dayOfWeek | startTime | endTime | branchId |
    | 1 (Mon)   | 08:00     | 12:00   | Muscat   |
  When the Branch Admin adds a new availability block for "TRN-2026-1010" with:
    | dayOfWeek | startTime | endTime | branchId |
    | 1 (Mon)   | 13:00     | 17:00   | Muscat   |
  Then the system should permit the write operation
  And return a success response payload with code "200 OK"

### Scenario Outline: Reject Overlapping Availability time blocks (Boundary Checks)
  Given a Trainer "TRN-2026-1010" has an active availability block:
    | dayOfWeek | startTime | endTime | branchId |
    | 1 (Mon)   | 09:00     | 13:00   | Muscat   |
  When the Branch Admin attempts to write a slot on day "1" from "<start>" to "<end>" at "Muscat" branch
  Then the validation should fail
  And the system should return status "422 Unprocessable Entity"
  And error code "ERR_TRN_AVAILABILITY_OVERLAP"

  Examples:
    | start | end   | Type of Overlap |
    | 08:00 | 10:00 | Partial overlap at start |
    | 12:00 | 14:00 | Partial overlap at end |
    | 10:00 | 12:00 | Nested entirely within |
    | 08:00 | 14:00 | Envelops existing slot |
    | 09:00 | 13:00 | Identical boundaries |

### Scenario: Permit Exact Border Contact slots
  Given a Trainer "TRN-2026-1010" has an active availability block:
    | dayOfWeek | startTime | endTime | branchId |
    | 1 (Mon)   | 09:00     | 13:00   | Muscat   |
  When the Branch Admin adds a slot on day "1" from "13:00" to "17:00"
  Then the validation should pass because border contact is not an overlap
  And the system should save the new slot successfully

---

## 3. Feature: Course Authorization and Scheduling Integration

### Scenario: Block scheduling assignment for non-authorized courses
  Given Trainer "TRN-2026-0044" is not authorized to deliver Course "CS-101"
  When the Academic Coordinator attempts to assign "TRN-2026-0044" as Primary Trainer to Batch "BATCH-CS101-A"
  Then the Scheduling Engine check should fail
  And return error code "ERR_TRN_COURSE_NOT_AUTHORIZED"

### Scenario: Allow assignment when verification document override is active
  Given Trainer "TRN-2026-0044" is authorized for "CS-101"
  But the trainer's Ministry Teaching License is expired
  And the user is authenticated as "Super Admin"
  When the Super Admin forces the trainer assignment to "BATCH-CS101-A" using the bypass permission `trainer:override-schedule`
  Then the scheduling assignment should succeed
  And a warning "SchedulingOverrideActive" must be appended to the BatchTrainer audit log

---

## 4. Feature: Security and Branch Isolation

### Scenario: Restrict Branch Admin edits to active branch context
  Given the User "User-Salalah-Admin" has the role "Branch Admin" in branch "ASTI Salalah"
  And the active branch context is set to "ASTI Salalah"
  And a TrainerProfile "TRN-Muscat-01" has its primary branch set to "ASTI Muscat"
  When the User "User-Salalah-Admin" attempts to update availability slots for "TRN-Muscat-01"
  Then the server must block the mutation query
  And return an HTTP status "403 Forbidden"
  And error code "ERR_TRN_BRANCH_ACCESS_DENIED"

### Scenario: Restrict Trainer Portal read actions to own profile
  Given the User is logged in as Trainer "TRN-2026-0012"
  When the user calls "GET /api/trainers/e9b2512f-981c-4b68-80f4-5553e1a0b943" (referencing another trainer's ID)
  Then the API router must block the call
  And return status "403 Forbidden"
