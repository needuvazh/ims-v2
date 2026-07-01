# Functional Requirement Document (Part 9)
## Module 04: Admission & Enrollment Management – BDD Test Scenarios

This document outlines the Behavior-Driven Development (BDD) test specifications for the Admission & Enrollment Bounded Context. These scenarios act as contract tests for API, integration, and E2E validations.

---

## Feature: Admission Creation & Student Identity Lifecycle

  As an authorized registrar
  I want to create student admissions and link them to persons
  So that I can register learners legally without duplicate profile entries.

  Background:
    Given the database contains active branches "Muscat" and "Sohar"
    And a Course "IELTS Prep" exists in the course catalog

  Scenario: Register a new student profile and link to an existing Person
    Given the user is logged in as "Registrar" with permission "admission.create"
    And a Person record exists in the system with mobile "+96899123456" and email "ahmed@example.om"
    And no StudentProfile is linked to this Person
    When the Registrar submits a request to register a student for this Person ID at "Muscat" branch
    Then the system should create a StudentProfile linked to this Person ID
    And generate a unique studentNumber starting with "STU-2026-"
    And set the StudentProfile status to "Active"
    And write a "StudentProfileCreated" event to the transactional outbox table

  Scenario Outline: Reject student registration due to age boundary checks
    Given the user is logged in as "Registrar"
    And a Person record exists with dateOfBirth "<birthDate>"
    When the Registrar attempts to create an Admission for this Person at "Muscat" branch
    Then the system should block the registration
    And return error code "ERR_ADM_AGE_LIMIT" with message "<errorMessage>"

    Examples:
      | birthDate            | errorMessage                                |
      | 2018-07-01T00:00:00Z | Student must be at least 12 years of age.   |
      | 2022-01-01T00:00:00Z | Student must be at least 12 years of age.   |

  Scenario: Prevent duplicate StudentProfile linking
    Given a Person record exists with mobile "+96899334455"
    And a StudentProfile already exists linked to this Person
    When a Registrar attempts to create a new StudentProfile for this Person ID
    Then the system should block the write operation
    And throw a "ERR_ADM_DUPLICATE_ID" conflict exception

  Scenario: Enforce server-side branch data isolation on Admissions read
    Given a Counselor is logged in with branch access restricted to "Sohar"
    And an Admission record exists for "Fatima Al-Riyami" under the "Muscat" branch
    When the Counselor requests the details of this Admission record
    Then the system should reject the request with a "403 Forbidden" HTTP status
    And return error message "Access denied to target branch data context."

---

## Feature: Enrollment Lifecycle & Business Invariants Engine

  As a branch administrator
  I want to register students into specific courses and batches
  So that I can allocate capacity, handle billing invoices, and update timetables.

  Background:
    Given an active student "STU-2026-00055" exists
    And an approved Admission "ADM-102" exists for this student
    And course "Web Development" has active batch "WD-B02" with maxCapacity "15" and registered count "14"

  Scenario: Create and save an enrollment in Draft status
    Given the user is logged in as "Registrar"
    When the Registrar submits a request to enroll "STU-2026-00055" in course "Web Development" and batch "WD-B02"
    Then the system should initialize an Enrollment in status "Draft"
    And resolve the price based on the hierarchy, setting pricingSource to "GlobalDefault"
    And compute finalAmount equal to resolvedPrice
    And set paymentValidationRequired to true

  Scenario: Approve enrollment draft and transition state
    Given an Enrollment exists in status "Draft" for batch "WD-B02"
    And the user is logged in as "Branch Manager" with permission "enrollment.approve"
    When the Branch Manager approves the enrollment
    Then the system should set enrollmentStatus to "Approved"
    And write an "EnrollmentApproved" event to the outbox table to trigger invoicing

  Scenario Outline: Block enrollment approval when batch capacity limits are breached
    Given course "Python Intro" has batch "PY-B09" with maxCapacity "10" and registered count "10"
    And waitlist option is "<waitlistOption>"
    When the Branch Manager attempts to approve an enrollment for batch "PY-B09"
    Then the system should <expectedAction>
    And return status "<expectedStatus>"

    Examples:
      | waitlistOption | expectedAction                                     | expectedStatus |
      | Enabled        | place student in waitlist and create queue record  | Waitlisted     |
      | Disabled       | reject enrollment approval with ERR_ENR_BATCH_FULL | Rejected       |

  Scenario: Confirm enrollment and allocate seat upon invoice clearance
    Given an Enrollment exists in status "Approved" with paymentValidationRequired as true
    And the associated Invoice in Finance is fully paid
    When the system processes the payment cleared event
    Then the system should transition enrollmentStatus to "Confirmed"
    And set confirmedAt to the current timestamp
    And the batch registered count should update to "15" (decrementing available capacity by 1)
    And dispatch the "EnrollmentConfirmed" notification event

  Scenario: Drop active enrollment and release seat
    Given an Enrollment exists in status "Active" for batch "WD-B02" (seats available is 0)
    And the user is logged in as "Branch Manager"
    When the Branch Manager drops the enrollment with reason "Withdrawal Request"
    Then the system should transition enrollmentStatus to "Dropped"
    And the batch seats available should update to "1" via reactive event subscription
    And publish "EnrollmentDropped" to adjust attendance sheets
