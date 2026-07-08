# document-management Specification

## Purpose

The Document Management context coordinates the secure upload, registration, branch scoping, metadata verification, and physical/review lifecycle of files (e.g., Civil ID, passport scan, academic transcript) within the Institute Management System (IMS).

## Requirements

### Requirement: Documents Context Database Schema

The database schema SHALL define explicit, type-safe models for the Documents context to ensure data integrity and avoid free-form string associations.

```prisma
model Document {
  id           String         @id @default(uuid()) @db.Uuid
  fileKey      @db.VarChar(255)
  fileName     @db.VarChar(255)
  fileType     @db.VarChar(100)
  documentType DocumentType
  branchId     String         @db.Uuid         // Persisted branch scope
  status       DocumentStatus @default(Active) // Physical lifecycle status

  owners       DocumentOwner[]
  verifications DocumentVerification[]

  createdAt    DateTime       @default(now()) @db.Timestamptz(6)
  createdBy    String?        @db.Uuid
  updatedAt    DateTime?      @db.Timestamptz(6)
  updatedBy    String?        @db.Uuid
  deletedAt    DateTime?      @db.Timestamptz(6)
  deletedBy    String?        @db.Uuid
  isDeleted    Boolean        @default(false)

  @@index([branchId])
  @@map("documents")
}

model DocumentOwner {
  id         String    @id @default(uuid()) @db.Uuid
  documentId String    @db.Uuid
  ownerId    String    @db.Uuid
  ownerType  OwnerType

  document   Document  @relation(fields: [documentId], references: [id])

  createdAt  DateTime  @default(now()) @db.Timestamptz(6)
  createdBy  String?   @db.Uuid

  @@unique([documentId, ownerId, ownerType])
  @@index([ownerId])
  @@map("document_owners")
}

model DocumentVerification {
  id         String             @id @default(uuid()) @db.Uuid
  documentId String             @db.Uuid
  outcome    VerificationOutcome @default(Pending) // Review status
  verifiedBy String?            @db.Uuid
  verifiedAt DateTime?          @db.Timestamptz(6)
  remarks    String?            @db.Text

  document   Document           @relation(fields: [documentId], references: [id])

  createdAt  DateTime           @default(now()) @db.Timestamptz(6)
  createdBy  String?            @db.Uuid

  @@index([documentId])
  @@map("document_verifications")
}

enum DocumentType {
  CIVIL_ID_FRONT
  CIVIL_ID_BACK
  PASSPORT_SCAN
  ACADEMIC_TRANSCRIPT
  SPONSORSHIP_LETTER
  OTHER
}

enum DocumentStatus {
  Draft
  Active
  Expired
  Replaced
  Deleted
}

enum OwnerType {
  Person
  StudentProfile
  Admission
  Enrollment
}

enum VerificationOutcome {
  Pending
  Verified
  Rejected
}
```

#### Scenario: Schema validation

- **WHEN** the prisma schema is compiled
- **THEN** the models SHALL contain Document, DocumentOwner, and DocumentVerification with proper fields and constraints.

---

### Requirement: Document Capture and Branch Scoping

The system SHALL verify the user's branch permissions against the document's stored `branchId` before allowing upload, retrieval, or metadata access.

#### Scenario: Persist branch context on upload

- **WHEN** an authorized user uploads a document against a target workflow (Lead, Admission, Enrollment)
- **THEN** the system SHALL resolve the active branch ID from that workflow, save it directly on the `Document`'s `branchId` column, and reject the upload with `403 Forbidden` if the user is not authorized for that branch.

#### Scenario: Enforce branch-scoped document read access

- **WHEN** a user requests document details, metadata, or download links
- **THEN** the system SHALL check the user's branch access against the document's stored `branchId`, failing with `403 Forbidden` if unauthorized.

---

### Requirement: Admission Document Capture

The system SHALL allow the admin portal to attach and manage admission-supporting documents for a person, student profile, admission, or enrollment record without owning the underlying document entity.

#### Scenario: Upload document for admission review

- **WHEN** an authorized admissions user uploads a civil ID, passport scan, or other required document against an admission workflow record
- **THEN** the system SHALL create the document through the Documents context, link it to the Module 04 record by reference, and expose the document status to the admin portal.

#### Scenario: Reject document capture outside branch scope

- **WHEN** a user attempts to attach a document to an admission or enrollment record for a branch they are not authorized to access
- **THEN** the system SHALL reject the action with a `403 Forbidden` response and SHALL NOT create or link the document reference.

---

### Requirement: Lead Conversion Contract & Handoff Integration

The CRM Lead conversion endpoint input schema and database transaction SHALL support structured document capture.

#### Scenario: Convert Lead with structured document metadata

