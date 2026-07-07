## Context

ASTI IMS lacks database models and backend services to issue, verify, reissue, or revoke certificates. Following the DDD context map, the Certificate Management context is responsible for credential generation and lifecycle management, but it must not recompute completion eligibility (owned by Exam, Result & Completion) or payment completion (owned by Finance). This design introduces the persistence layer, domain logic package, API endpoints, and admin UI components necessary to support this module.

## Goals / Non-Goals

**Goals:**
- Add `Certificate`, `CertificateVerification`, and `CertificateReissueRequest` models to the Prisma schema.
- Establish a `1:N` relationship between `Enrollment` and `Certificate` to support replacement histories.
- Enforce that at most one certificate is active (`Generated` or `Issued`) per enrollment via a partial unique index in the database.
- Add physical fields for revocation (`revokedAt`, `revokedBy`, `revocationReason`) directly on the `Certificate` model.
- Build the `packages/certificates` domain package containing domain models, application services, validators, and repository interfaces.
- Protect all internal endpoints using dynamic permissions and server-side branch isolation.
- Provide a public, rate-limited verification endpoint that minimizes PII leakage.
- Log sensitive operations in the Audit & Compliance context.

**Non-Goals:**
- Modifying course completion rules (owned by Course Catalog).
- Recalculating grades, attendance percentage, or completion approval (owned by Completion).
- Modifying or allocating invoices/payments/receipts (owned by Finance).
- Introducing Redis, microservices, or event brokers.

## Decisions

### 1. Database Schema Additions
We will add three models and update existing models in `schema.prisma`.

```prisma
model Certificate {
  id                String           @id @default(uuid()) @db.Uuid
  certificateNumber String           @unique @db.VarChar(100)
  enrollmentId      String           @db.Uuid
  studentProfileId  String           @db.Uuid
  courseId          String           @db.Uuid
  batchId           String           @db.Uuid
  issuedDate        DateTime?        @db.Timestamptz(6)
  issuedBy          String?          @db.Uuid
  certificateStatus String           @db.VarChar(50) // Generated, Issued, Revoked, Replaced
  certificateUrl    String           @db.Text
  verificationCode  String           @unique @db.VarChar(100)
  qrCodeUrl         String           @db.Text
  language          String           @db.VarChar(10) // "en" or "ar"

  // Revocation fields (explicitly expanded as approved)
  revokedAt         DateTime?        @db.Timestamptz(6)
  revokedBy         String?          @db.Uuid
  revocationReason  String?          @db.Text

  // Relations
  enrollment        Enrollment       @relation(fields: [enrollmentId], references: [id])
  studentProfile    StudentProfile   @relation(fields: [studentProfileId], references: [id])
  course            Course           @relation(fields: [courseId], references: [id])
  batch             Batch            @relation(fields: [batchId], references: [id])
  issuedByUser      User?            @relation("IssuedCertificates", fields: [issuedBy], references: [id])
  revokedByUser     User?            @relation("RevokedCertificates", fields: [revokedBy], references: [id])
  reissueRequests   CertificateReissueRequest[] @relation("OriginalCertificate")
  replacementFor    CertificateReissueRequest[] @relation("ReplacementCertificate")
  verifications     CertificateVerification[]

  // Audit columns
  createdAt         DateTime         @default(now()) @db.Timestamptz(6)
  createdBy         String?          @db.Uuid
  updatedAt         DateTime?        @updatedAt @db.Timestamptz(6)
  updatedBy         String?          @db.Uuid
  deletedAt         DateTime?        @db.Timestamptz(6)
  isActive          Boolean          @default(true)
  version           Int              @default(1)

  @@index([enrollmentId])
  @@index([studentProfileId])
  @@index([courseId])
  @@index([batchId])
  @@index([certificateStatus])
  @@map("certificates")
}

model CertificateVerification {
  id                 String           @id @default(uuid()) @db.Uuid
  certificateId      String           @db.Uuid
  verificationCode   String           @db.VarChar(100)
  verifiedAt         DateTime         @default(now()) @db.Timestamptz(6)
  verifiedByIp       String?          @db.VarChar(45)
  verificationStatus String           @db.VarChar(50) // Valid, Revoked, Replaced

  // Relations
  certificate        Certificate      @relation(fields: [certificateId], references: [id])

  // Audit columns
  createdAt          DateTime         @default(now()) @db.Timestamptz(6)
  createdBy          String?          @db.Uuid
  updatedAt          DateTime?        @updatedAt @db.Timestamptz(6)
  updatedBy          String?          @db.Uuid
  deletedAt          DateTime?        @db.Timestamptz(6)
  isActive           Boolean          @default(true)
  version            Int              @default(1)

  @@index([certificateId])
  @@index([verificationCode])
  @@map("certificate_verifications")
}

model CertificateReissueRequest {
  id               String           @id @default(uuid()) @db.Uuid
  certificateId    String           @db.Uuid
  requestedBy      String           @db.Uuid
  reason           String           @db.Text
  status           String           @db.VarChar(50) // PendingReview, Approved, Rejected, Completed
  approvedBy       String?          @db.Uuid
  approvedAt       DateTime?        @db.Timestamptz(6)
  newCertificateId String?          @db.Uuid

  // Relations
  certificate      Certificate      @relation("OriginalCertificate", fields: [certificateId], references: [id])
  replacementCert  Certificate?     @relation("ReplacementCertificate", fields: [newCertificateId], references: [id])
  requestedByUser  User             @relation("ReissueRequestedBy", fields: [requestedBy], references: [id])
  approvedByUser   User?            @relation("ReissueApprovedBy", fields: [approvedBy], references: [id])

  // Audit columns
  createdAt        DateTime         @default(now()) @db.Timestamptz(6)
  createdBy        String?          @db.Uuid
  updatedAt        DateTime?        @updatedAt @db.Timestamptz(6)
  updatedBy        String?          @db.Uuid
  deletedAt        DateTime?        @db.Timestamptz(6)
  isActive         Boolean          @default(true)
  version          Int              @default(1)

  @@index([certificateId])
  @@index([newCertificateId])
  @@map("certificate_reissue_requests")
}
```

