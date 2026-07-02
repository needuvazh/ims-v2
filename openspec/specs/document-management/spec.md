# document-management Specification

## Purpose
TBD - created by archiving change document-management. Update Purpose after archive.

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
