# Prisma Schema Design

## Institute Management System (IMS)

**Version:** 1.0
**Database:** PostgreSQL
**ORM:** Prisma
**Scope:** Core physical schema baseline

---

# 1. Prisma Generator & Datasource

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

# 2. Common Enums

```prisma
enum RecordStatus {
  Draft
  Active
  Inactive
  Archived
}

enum UserStatus {
  Draft
  Active
  Inactive
  Locked
}

enum StudentStatus {
  Inquiry
  Applied
  Admitted
  Active
  Completed
  Dropped
  Transferred
  Suspended
  Alumni
}

enum LeadType {
  Student
  Corporate
}

enum LeadStatus {
  Active
  Won
  Lost
  Converted
  Reopened
}

enum EnrollmentStatus {
  Draft
  Confirmed
  Active
  Completed
  Dropped
  Cancelled
  Suspended
}

enum CourseDurationType {
  FixedDuration
  Hours
  Sessions
}

enum AttendanceStatus {
  Present
  Absent
  Late
  Excused
}

enum PaymentMode {
  Cash
  BankTransfer
  Card
  Cheque
  OnlineTransfer
}

enum CertificateStatus {
  Generated
  PendingApproval
  Approved
  Rejected
  Issued
  Reissued
  Revoked
}
```

---

# 3. IAM Models

```prisma
model User {
  id           String     @id @default(uuid()) @db.Uuid
  fullName     String     @db.VarChar(200)
  email        String     @unique @db.VarChar(255)
  phone        String?    @db.VarChar(30)
  passwordHash String     @db.Text
  userType     String     @db.VarChar(50)
  status       UserStatus @default(Active)
  lastLoginAt  DateTime?  @db.Timestamptz

  roles        UserRole[]
  dataScopes   UserDataScope[]

  createdAt    DateTime   @default(now()) @db.Timestamptz
  createdBy    String?    @db.Uuid
  updatedAt    DateTime?  @db.Timestamptz
  updatedBy    String?    @db.Uuid
  deletedAt    DateTime?  @db.Timestamptz
  deletedBy    String?    @db.Uuid
  isDeleted    Boolean    @default(false)

  @@index([status])
  @@index([email])
  @@map("users")
}

model Role {
  id          String       @id @default(uuid()) @db.Uuid
  roleCode    String       @unique @db.VarChar(100)
  roleName    String       @unique @db.VarChar(150)
  description String?      @db.Text
  status      RecordStatus @default(Active)

  users       UserRole[]
  permissions RolePermission[]

  createdAt   DateTime     @default(now()) @db.Timestamptz
  createdBy   String?      @db.Uuid
  updatedAt   DateTime?    @db.Timestamptz
  updatedBy   String?      @db.Uuid
  deletedAt   DateTime?    @db.Timestamptz
  deletedBy   String?      @db.Uuid
  isDeleted   Boolean      @default(false)

  @@map("roles")
}

model Permission {
  id             String       @id @default(uuid()) @db.Uuid
  moduleCode     String       @db.VarChar(100)
  featureCode    String       @db.VarChar(100)
  actionCode     String       @db.VarChar(100)
  permissionCode String       @unique @db.VarChar(150)
  description    String?      @db.Text
  status         RecordStatus @default(Active)

  roles          RolePermission[]

  @@map("permissions")
}

model RolePermission {
  id           String     @id @default(uuid()) @db.Uuid
  roleId       String     @db.Uuid
  permissionId String     @db.Uuid

  role         Role       @relation(fields: [roleId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])

  createdAt    DateTime   @default(now()) @db.Timestamptz
  createdBy    String?    @db.Uuid

  @@unique([roleId, permissionId])
  @@map("role_permissions")
}

model UserRole {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  roleId    String   @db.Uuid

  user      User     @relation(fields: [userId], references: [id])
  role      Role     @relation(fields: [roleId], references: [id])

  createdAt DateTime @default(now()) @db.Timestamptz
  createdBy String?  @db.Uuid

  @@unique([userId, roleId])
  @@map("user_roles")
}

model UserDataScope {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @db.Uuid
  scopeType     String   @db.VarChar(50)
  branchId      String?  @db.Uuid
  departmentId  String?  @db.Uuid
  assignedOnly  Boolean  @default(false)

  user          User     @relation(fields: [userId], references: [id])

  createdAt     DateTime @default(now()) @db.Timestamptz
  createdBy     String?  @db.Uuid

  @@index([userId])
  @@map("user_data_scopes")
}
```