We will also update `Enrollment` (add `certificates Certificate[]`) and `User` (add relation mappings to Certificate and ReissueRequest).

### 2. Active 1:1 Constraint Implementation
In the Prisma schema, the relation between `Enrollment` and `Certificate` is defined as `1:N` (`certificates Certificate[]` on `Enrollment`) to support replacement lineage.
To guarantee that at most one certificate is active, we will add a custom PostgreSQL partial unique index in a custom migration:
```sql
CREATE UNIQUE INDEX certificates_active_enrollment_idx ON certificates (enrollment_id) 
WHERE certificate_status IN ('Generated', 'Issued');
```

### 3. Hexagonal Package Architecture
We will create `packages/certificates` containing:
- `domain/`: Business entities and validators.
- `application/`: Application services (`GenerateCertificateService`, `IssueCertificateService`, `ReissueCertificateService`, `VerificationService`, `RevocationService`).
- `ports/`: Outgoing interfaces for `EnrollmentReadPort`, `CompletionReadPort`, `FinanceValidationPort`, and `NumberingPort`.
- `infrastructure/`: DB repositories implementing Prisma writes and port adapters.

## Risks / Trade-offs

- **Out-of-Process Side Effects (Notifications)**: Emitting delivery requests to the Communication context occurs asynchronously. If communication is down, the certificate issuance remains successfully committed, and a retry mechanism/outbox must process the notification delivery.
- **Relational Integrity on Unmatched Verifications**: Verification attempts with nonexistent codes cannot link via foreign key to `Certificate`. Unmatched verifications will be logged in application telemetry/security logs rather than the `CertificateVerification` database table, keeping SQL constraints clean.
