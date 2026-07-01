# Functional Requirement Document (Part 4)
## Module 04: Admission & Enrollment Management – Database Schema & CRUD Matrix

---

## 1. Entity Specifications & Target Database Models

This section defines the database structure for the Admission & Enrollment Bounded Context. It highlights the refactoring of the legacy `Student` model (substituting inline names with a link to `Person`) and introduces the new `Enrollment` model and associated constraints.

### 1.1 `Person` (Shared Kernel / Reference Model)
*   **Description:** Represents physical human beings across ASTI (shared with CRM, Trainer, and Admin User contexts).
*   **Prisma Model Definition:**
    ```prisma
    model Person {
      id          String    @id @default(uuid()) @db.Uuid
      firstName   String    @db.VarChar(100)
      lastName    String    @db.VarChar(100)
      mobile      String    @unique @db.VarChar(30)
      email       String?   @unique @db.VarChar(255)
      nationalId  String?   @db.VarChar(50)
      nationality String?   @db.VarChar(50)
      dateOfBirth DateTime? @db.Date
      gender      String?   @db.VarChar(20)

      // Note: Relations to User, Lead, and StudentProfile are referenced logically by ID 
      // to preserve bounded context database boundaries.

      createdAt DateTime  @default(now()) @db.Timestamptz(6)
      createdBy String?   @db.Uuid
      updatedAt DateTime? @db.Timestamptz(6)
      updatedBy String?   @db.Uuid
      deletedAt DateTime? @db.Timestamptz(6)
      deletedBy String?   @db.Uuid
      isDeleted Boolean   @default(false)

      @@map("persons")
    }
    ```
*   **PostgreSQL Column Specifications:**
    *   `id`: `UUID` Primary Key.
    *   `firstName` / `lastName`: `VARCHAR(100)` Not Null.
    *   `mobile`: `VARCHAR(30)` Unique, Not Null. Index applied.
    *   `email`: `VARCHAR(255)` Unique, Nullable.
    *   `nationalId`: `VARCHAR(50)` Nullable. Stores Omani Civil ID / Passport numbers.

---

### 1.2 `StudentProfile` (Refactored Profile Model)
*   **Description:** Represents the student profile linked logically to a verified `Person` record. Legacy names and contact fields are removed.
*   **Prisma Model Definition:**
    ```prisma
    model StudentProfile {
      id            String       @id @default(uuid()) @db.Uuid
      personId      String       @unique @db.Uuid // Logical reference to Person
      studentNumber String       @unique @db.VarChar(50)
      status        RecordStatus @default(Active)
      
      // Student ID card status fields from ER Model
      idCardIssued  Boolean      @default(false)
      idCardNumber  String?      @unique @db.VarChar(50)
      joinedAt      DateTime     @default(now()) @db.Timestamptz(6)

      admissions    Admission[]
      enrollments   Enrollment[]

      createdAt DateTime  @default(now()) @db.Timestamptz(6)
      createdBy String?   @db.Uuid
      updatedAt DateTime? @db.Timestamptz(6)
      updatedBy String?   @db.Uuid
      deletedAt DateTime? @db.Timestamptz(6)
      deletedBy String?   @db.Uuid
      isDeleted Boolean   @default(false)

      @@index([personId])
      @@index([studentNumber])
      @@map("student_profiles")
    }
    ```
*   **PostgreSQL Column Specifications:**
    *   `id`: `UUID` Primary Key.
    *   `personId`: `UUID` Logical Foreign Key. Unique Constraint ensures 1:1 mapping between `Person` and `StudentProfile`.
    *   `studentNumber`: `VARCHAR(50)` Unique. Index applied.
    *   `status`: `RecordStatus` Enum (values: `Active`, `Suspended`, `Inactive`).

---

### 1.3 `Admission` (Administrative Record Model)
*   **Description:** Tracks the administrative application of a student to study at a branch.
*   **Prisma Model Definition:**
    ```prisma
    model Admission {
      id              String       @id @default(uuid()) @db.Uuid
      admissionNumber String       @unique @db.VarChar(50)
      studentProfileId String      @db.Uuid
      branchId        String       @db.Uuid // Logical UUID reference (Organization context owns Branch)
      leadId          String?      @db.Uuid // Logical UUID reference (CRM context owns Lead)
      admissionDate   DateTime     @default(now()) @db.Timestamptz(6)
      status          RecordStatus @default(Active)
      remarks         String?      @db.Text
      
      // Approval audit metadata
      submittedAt   DateTime?    @db.Timestamptz(6)
      approvedAt    DateTime?    @db.Timestamptz(6)
      approvedBy    String?      @db.Uuid

      studentProfile StudentProfile @relation(fields: [studentProfileId], references: [id], onDelete: Restrict)
      enrollments   Enrollment[]

      createdAt DateTime  @default(now()) @db.Timestamptz(6)
      createdBy String?   @db.Uuid
      updatedAt DateTime? @db.Timestamptz(6)
      updatedBy String?   @db.Uuid
      deletedAt DateTime? @db.Timestamptz(6)
      deletedBy String?   @db.Uuid
      isDeleted Boolean   @default(false)

      @@index([studentProfileId])
      @@index([branchId])
      @@index([leadId])
      @@index([admissionNumber])
      @@map("admissions")
    }
    ```