---

# 4. Organization Models

```prisma
model Institute {
  id                 String       @id @default(uuid()) @db.Uuid
  instituteCode      String       @unique @db.VarChar(50)
  instituteName      String       @db.VarChar(255)
  registrationNumber String?      @db.VarChar(100)
  taxNumber          String?      @db.VarChar(100)
  primaryEmail       String?      @db.VarChar(255)
  primaryPhone       String?      @db.VarChar(30)
  website            String?      @db.VarChar(255)
  address            String?      @db.Text
  country            String?      @db.VarChar(100)
  status             RecordStatus @default(Active)

  branches           Branch[]

  createdAt          DateTime     @default(now()) @db.Timestamptz
  createdBy          String?      @db.Uuid
  updatedAt          DateTime?    @db.Timestamptz
  updatedBy          String?      @db.Uuid

  @@map("institutes")
}

model Branch {
  id                 String       @id @default(uuid()) @db.Uuid
  instituteId        String       @db.Uuid
  branchCode         String       @unique @db.VarChar(50)
  branchName         String       @db.VarChar(200)
  address            String?      @db.Text
  city               String?      @db.VarChar(100)
  country            String?      @db.VarChar(100)
  phone              String?      @db.VarChar(30)
  email              String?      @db.VarChar(255)
  branchManagerId    String?      @db.Uuid
  status             RecordStatus @default(Active)
  effectiveStartDate DateTime?    @db.Date
  effectiveEndDate   DateTime?    @db.Date

  institute          Institute    @relation(fields: [instituteId], references: [id])
  departments        Department[]
  classrooms         Classroom[]

  createdAt          DateTime     @default(now()) @db.Timestamptz
  createdBy          String?      @db.Uuid
  updatedAt          DateTime?    @db.Timestamptz
  updatedBy          String?      @db.Uuid
  deletedAt          DateTime?    @db.Timestamptz
  deletedBy          String?      @db.Uuid
  isDeleted          Boolean      @default(false)

  @@index([status])
  @@index([city])
  @@map("branches")
}

model Department {
  id                 String       @id @default(uuid()) @db.Uuid
  branchId           String       @db.Uuid
  departmentCode     String       @db.VarChar(50)
  departmentName     String       @db.VarChar(200)
  departmentHeadId   String?      @db.Uuid
  description        String?      @db.Text
  status             RecordStatus @default(Active)
  effectiveStartDate DateTime?    @db.Date
  effectiveEndDate   DateTime?    @db.Date

  branch             Branch       @relation(fields: [branchId], references: [id])
  courses            Course[]

  createdAt          DateTime     @default(now()) @db.Timestamptz
  createdBy          String?      @db.Uuid
  updatedAt          DateTime?    @db.Timestamptz
  updatedBy          String?      @db.Uuid
  deletedAt          DateTime?    @db.Timestamptz
  deletedBy          String?      @db.Uuid
  isDeleted          Boolean      @default(false)

  @@unique([branchId, departmentCode])
  @@map("departments")
}

model Classroom {
  id                 String       @id @default(uuid()) @db.Uuid
  branchId           String       @db.Uuid
  classroomName      String       @db.VarChar(150)
  capacity           Int
  location           String?      @db.VarChar(255)
  status             RecordStatus @default(Active)
  effectiveStartDate DateTime?    @db.Date
  effectiveEndDate   DateTime?    @db.Date

  branch             Branch       @relation(fields: [branchId], references: [id])

  createdAt          DateTime     @default(now()) @db.Timestamptz
  createdBy          String?      @db.Uuid
  updatedAt          DateTime?    @db.Timestamptz
  updatedBy          String?      @db.Uuid
  deletedAt          DateTime?    @db.Timestamptz
  deletedBy          String?      @db.Uuid
  isDeleted          Boolean      @default(false)

  @@unique([branchId, classroomName])
  @@map("classrooms")
}
```

