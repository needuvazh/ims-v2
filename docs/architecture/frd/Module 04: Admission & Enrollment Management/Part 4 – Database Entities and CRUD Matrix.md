# Functional Requirement Document (Part 4)
## Module 04: Admission & Enrollment Management - Database Schema & CRUD Matrix

---

## 1. Target Entity Model

This module owns the admission and enrollment lifecycle data. The current Prisma schema still contains a legacy `Student` model, so the implementation must refactor the database to the target model below.

### 1.1 `Person` (shared reference, owned elsewhere)
* Shared identity record.
* Read-only from this module except via lookup/link flows.
* Fields: `id`, `firstName`, `lastName`, `mobile`, `email`, `nationalId`, `nationality`, `dateOfBirth`, `gender`, audit fields, soft delete fields.

### 1.2 `StudentProfile`
* Purpose: learner profile linked 1:1 to `Person`.
* Fields: `id`, `personId`, `studentNumber`, `status`, `idCardIssued`, `idCardNumber`, `joinedAt`, audit fields, soft delete fields.
* Constraints:
  * `personId` unique.
  * `studentNumber` unique.
  * One active profile per person.

### 1.3 `Admission`
* Purpose: administrative admission record for a student profile in a branch.
* Fields: `id`, `admissionNumber`, `personId`, `studentProfileId`, `branchId`, `leadId?`, `admissionDate`, `admissionStatus`, `submittedAt?`, `approvedAt?`, `approvedBy?`, `remarks?`, audit fields, soft delete fields.
* Constraints:
  * `admissionNumber` unique.
  * `studentProfileId` required.
  * `branchId` required.
  * `leadId` is optional and read-only to CRM ownership.

### 1.4 `Enrollment`
* Purpose: central aggregate for course and batch assignment.
* Fields: `id`, `enrollmentNumber`, `studentProfileId`, `corporateParticipantId?`, `admissionId`, `courseId`, `batchId`, `branchId`, `enrollmentType`, `enrollmentStatus`, `pricingSource`, `resolvedPrice`, `resolvedDiscount`, `finalAmount`, `paymentValidationRequired`, `completionStatus`, `certificateStatus`, `confirmedAt?`, `completedAt?`, audit fields, soft delete fields.
* Constraints:
  * `courseId` required.
  * `batchId` required.
  * `branchId` required.
  * `enrollmentNumber` unique.
  * `studentProfileId` required.

### 1.5 `WalkInEnrollment`
* Purpose: specialized walk-in strategy record linked 1:1 to enrollment.
* Fields: `id`, `enrollmentId`, `walkInDate`, `counterUserId`, `paymentCollected`, `confirmationIssued`, `remarks`, audit fields, soft delete fields.

### 1.6 `WalkInConfirmation`
* Purpose: printable confirmation artifact for walk-in flows.
* Fields: `id`, `walkInEnrollmentId`, `confirmationNumber`, `issuedAt`, `issuedBy`, `documentUrl`, audit fields, soft delete fields.

### 1.7 Enums
* `EnrollmentType`: `Regular`, `Corporate`, `WalkIn`, `Online`
* `EnrollmentStatus`: `Draft`, `Submitted`, `Approved`, `Confirmed`, `Active`, `Completed`, `Cancelled`, `Dropped`, `CertificateIssued`
* `PricingSource`: `BatchLevel`, `BranchLevel`, `GlobalDefault`
* `AdmissionStatus`: `Draft`, `Submitted`, `Approved`, `Rejected`, `Cancelled`
* `StudentStatus`: `Active`, `Suspended`, `Inactive`

---

## 2. Relationship Matrix

| Entity | Relationship |
| ------ | ------------ |
| `Person` | 1 to 0..1 `StudentProfile` |
| `StudentProfile` | 1 to many `Admission` |
| `StudentProfile` | 1 to many `Enrollment` |
| `Admission` | many to 1 `Person` |
| `Admission` | many to 1 `Branch` |
| `Admission` | many to 1 `StudentProfile` |
| `Admission` | 0..1 to 1 `Lead` (logical reference only) |
| `Enrollment` | many to 1 `StudentProfile` |
| `Enrollment` | many to 1 `Admission` |
| `Enrollment` | many to 1 `Course` |
| `Enrollment` | many to 1 `Batch` |
| `Enrollment` | many to 1 `Branch` |
| `Enrollment` | 0..1 to `CorporateParticipant` (external reference) |
| `WalkInEnrollment` | 1 to 1 `Enrollment` |
| `WalkInConfirmation` | 1 to 1 `WalkInEnrollment` |

---

## 3. CRUD Matrix and Scoped Access

| Actor | Entity | Allowed Actions | Scope |
| ---- | ---- | ---- | ---- |
| Super Admin | All module entities | Create, Read, Update, Soft Delete, Audit | Global |
| Branch Manager | Admission | Read, Approve, Reject, Cancel | Active branch |
| Branch Manager | Enrollment | Read, Approve, Cancel, Drop | Active branch |
| Registrar | Person | Lookup, create-link | Branch-scoped lookup only |
| Registrar | StudentProfile | Create, Read, Update, Soft Delete | Active branch |
| Registrar | Admission | Create, Read, Submit, Cancel | Active branch |
| Registrar | Enrollment | Create, Read, Submit, Cancel | Active branch |
| Counselor | Admission | Create, Read, Submit | Assigned branch or assigned lead only |
| Counselor | Enrollment | Create, Read, Submit | Assigned branch or assigned lead only |
| Accountant | Enrollment | Read | Branch-scoped |
---