*   **PostgreSQL Column Specifications:**
    *   `id`: `UUID` Primary Key.
    *   `studentProfileId`: `UUID` Foreign Key. Relates 1:N to `StudentProfile`.
    *   `branchId`: `UUID` Logical Foreign Key. Indexed for query performance.
    *   `leadId`: `UUID` Nullable. Logical reference to original CRM lead.
    *   `approvedBy`: `UUID` Nullable. References User ID of the Branch Manager who signed the approval.

---

### 1.4 `Enrollment` (New Central Aggregate Model)
*   **Description:** The central aggregate root mapping the learner lifecycle to courses, batches, billing, and progress.
*   **Prisma Model Definition:**
    ```prisma
    model Enrollment {
      id                       String           @id @default(uuid()) @db.Uuid
      enrollmentNumber         String           @unique @db.VarChar(50)
      studentProfileId         String           @db.Uuid
      corporateParticipantId   String?          @db.Uuid // Logical UUID reference to CorporateParticipant
      admissionId              String           @db.Uuid
      courseId                 String           @db.Uuid // Logical UUID reference (Course Catalog owns Course)
      batchId                  String           @db.Uuid // Logical UUID reference (Training Delivery owns Batch)
      branchId                 String           @db.Uuid // Logical UUID reference (Organization owns Branch)
      enrollmentType           EnrollmentType   @default(Regular)
      enrollmentStatus         EnrollmentStatus @default(Draft)
      pricingSource            PricingSource    @default(GlobalDefault)
      resolvedPrice            Decimal          @db.Decimal(12, 3)
      resolvedDiscount         Decimal          @db.Decimal(12, 3) @default(0.000)
      finalAmount              Decimal          @db.Decimal(12, 3)
      paymentValidationRequired Boolean          @default(true)
      
      // Read-only Cached Projections. Updated strictly via domain events.
      completionStatus         String           @default("Pending") @db.VarChar(50)
      certificateStatus        String           @default("NotEligible") @db.VarChar(50)
      
      confirmedAt              DateTime?        @db.Timestamptz(6)
      completedAt              DateTime?        @db.Timestamptz(6)

      studentProfile StudentProfile @relation(fields: [studentProfileId], references: [id], onDelete: Restrict)
      admission   Admission    @relation(fields: [admissionId], references: [id], onDelete: Restrict)
      
      walkInEnrollment WalkInEnrollment?

      createdAt DateTime  @default(now()) @db.Timestamptz(6)
      createdBy String?   @db.Uuid
      updatedAt DateTime? @db.Timestamptz(6)
      updatedBy String?   @db.Uuid
      deletedAt DateTime? @db.Timestamptz(6)
      deletedBy String?   @db.Uuid
      isDeleted Boolean   @default(false)

      @@index([studentProfileId])
      @@index([batchId])
      @@index([branchId])
      @@index([enrollmentNumber])
      @@map("enrollments")
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
    }

    enum PricingSource {
      BatchLevel
      BranchLevel
      GlobalDefault
    }

    model WalkInEnrollment {
      id                 String             @id @default(uuid()) @db.Uuid
      enrollmentId       String             @unique @db.Uuid
      walkInDate         DateTime           @default(now()) @db.Timestamptz(6)
      counterUserId      String             @db.Uuid
      paymentCollected   Decimal            @db.Decimal(12, 3)
      confirmationIssued Boolean            @default(false)
      remarks            String?            @db.Text

      enrollment         Enrollment         @relation(fields: [enrollmentId], references: [id], onDelete: Restrict)
      confirmation       WalkInConfirmation?

      createdAt DateTime  @default(now()) @db.Timestamptz(6)
      createdBy String?   @db.Uuid
      updatedAt DateTime? @db.Timestamptz(6)
      updatedBy String?   @db.Uuid
      deletedAt DateTime? @db.Timestamptz(6)
      deletedBy String?   @db.Uuid
      isDeleted Boolean   @default(false)

      @@index([enrollmentId])
      @@map("walk_in_enrollments")
    }

    model WalkInConfirmation {
      id                 String           @id @default(uuid()) @db.Uuid
      walkInEnrollmentId String           @unique @db.Uuid
      confirmationNumber String           @unique @db.VarChar(50)
      issuedAt           DateTime         @default(now()) @db.Timestamptz(6)
      issuedBy           String           @db.Uuid
      documentUrl        String           @db.VarChar(255)

      walkInEnrollment   WalkInEnrollment @relation(fields: [walkInEnrollmentId], references: [id], onDelete: Restrict)

      createdAt DateTime  @default(now()) @db.Timestamptz(6)
      createdBy String?   @db.Uuid
      updatedAt DateTime? @db.Timestamptz(6)
      updatedBy String?   @db.Uuid
      deletedAt DateTime? @db.Timestamptz(6)
      deletedBy String?   @db.Uuid
      isDeleted Boolean   @default(false)

      @@index([walkInEnrollmentId])
      @@map("walk_in_confirmations")
    }
    ```