---

# 5. Student Models

```prisma
model Student {
  id                     String                    @id @default(uuid()) @db.Uuid
  studentNumber          String                    @unique @db.VarChar(100)
  firstName              String                    @db.VarChar(100)
  middleName             String?                   @db.VarChar(100)
  lastName               String?                   @db.VarChar(100)
  gender                 String?                   @db.VarChar(50)
  dateOfBirth            DateTime?                 @db.Date
  nationality            String?                   @db.VarChar(100)
  photoFileId            String?                   @db.Uuid
  mobileNumber           String                    @db.VarChar(30)
  alternateNumber        String?                   @db.VarChar(30)
  email                  String?                   @db.VarChar(255)
  preferredContactMethod String?                   @db.VarChar(50)
  address                Json?
  status                 StudentStatus             @default(Admitted)

  identityValues         StudentIdentityValue[]
  emergencyContacts      StudentEmergencyContact[]
  enrollments            Enrollment[]

  createdAt              DateTime                  @default(now()) @db.Timestamptz
  createdBy              String?                   @db.Uuid
  updatedAt              DateTime?                 @db.Timestamptz
  updatedBy              String?                   @db.Uuid
  deletedAt              DateTime?                 @db.Timestamptz
  deletedBy              String?                   @db.Uuid
  isDeleted              Boolean                   @default(false)

  @@index([mobileNumber])
  @@index([email])
  @@index([status])
  @@index([firstName, lastName])
  @@map("students")
}

model StudentIdentityField {
  id           String       @id @default(uuid()) @db.Uuid
  fieldCode    String       @unique @db.VarChar(100)
  fieldName    String       @db.VarChar(150)
  fieldType    String       @db.VarChar(50)
  isRequired   Boolean      @default(false)
  isUnique     Boolean      @default(false)
  isVisible    Boolean      @default(true)
  displayOrder Int          @default(1)
  status       RecordStatus @default(Active)

  values       StudentIdentityValue[]

  @@map("student_identity_fields")
}

model StudentIdentityValue {
  id        String               @id @default(uuid()) @db.Uuid
  studentId String               @db.Uuid
  fieldId   String               @db.Uuid
  fieldValue String              @db.VarChar(255)

  student   Student              @relation(fields: [studentId], references: [id])
  field     StudentIdentityField @relation(fields: [fieldId], references: [id])

  createdAt DateTime             @default(now()) @db.Timestamptz
  createdBy String?              @db.Uuid
  updatedAt DateTime?            @db.Timestamptz
  updatedBy String?              @db.Uuid

  @@unique([studentId, fieldId])
  @@index([fieldValue])
  @@map("student_identity_values")
}

model StudentEmergencyContact {
  id           String   @id @default(uuid()) @db.Uuid
  studentId    String   @db.Uuid
  contactName  String   @db.VarChar(200)
  relationship String?  @db.VarChar(100)
  phoneNumber  String   @db.VarChar(30)
  email        String?  @db.VarChar(255)
  isPrimary    Boolean  @default(false)

  student      Student  @relation(fields: [studentId], references: [id])

  createdAt    DateTime @default(now()) @db.Timestamptz
  createdBy    String?  @db.Uuid
  updatedAt    DateTime? @db.Timestamptz
  updatedBy    String?  @db.Uuid
  deletedAt    DateTime? @db.Timestamptz
  deletedBy    String?  @db.Uuid
  isDeleted    Boolean  @default(false)

  @@index([studentId])
  @@map("student_emergency_contacts")
}
```

---

# 6. Course, Batch & Enrollment Models