## 4. Prisma Refactor Notes

The active Prisma schema must be refactored to the target admission/enrollment model below.

```prisma
enum AdmissionStatus {
  Draft
  Submitted
  Approved
  Rejected
  Cancelled
}

enum EnrollmentType {
  Regular
  Corporate
  WalkIn
  Online
}

enum EnrollmentStatus {
  Draft
  Submitted
  Approved
  Confirmed
  Active
  Completed
  Cancelled
  Dropped
  CertificateIssued
}

enum PricingSource {
  BatchLevel
  BranchLevel
  GlobalDefault
}

enum StudentStatus {
  Active
  Suspended
  Inactive
}

model StudentProfile {
  id            String   @id @default(uuid()) @db.Uuid
  personId      String   @unique @db.Uuid
  studentNumber String   @unique @db.VarChar(50)
  status        StudentStatus @default(Active)
  idCardIssued  Boolean  @default(false)
  idCardNumber  String?  @unique @db.VarChar(50)
  joinedAt      DateTime @default(now()) @db.Timestamptz(6)
  createdAt     DateTime @default(now()) @db.Timestamptz(6)
  createdBy     String?  @db.Uuid
  updatedAt     DateTime? @db.Timestamptz(6)
  updatedBy     String?  @db.Uuid
  deletedAt     DateTime? @db.Timestamptz(6)
  deletedBy     String?  @db.Uuid
  isDeleted     Boolean  @default(false)
}

model Admission {
  id              String          @id @default(uuid()) @db.Uuid
  admissionNumber String          @unique @db.VarChar(50)
  personId        String          @db.Uuid
  studentProfileId String         @db.Uuid
  branchId        String          @db.Uuid
  leadId          String?         @db.Uuid
  admissionDate   DateTime        @default(now()) @db.Timestamptz(6)
  admissionStatus AdmissionStatus @default(Draft)
  submittedAt     DateTime?       @db.Timestamptz(6)
  approvedAt      DateTime?       @db.Timestamptz(6)
  approvedBy      String?         @db.Uuid
  remarks         String?         @db.Text
  createdAt       DateTime        @default(now()) @db.Timestamptz(6)
  createdBy       String?         @db.Uuid
  updatedAt       DateTime?       @db.Timestamptz(6)
  updatedBy       String?         @db.Uuid
  deletedAt       DateTime?       @db.Timestamptz(6)
  deletedBy       String?         @db.Uuid
  isDeleted       Boolean         @default(false)
}

model Enrollment {
  id                      String           @id @default(uuid()) @db.Uuid
  enrollmentNumber        String           @unique @db.VarChar(50)
  studentProfileId        String           @db.Uuid
  corporateParticipantId  String?          @db.Uuid
  admissionId             String           @db.Uuid
  courseId                String           @db.Uuid
  batchId                 String           @db.Uuid
  branchId                String           @db.Uuid
  enrollmentType          EnrollmentType   @default(Regular)
  enrollmentStatus        EnrollmentStatus @default(Draft)
  pricingSource           PricingSource    @default(GlobalDefault)
  resolvedPrice           Decimal          @db.Decimal(12, 3)
  resolvedDiscount        Decimal          @db.Decimal(12, 3) @default(0.000)
  finalAmount             Decimal          @db.Decimal(12, 3)
  paymentValidationRequired Boolean         @default(true)
  completionStatus        String           @default("Pending") @db.VarChar(50)
  certificateStatus       String           @default("NotEligible") @db.VarChar(50)
  confirmedAt             DateTime?        @db.Timestamptz(6)
  completedAt             DateTime?        @db.Timestamptz(6)
  createdAt               DateTime         @default(now()) @db.Timestamptz(6)
  createdBy               String?          @db.Uuid
  updatedAt               DateTime?        @db.Timestamptz(6)
  updatedBy               String?          @db.Uuid
  deletedAt               DateTime?        @db.Timestamptz(6)
  deletedBy               String?          @db.Uuid
  isDeleted               Boolean          @default(false)
}

model WalkInEnrollment {
  id                 String   @id @default(uuid()) @db.Uuid
  enrollmentId       String   @unique @db.Uuid
  walkInDate         DateTime @default(now()) @db.Timestamptz(6)
  counterUserId      String   @db.Uuid
  paymentCollected   Decimal  @db.Decimal(12, 3)
  confirmationIssued Boolean  @default(false)
  remarks            String?  @db.Text
  createdAt          DateTime @default(now()) @db.Timestamptz(6)
  createdBy          String?  @db.Uuid
  updatedAt          DateTime? @db.Timestamptz(6)
  updatedBy          String?  @db.Uuid
  deletedAt          DateTime? @db.Timestamptz(6)
  deletedBy          String?  @db.Uuid
  isDeleted          Boolean  @default(false)
}

model WalkInConfirmation {
  id                  String   @id @default(uuid()) @db.Uuid
  walkInEnrollmentId  String   @unique @db.Uuid
  confirmationNumber  String   @unique @db.VarChar(50)
  issuedAt            DateTime @default(now()) @db.Timestamptz(6)
  issuedBy            String   @db.Uuid
  documentUrl         String   @db.VarChar(255)
  createdAt           DateTime @default(now()) @db.Timestamptz(6)
  createdBy           String?  @db.Uuid
  updatedAt           DateTime? @db.Timestamptz(6)
  updatedBy           String?  @db.Uuid
  deletedAt           DateTime? @db.Timestamptz(6)
  deletedBy           String?  @db.Uuid
  isDeleted           Boolean  @default(false)
}
```