*   **PostgreSQL Column Specifications:**
    *   `id`: `UUID` Primary Key.
    *   `enrollmentNumber`: `VARCHAR(50)` Unique.
    *   `resolvedPrice`, `resolvedDiscount`, `finalAmount`: `NUMERIC(12, 3)` (stores Omani Rial amounts with high precision, mapping OMR currency with three decimal fractions).
    *   `paymentValidationRequired`: `BOOLEAN` Not Null.
    *   `completionStatus` / `certificateStatus`: `VARCHAR(50)` Not Null. Owned by other contexts and cached here as read-only.

---

## 2. Table Relationships and Constraints

```mermaid
erDiagram
    PERSON ||..|| STUDENT_PROFILE : "logical 1:1 (personId)"
    STUDENT_PROFILE ||--o{ ADMISSION : "1:N (studentProfileId)"
    STUDENT_PROFILE ||--o{ ENROLLMENT : "1:N (studentProfileId)"
    ADMISSION ||--o{ ENROLLMENT : "1:N (admissionId)"
    
    %% Note: Cross-context relations are logical UUID references only and are not represented as database constraints
```

### Relationship Constraints Rules:
1.  **`Person` to `Student` (1:1):**
    *   **Rule:** A physical `Person` record can map to exactly zero or one `Student` profile.
    *   **OnDelete:** **Logical Restriction (Enforced at Application Layer).** Since `Person` belongs to another context (Identity/CRM), no physical database constraint exists. Deletion checks must run programmatically in the Person application service to prevent deleting a Person if an active StudentProfile references their `personId`.
2.  **`Student` to `Enrollment` (1:N):**
    *   **Rule:** One student may register for multiple enrollments over time.
    *   **OnDelete:** `RESTRICT`. An active student record cannot be deleted if referenced in enrollment history.
3.  **`Enrollment` to `Course` and `Batch` (N:1):**
    *   **Rule:** Every enrollment must point to a valid course catalog page and a scheduled batch (logical references).
    *   **OnDelete:** **Logical Restriction.** Handled in the application layer. A batch cannot be deleted or archived from the Training Delivery catalog if there are active enrollments referencing its `batchId`.
4.  **`Admission` to `Enrollment` (1:N):**
    *   **Rule:** Every enrollment must link back to the administrative Admission record under which the learner was accepted to study at ASTI.

---

## 3. CRUD Matrix and Scoped Access Policies

The following matrix maps database access operations to system actors. All operations must evaluate `branchId` context checks at the database layer (or via Prisma application middlewares/row-level security schemas).

| Actor | Entity | Allowed Actions | Scoping / Context Logic |
| :--- | :--- | :--- | :--- |
| **Super Admin** | All Entities | `Create`, `Read`, `Update`, `Delete`, `Audit` | **Global.** Accesses all branch rows. Can perform physical soft-delete recoveries. |
| **Branch Manager** | `Admission` | `Read`, `Update` (Approve/Reject) | **Branch Scoped.** Restricts read/writes to `Admission.branchId == User.branchAccessList`. |
| **Branch Manager** | `Enrollment` | `Read`, `Update` (Approve, Cancel, Drop) | **Branch Scoped.** Restricts write operations to local batch catalogs. |
| **Registrar** | `Person` | `Create`, `Read`, `Update` | **Global directory search.** Allows cross-branch deduplication lookups by ID/phone. |
| **Registrar** | `Student` | `Create`, `Read`, `Update` | **Branch Scoped.** Restricts student registry additions to local home branch. |
| **Registrar** | `Enrollment` | `Create`, `Read`, `Update` (Draft status) | **Branch Scoped.** Restricts edits to `Draft` and `Submitted` lifecycle states. |
| **Counselor** | `Admission` | `Create`, `Read` | **Counselor Scoped.** By default, reads only admissions where `createdBy == User.id` or `Admission.leadId` is assigned to them. |
| **Student (API)** | `Person` | `Read` (Self), `Update` (Self) | **Self Scoped.** Restricted to editing their own profile fields via active JWT profile matching. |
| **Student (API)** | `Enrollment` | `Read` (Self) | **Self Scoped.** Reads status information for their own classes. No write access. |
| **Outbox Publisher**| `Enrollment` | `Read` | **System Scoped.** Scans outbox table asynchronously. |