```prisma
model Course {
  id                       String             @id @default(uuid()) @db.Uuid
  departmentId             String             @db.Uuid
  courseCode               String             @unique @db.VarChar(100)
  courseName               String             @db.VarChar(255)
  description              String?            @db.Text
  courseType               String             @db.VarChar(100)
  durationType             CourseDurationType
  durationValue            Decimal            @db.Decimal(10, 2)
  allowDirectEnrollment    Boolean            @default(true)
  allowWaitingList         Boolean            @default(true)
  allowWalkinCompletion    Boolean            @default(false)
  allowCorporateEnrollment Boolean            @default(true)
  status                   RecordStatus       @default(Draft)

  department               Department         @relation(fields: [departmentId], references: [id])
  batches                  Batch[]
  enrollments              Enrollment[]

  createdAt                DateTime           @default(now()) @db.Timestamptz
  createdBy                String?            @db.Uuid
  updatedAt                DateTime?          @db.Timestamptz
  updatedBy                String?            @db.Uuid
  deletedAt                DateTime?          @db.Timestamptz
  deletedBy                String?            @db.Uuid
  isDeleted                Boolean            @default(false)

  @@map("courses")
}

model Batch {
  id                  String       @id @default(uuid()) @db.Uuid
  courseId            String       @db.Uuid
  branchId            String       @db.Uuid
  batchCode           String       @unique @db.VarChar(100)
  batchName           String       @db.VarChar(255)
  startDate           DateTime     @db.Date
  endDate             DateTime     @db.Date
  capacity            Int
  waitingListEnabled  Boolean      @default(true)
  allowOverbooking    Boolean      @default(false)
  enrollmentOpenDate  DateTime?    @db.Date
  enrollmentCloseDate DateTime?    @db.Date
  status              String       @default("Draft") @db.VarChar(50)

  course              Course       @relation(fields: [courseId], references: [id])
  branch              Branch       @relation(fields: [branchId], references: [id])
  enrollments         Enrollment[]

  createdAt           DateTime     @default(now()) @db.Timestamptz
  createdBy           String?      @db.Uuid
  updatedAt           DateTime?    @db.Timestamptz
  updatedBy           String?      @db.Uuid
  deletedAt           DateTime?    @db.Timestamptz
  deletedBy           String?      @db.Uuid
  isDeleted           Boolean      @default(false)

  @@index([courseId])
  @@index([branchId])
  @@index([status])
  @@map("batches")
}

model Admission {
  id               String   @id @default(uuid()) @db.Uuid
  admissionNumber  String   @unique @db.VarChar(100)
  leadId           String?  @db.Uuid
  studentId        String   @db.Uuid
  branchId         String   @db.Uuid
  courseId         String   @db.Uuid
  preferredBatchId String?  @db.Uuid
  admissionDate    DateTime @db.Date
  status           String   @default("Draft") @db.VarChar(50)
  remarks          String?  @db.Text
  approvedAt       DateTime? @db.Timestamptz
  approvedBy       String?  @db.Uuid
  rejectedAt       DateTime? @db.Timestamptz
  rejectedBy       String?  @db.Uuid
  rejectionReason  String?  @db.Text

  student          Student  @relation(fields: [studentId], references: [id])
  branch           Branch   @relation(fields: [branchId], references: [id])
  course           Course   @relation(fields: [courseId], references: [id])
  enrollments      Enrollment[]

  createdAt        DateTime @default(now()) @db.Timestamptz
  createdBy        String?  @db.Uuid
  updatedAt        DateTime? @db.Timestamptz
  updatedBy        String?  @db.Uuid

  @@index([studentId])
  @@index([branchId])
  @@index([courseId])
  @@map("admissions")
}

model Enrollment {
  id                String           @id @default(uuid()) @db.Uuid
  enrollmentNumber  String           @unique @db.VarChar(100)
  admissionId       String?          @db.Uuid
  studentId         String           @db.Uuid
  branchId          String           @db.Uuid
  courseId          String           @db.Uuid
  batchId           String           @db.Uuid
  enrollmentType    String           @db.VarChar(50)
  enrollmentDate    DateTime         @db.Date
  status            EnrollmentStatus @default(Draft)
  completionStatus  String?          @db.VarChar(50)
  certificateStatus String?          @db.VarChar(50)
  remarks           String?          @db.Text

  admission         Admission?       @relation(fields: [admissionId], references: [id])
  student           Student          @relation(fields: [studentId], references: [id])
  branch            Branch           @relation(fields: [branchId], references: [id])
  course            Course           @relation(fields: [courseId], references: [id])
  batch             Batch            @relation(fields: [batchId], references: [id])

  createdAt         DateTime         @default(now()) @db.Timestamptz
  createdBy         String?          @db.Uuid
  updatedAt         DateTime?        @db.Timestamptz
  updatedBy         String?          @db.Uuid
  deletedAt         DateTime?        @db.Timestamptz
  deletedBy         String?          @db.Uuid
  isDeleted         Boolean          @default(false)

  @@index([studentId])
  @@index([batchId])
  @@index([courseId])
  @@index([status])
  @@map("enrollments")
}
```