- **WHEN** a lead conversion request passes a payload conforming to:
  ```json
  {
    "documents": [
      {
        "fileName": "civil_id.pdf",
        "fileKey": "uploads/civil_id_123.pdf",
        "fileType": "application/pdf",
        "documentType": "CIVIL_ID_FRONT"
      }
    ]
  }
  ```
- **THEN** the system SHALL validate Won preconditions: email/phone are valid, birthdate on `Person` is present, and at least one active document of type `CIVIL_ID_FRONT` or `PASSPORT_SCAN` is in the inputs.
- **AND** the system SHALL create `Document` records in the Documents context linked to the Lead's `personId` (with `ownerType: OwnerType.Person` and the Lead's `branchId`) within the conversion transaction.

---

### Requirement: Idempotent Admission Handoff Creation

The Admission service SHALL be idempotent when creating student profiles and admissions during handoff, reusing existing records instead of throwing duplicate profile errors.

#### Scenario: Reuse existing StudentProfile and Person during handoff

- **WHEN** the conversion handoff transaction is run for a contact identity that already has a `Person` and a `StudentProfile` in the database
- **THEN** the system SHALL reuse the existing `Person` and `StudentProfile` records, and link them to the new `Admission` record, completing the transaction successfully.

---

### Requirement: Verification Gate and Requirements Resolver

The system SHALL verify that all required document types for an admission or enrollment workflow are both `Active` (physical status) and `Verified` (verification outcome) before allowing downstream approvals.

#### Scenario: Resolve requirements with Course-Catalog overrides

- **WHEN** evaluating the verification gate for an enrollment, the `RequirementsResolver` SHALL retrieve required document types (defaulting to branch-wide settings unless course-catalog rules override them).
- **THEN** the system SHALL block the approval or confirmation if any required type does not have at least one document in `Active` status and `Verified` verification outcome.

---

### Requirement: document-upload-intent

The system SHALL validate the intended document owner, document type, and branch scope, and verify that the file metadata complies with upload policies before issuing an upload intent token.

#### Scenario: Valid Upload Intent Handshake

- **WHEN** the authenticated user has `document.create` permission, and the target owner is active, and the user's branch scope intersects with the owner's branch scope, and the file name/size are valid.
- **THEN** the system generates a collision-safe Vercel Blob pathname and returns a short-lived upload token to the client.

#### Scenario: Reject Upload Intent for Cross-Branch Owner

- **WHEN** the authenticated user attempts to request an upload intent for an owner whose branch scope falls outside the user's effective IAM branches.
- **THEN** the request is rejected with `403 DOC_BRANCH_SCOPE_DENIED` and no upload token is generated.

---

### Requirement: document-registration

The system SHALL register the completed Blob upload, persist the `fileKey` and `fileName` metadata, and initialize the verification status to Pending.

#### Scenario: Register Successful Upload

- **WHEN** Vercel Blob reports successful binary storage, and the registration request matches a valid upload intent, and the database commit succeeds.
- **THEN** a `Document` record is created in the database with `status = Active`, a `DocumentOwner` mapping is created, a `DocumentVerification` row is initialized with `outcome = Pending`, and an audit event is emitted.

---

### Requirement: verification-decision

The system SHALL support atomic verification decisions (Approve or Reject) on pending documents, write an append-only decision history row, and update verifier summary fields.

#### Scenario: Approve Pending Verification

- **WHEN** the authenticated user has `document.verify.approve`, and the document status is `Active` and latest verification outcome is `Pending`, and the user is in the document branch scope.
- **THEN** the latest `DocumentVerification` record is updated or created with `outcome = Verified`, the verifier summary fields are populated, the document remains `status = Active`, and a transactional audit record is saved.

#### Scenario: Reject Pending Verification with Mandatory Remarks

- **WHEN** the authenticated user has `document.verify.reject`, and the latest verification outcome is `Pending`, and the user submits a rejection with non-empty remarks.
- **THEN** a `DocumentVerification` record is written with `outcome = Rejected`, the remarks are saved, and the document remains `status = Active`.

---

### Requirement: branch-isolation

The system SHALL enforce server-side branch scoping on every query, direct-ID lookup, metadata mutation, and secure file access request.

#### Scenario: Access Denied for Direct-ID Bypass

- **WHEN** a user guesses a valid document UUID but is not assigned to the document's `branchId` (or child/consolidated scopes).
- **THEN** the request is denied with a `404 DOC_NOT_FOUND` response, hiding the existence of the document.

---

### Requirement: document-expiry-evaluation

The system SHALL run a background scheduler to transition documents whose calendar expiry date has passed.

#### Scenario: Scheduled Expiry Transition

- **WHEN** the scheduled job runs, and the current Oman calendar date is greater than the document's `expiryDate`.
- **THEN** the document status transitions to `status = Expired` and a `DocumentExpired` event is recorded.
