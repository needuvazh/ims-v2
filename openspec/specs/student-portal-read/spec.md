# student-portal-read Specification

## Purpose

TBD - created by syncing change module-05-student-management. Update Purpose after archive.

## Requirements

## ADDED Requirements

### Requirement: Student attendance self-service view

The system SHALL allow an authenticated student to view a read-only attendance summary for their own enrollments, including attendance percentage, recent session statuses, and low-attendance warnings when applicable.

#### Scenario: Student views own attendance summary

- **WHEN** an authenticated student opens the student portal attendance summary
- **THEN** the system SHALL return only the student's own attendance data
- **AND** the view SHALL be read-only

#### Scenario: Student cannot access another student attendance

- **WHEN** a student requests attendance data for another student profile or enrollment
- **THEN** the system SHALL reject the request with a forbidden response

### Requirement: REQ-SM-PORTAL-001 — Read-Only Student Portal Profile View

The student portal SHALL allow authenticated students to view their own profile and card details. The portal MUST NOT allow students to update, edit, or delete any profile fields directly.

#### Scenario: View own student profile in student portal

- **WHEN** student "STU-001" logs into the student portal and requests their profile details
- **THEN** the profile returns successfully
- **And** all editing widgets, inputs, and updates are disabled

#### Scenario: Block student profile mutation from student portal

- **WHEN** student "STU-001" attempts to execute a PATCH request to edit their birthdate or phone number
- **THEN** the API returns "ERR_AUTH_FORBIDDEN"