---

# 7. Finance Models

```prisma
model FeePlan {
  id                 String       @id @default(uuid()) @db.Uuid
  courseId           String       @db.Uuid
  branchId           String       @db.Uuid
  planName           String       @db.VarChar(200)
  totalAmount        Decimal      @db.Decimal(12, 3)
  currency           String       @db.VarChar(10)
  taxApplicable      Boolean      @default(false)
  taxPercentage      Decimal?     @db.Decimal(5, 2)
  status             RecordStatus @default(Active)
  effectiveStartDate DateTime     @db.Date
  effectiveEndDate   DateTime?    @db.Date

  course             Course       @relation(fields: [courseId], references: [id])
  branch             Branch       @relation(fields: [branchId], references: [id])
  feeAccounts        FeeAccount[]

  createdAt          DateTime     @default(now()) @db.Timestamptz
  createdBy          String?      @db.Uuid

  @@index([courseId])
  @@index([branchId])
  @@map("fee_plans")
}

model FeeAccount {
  id                String     @id @default(uuid()) @db.Uuid
  enrollmentId      String     @unique @db.Uuid
  feePlanId         String?    @db.Uuid
  totalFeeAmount    Decimal    @db.Decimal(12, 3)
  discountAmount    Decimal    @default(0) @db.Decimal(12, 3)
  taxAmount         Decimal    @default(0) @db.Decimal(12, 3)
  netPayableAmount  Decimal    @db.Decimal(12, 3)
  paidAmount        Decimal    @default(0) @db.Decimal(12, 3)
  dueAmount         Decimal    @db.Decimal(12, 3)
  currency          String     @db.VarChar(10)
  status            String     @default("PendingPayment") @db.VarChar(50)

  enrollment        Enrollment @relation(fields: [enrollmentId], references: [id])
  feePlan           FeePlan?   @relation(fields: [feePlanId], references: [id])
  payments          Payment[]

  createdAt         DateTime   @default(now()) @db.Timestamptz
  createdBy         String?    @db.Uuid
  updatedAt         DateTime?  @db.Timestamptz
  updatedBy         String?    @db.Uuid

  @@map("fee_accounts")
}

model Payment {
  id              String      @id @default(uuid()) @db.Uuid
  paymentNumber   String      @unique @db.VarChar(100)
  enrollmentId    String      @db.Uuid
  feeAccountId    String      @db.Uuid
  paymentDate     DateTime    @db.Date
  paymentMode     PaymentMode
  amount          Decimal     @db.Decimal(12, 3)
  currency        String      @db.VarChar(10)
  referenceNumber String?     @db.VarChar(150)
  status          String      @default("Posted") @db.VarChar(50)
  remarks         String?     @db.Text

  enrollment      Enrollment  @relation(fields: [enrollmentId], references: [id])
  feeAccount      FeeAccount  @relation(fields: [feeAccountId], references: [id])
  receipts        Receipt[]

  createdAt       DateTime    @default(now()) @db.Timestamptz
  createdBy       String?     @db.Uuid

  @@index([enrollmentId])
  @@index([feeAccountId])
  @@map("payments")
}

model Receipt {
  id                 String   @id @default(uuid()) @db.Uuid
  receiptNumber      String   @unique @db.VarChar(100)
  paymentId          String   @db.Uuid
  receiptType        String   @db.VarChar(100)
  receiptDate        DateTime @db.Date
  amount             Decimal  @db.Decimal(12, 3)
  currency           String   @db.VarChar(10)
  pdfFileId          String?  @db.Uuid
  status             String   @default("Issued") @db.VarChar(50)
  cancelledAt        DateTime? @db.Timestamptz
  cancelledBy        String?  @db.Uuid
  cancellationReason String?  @db.Text

  payment            Payment  @relation(fields: [paymentId], references: [id])

  createdAt          DateTime @default(now()) @db.Timestamptz
  createdBy          String?  @db.Uuid

  @@map("receipts")
}
```

---

# 8. Audit, File & Configuration Models

```prisma
model File {
  id            String   @id @default(uuid()) @db.Uuid
  fileName      String   @db.VarChar(255)
  mimeType      String   @db.VarChar(100)
  fileSizeBytes BigInt
  storageKey    String   @unique @db.Text
  checksum      String?  @db.VarChar(255)
  uploadedAt    DateTime @default(now()) @db.Timestamptz
  uploadedBy    String?  @db.Uuid

  @@map("files")
}

model AuditLog {
  id          String   @id @default(uuid()) @db.Uuid
  eventId     String   @default(uuid()) @db.Uuid
  moduleCode  String   @db.VarChar(100)
  entityType  String?  @db.VarChar(100)
  entityId    String?  @db.Uuid
  action      String   @db.VarChar(150)
  severity    String   @default("Info") @db.VarChar(50)
  performedBy String?  @db.Uuid
  performedAt DateTime @default(now()) @db.Timestamptz
  ipAddress   String?  @db.VarChar(100)
  userAgent   String?  @db.Text
  oldValue    Json?
  newValue    Json?
  reason      String?  @db.Text
  remarks     String?  @db.Text
  status      String   @default("Success") @db.VarChar(50)

  @@index([entityType, entityId])
  @@index([performedBy])
  @@index([performedAt])
  @@index([moduleCode])
  @@map("audit_logs")
}

model NumberingFormat {
  id              String       @id @default(uuid()) @db.Uuid
  entityType      String       @unique @db.VarChar(100)
  formatPattern   String       @db.VarChar(255)
  sequencePadding Int          @default(5)
  resetFrequency  String       @default("Yearly") @db.VarChar(50)
  currentSequence BigInt       @default(0)
  status          RecordStatus @default(Active)

  @@map("numbering_formats")
}

model LookupValue {
  id           String       @id @default(uuid()) @db.Uuid
  category     String       @db.VarChar(100)
  code         String       @db.VarChar(100)
  displayName  String       @db.VarChar(200)
  displayOrder Int?
  status       RecordStatus @default(Active)

  @@unique([category, code])
  @@map("lookup_values")
}

model Currency {
  id            String       @id @default(uuid()) @db.Uuid
  currencyCode  String       @unique @db.VarChar(10)
  currencyName  String       @db.VarChar(100)
  symbol        String?      @db.VarChar(20)
  decimalPlaces Int          @default(2)
  isDefault     Boolean      @default(false)
  status        RecordStatus @default(Active)

  @@map("currencies")
}

model TaxRule {
  id                 String       @id @default(uuid()) @db.Uuid
  taxName             String       @db.VarChar(100)
  taxPercentage       Decimal      @db.Decimal(5, 2)
  country             String?      @db.VarChar(100)
  effectiveStartDate  DateTime     @db.Date
  effectiveEndDate    DateTime?    @db.Date
  status              RecordStatus @default(Active)

  @@map("tax_rules")
}
```

---

# 9. Notes for Implementation

This Prisma schema should be implemented in phases.

Recommended order:

```text
1. IAM
2. Organization
3. Student
4. Course & Batch
5. Admission & Enrollment
6. Finance
7. Scheduling
8. Attendance
9. Trainer
10. Corporate
11. Completion
12. Certificates
13. Documents
14. Communication
15. Reports
16. Audit
17. Integrations
18. Configuration
```

---

# 10. Important Prisma Design Decisions

```text
Use String @db.Uuid for UUID fields
Use Decimal for all money fields
Use Json for flexible metadata and snapshots
Use explicit @@map for database naming
Use enums only for stable lifecycle values
Use String for configurable statuses
Use audit tables for immutable history
Use soft delete for mutable business entities
Avoid cascading deletes for financial and certificate records
```

---
