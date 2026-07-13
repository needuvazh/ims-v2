# Part 4 – Database Entities and CRUD Matrix

## Module 15 – Corporate Sales & Quotation

---

# 1. Bounded Context Entity Schema Maps

Module 15 – Corporate Sales & Quotation owns the B2B commercial transaction schema. All models map to PostgreSQL physical layouts and use Prisma conventions.

## 1.1 Owned Entities

### CorporateSalesLead
Tracks B2B prospecting.
- `id`: `UUID` (Primary Key)
- `corporateAccountId`: `UUID` (Foreign Key referencing `CorporateAccount` / `Organization`)
- `leadId`: `UUID` (optional link to CRM leads)
- `salesOwnerId`: `UUID` (Foreign Key referencing `User`)
- `branchId`: `UUID` (Foreign Key referencing `Branch`, critical for pre-enrollment branch isolation)
- `stage`: `VARCHAR(50)` (e.g. `New`, `VisitPlanned`, `VisitCompleted`, `QuotationSent`, `Confirmed`, `Lost`)
- `expectedValue`: `DECIMAL(18,3)`
- `expectedCloseDate`: `DATE`
- `status`: `VARCHAR(30)` (default `Active`)
- Soft delete, version, and audit columns.

### CorporateMarketingVisit
Logs marketing executive client visits.
- `id`: `UUID` (Primary Key)
- `corporateSalesLeadId`: `UUID` (Foreign Key referencing `CorporateSalesLead`)
- `corporateAccountId`: `UUID` (Foreign Key referencing `CorporateAccount`)
- `companyNameSnapshot`: `VARCHAR(255)`
- `contactPersonNameSnapshot`: `VARCHAR(255)`
- `contactNumberSnapshot`: `VARCHAR(32)`
- `emailSnapshot`: `VARCHAR(320)`
- `meetingDate`: `DATE`
- `discussionNotes`: `TEXT`
- `coursesDiscussed`: `TEXT` (snapshot of course titles)
- `expectedCandidates`: `INTEGER`
- `expectedTrainingDate`: `DATE`
- `visitOutcome`: `VARCHAR(50)`
- `branchId`: `UUID` (Foreign Key referencing `Branch`)
- Soft delete, version, and audit columns.

### CorporateSalesFollowUp
Tracks B2B pipeline tasks.
- `id`: `UUID` (Primary Key)
- `corporateSalesLeadId`: `UUID` (Foreign Key referencing `CorporateSalesLead`)
- `assignedToUserId`: `UUID` (Foreign Key referencing `User`)
- `followUpDate`: `TIMESTAMPTZ(6)`
- `followUpType`: `VARCHAR(50)` (e.g. `Call`, `Email`, `Meeting`)
- `notes`: `TEXT`
- `outcome`: `VARCHAR(100)`
- `nextFollowUpDate`: `DATE`
- `status`: `VARCHAR(30)` (default `Scheduled`)
- `reminderGenerated`: `BOOLEAN` (default `false`)
- `branchId`: `UUID` (Foreign Key referencing `Branch`)
- Soft delete, version, and audit columns.

### Quotation
Itemized sales proposal.
- `id`: `UUID` (Primary Key)
- `quotationNumber`: `VARCHAR(80)` (Unique Index)
- `corporateAccountId`: `UUID` (Foreign Key referencing `CorporateAccount`)
- `corporateSalesLeadId`: `UUID` (Foreign Key referencing `CorporateSalesLead`)
- `quotationDate`: `DATE`
- `validUntil`: `DATE`
- `subtotal`: `DECIMAL(18,3)`
- `discountAmount`: `DECIMAL(18,3)`
- `taxAmount`: `DECIMAL(18,3)` (Omani 5% VAT)
- `totalAmount`: `DECIMAL(18,3)`
- `status`: `VARCHAR(30)` (default `Draft`)
- `approvedBy`: `UUID` (Foreign Key referencing `User`)
- `approvedAt`: `TIMESTAMPTZ(6)`
- `branchId`: `UUID` (Foreign Key referencing `Branch`)
- Soft delete, version, and audit columns.

### QuotationLineItem
Details individual quote lines.
- `id`: `UUID` (Primary Key)
- `quotationId`: `UUID` (Foreign Key referencing `Quotation`)
- `courseId`: `UUID` (Foreign Key referencing `Course`)
- `quantity`: `INTEGER`
- `unitPrice`: `DECIMAL(18,3)`
- `discountAmount`: `DECIMAL(18,3)`
- `taxAmount`: `DECIMAL(18,3)`
- `lineTotal`: `DECIMAL(18,3)`
- Soft delete, version, and audit columns.

### QuotationRevision
Saves quote versions.
- `id`: `UUID` (Primary Key)
- `quotationId`: `UUID` (Foreign Key referencing `Quotation`)
- `revisionNumber`: `INTEGER`
- `snapshotJson`: `JSONB`
- `revisionReason`: `TEXT`
- `revisedBy`: `UUID` (Foreign Key referencing `User`)
- `revisedAt`: `TIMESTAMPTZ(6)`

### QuotationCostingSheet
Estimates profitability margins.
- `id`: `UUID` (Primary Key)
- `quotationId`: `UUID` (Foreign Key referencing `Quotation`)
- `trainerCost`: `DECIMAL(18,3)`
- `venueCost`: `DECIMAL(18,3)`
- `equipmentCost`: `DECIMAL(18,3)`
- `printingCost`: `DECIMAL(18,3)`
- `certificateCost`: `DECIMAL(18,3)`
- `travelCost`: `DECIMAL(18,3)`
- `accommodationCost`: `DECIMAL(18,3)`
- `foodCost`: `DECIMAL(18,3)`
- `vehicleCost`: `DECIMAL(18,3)`
- `administrationCost`: `DECIMAL(18,3)`
- `marketingCost`: `DECIMAL(18,3)`
- `miscellaneousCost`: `DECIMAL(18,3)`
- `totalDirectCost`: `DECIMAL(18,3)`
- `totalIndirectCost`: `DECIMAL(18,3)`
- `totalCost`: `DECIMAL(18,3)`
- `sellingPrice`: `DECIMAL(18,3)`
- `profitAmount`: `DECIMAL(18,3)`
- `profitPercentage`: `DECIMAL(5,2)`
- `status`: `VARCHAR(30)` (default `Draft`)
- Soft delete, version, and audit columns.

### SalesOrder
Commercially locked sales figures.
- `id`: `UUID` (Primary Key)
- `salesOrderNumber`: `VARCHAR(80)` (Unique Index)
- `quotationId`: `UUID` (Foreign Key referencing `Quotation`)
- `corporateAccountId`: `UUID` (Foreign Key referencing `CorporateAccount`)
- `orderDate`: `DATE`
- `totalAmount`: `DECIMAL(18,3)`
- `status`: `VARCHAR(30)` (default `Draft`)
- `LpoDocumentId`: `UUID` (optional Link to uploaded PDF document)
- `branchId`: `UUID` (Foreign Key referencing `Branch`)
- Soft delete, version, and audit columns.

---

# 2. Prisma Model Definitions

Add these definitions under `packages/database/prisma/schema.prisma` in development:

```prisma
model CorporateSalesLead {
  id                 String                     @id @default(uuid()) @db.Uuid
  corporateAccountId String                     @db.Uuid
  leadId             String?                    @db.Uuid
  salesOwnerId       String                     @db.Uuid
  branchId           String                     @db.Uuid
  stage              String                     @db.VarChar(50) // New, VisitPlanned, VisitCompleted, QuotationSent, Confirmed, Lost
  expectedValue      Decimal                    @db.Decimal(18, 3)
  expectedCloseDate  DateTime                   @db.Date
  status             String                     @default("Active") @db.VarChar(30)
  version            Int                        @default(1)
  createdAt          DateTime                   @default(now()) @db.Timestamptz(6)
  createdBy          String?                    @db.Uuid
  updatedAt          DateTime?                  @updatedAt @db.Timestamptz(6)
  updatedBy          String?                    @db.Uuid
  deletedAt          DateTime?                  @db.Timestamptz(6)
  deletedBy          String?                    @db.Uuid
  isDeleted          Boolean                    @default(false)

  // Relations
  corporateAccount   CorporateAccount           @relation(fields: [corporateAccountId], references: [id], onDelete: Restrict)
  branch             Branch                     @relation(fields: [branchId], references: [id], onDelete: Restrict)
  visits             CorporateMarketingVisit[]
  followUps          CorporateSalesFollowUp[]
  quotations         Quotation[]

  @@index([corporateAccountId, stage])
  @@index([branchId])
  @@map("corporate_sales_leads")
}

model CorporateMarketingVisit {
  id                         String             @id @default(uuid()) @db.Uuid
  corporateSalesLeadId       String             @db.Uuid
  corporateAccountId         String             @db.Uuid
  companyNameSnapshot        String             @db.VarChar(255)
  contactPersonNameSnapshot  String             @db.VarChar(255)
  contactNumberSnapshot      String             @db.VarChar(32)
  emailSnapshot              String             @db.VarChar(320)
  meetingDate                DateTime           @db.Date
  discussionNotes            String             @db.Text
  coursesDiscussed           String             @db.Text
  expectedCandidates         Int
  expectedTrainingDate       DateTime           @db.Date
  visitOutcome               String?            @db.VarChar(50)
  branchId                   String             @db.Uuid
  version                    Int                @default(1)
  createdAt                  DateTime           @default(now()) @db.Timestamptz(6)
  createdBy                  String?            @db.Uuid
  updatedAt                  DateTime?          @updatedAt @db.Timestamptz(6)
  updatedBy                  String?            @db.Uuid
  deletedAt                  DateTime?          @db.Timestamptz(6)
  deletedBy                  String?            @db.Uuid
  isDeleted                  Boolean            @default(false)

  // Relations
  lead                       CorporateSalesLead @relation(fields: [corporateSalesLeadId], references: [id], onDelete: Restrict)
  corporateAccount           CorporateAccount   @relation(fields: [corporateAccountId], references: [id], onDelete: Restrict)
  branch                     Branch             @relation(fields: [branchId], references: [id], onDelete: Restrict)

  @@index([corporateSalesLeadId])
  @@index([corporateAccountId])
  @@index([branchId])
  @@map("corporate_marketing_visits")
}

model CorporateSalesFollowUp {
  id                   String                   @id @default(uuid()) @db.Uuid
  corporateSalesLeadId String                   @db.Uuid
  assignedToUserId     String                   @db.Uuid
  followUpDate         DateTime                 @db.Timestamptz(6)
  followUpType         String                   @db.VarChar(50)
  notes                String                   @db.Text
  outcome              String?                  @db.VarChar(100)
  nextFollowUpDate     DateTime?                @db.Date
  status               String                   @default("Scheduled") @db.VarChar(30)
  reminderGenerated    Boolean                  @default(false)
  branchId             String                   @db.Uuid
  version              Int                      @default(1)
  createdAt            DateTime                 @default(now()) @db.Timestamptz(6)
  createdBy            String?                  @db.Uuid
  updatedAt            DateTime?                @updatedAt @db.Timestamptz(6)
  updatedBy            String?                  @db.Uuid
  deletedAt            DateTime?                @db.Timestamptz(6)
  deletedBy            String?                  @db.Uuid
  isDeleted            Boolean                  @default(false)

  // Relations
  lead                 CorporateSalesLead       @relation(fields: [corporateSalesLeadId], references: [id], onDelete: Restrict)
  branch               Branch                   @relation(fields: [branchId], references: [id], onDelete: Restrict)

  @@index([corporateSalesLeadId])
  @@index([assignedToUserId, status])
  @@index([branchId])
  @@map("corporate_sales_follow_ups")
}

model Quotation {
  id                   String                   @id @default(uuid()) @db.Uuid
  quotationNumber      String                   @unique @db.VarChar(80)
  corporateAccountId   String                   @db.Uuid
  corporateSalesLeadId String                   @db.Uuid
  quotationDate        DateTime                 @db.Date
  validUntil           DateTime                 @db.Date
  subtotal             Decimal                  @db.Decimal(18, 3)
  discountAmount       Decimal                  @db.Decimal(18, 3)
  taxAmount            Decimal                  @db.Decimal(18, 3)
  totalAmount          Decimal                  @db.Decimal(18, 3)
  status               String                   @default("Draft") @db.VarChar(30) // Draft, SubmittedForApproval, Approved, Rejected, Sent, Accepted, Expired
  approvedBy           String?                  @db.Uuid
  approvedAt           DateTime?                @db.Timestamptz(6)
  branchId             String                   @db.Uuid
  version              Int                      @default(1)
  createdAt            DateTime                 @default(now()) @db.Timestamptz(6)
  createdBy            String?                  @db.Uuid
  updatedAt            DateTime?                @updatedAt @db.Timestamptz(6)
  updatedBy            String?                  @db.Uuid
  deletedAt            DateTime?                @db.Timestamptz(6)
  deletedBy            String?                  @db.Uuid
  isDeleted            Boolean                  @default(false)

  // Relations
  corporateAccount     CorporateAccount         @relation(fields: [corporateAccountId], references: [id], onDelete: Restrict)
  lead                 CorporateSalesLead       @relation(fields: [corporateSalesLeadId], references: [id], onDelete: Restrict)
  branch               Branch                   @relation(fields: [branchId], references: [id], onDelete: Restrict)
  lineItems            QuotationLineItem[]
  costingSheet         QuotationCostingSheet?
  revisions            QuotationRevision[]
  salesOrders          SalesOrder[]

  @@index([corporateAccountId])
  @@index([corporateSalesLeadId])
  @@index([branchId, status])
  @@map("quotations")
}

model QuotationLineItem {
  id             String                         @id @default(uuid()) @db.Uuid
  quotationId    String                         @db.Uuid
  courseId       String                         @db.Uuid
  quantity       Int
  unitPrice      Decimal                        @db.Decimal(18, 3)
  discountAmount Decimal                        @db.Decimal(18, 3)
  taxAmount      Decimal                        @db.Decimal(18, 3)
  lineTotal      Decimal                        @db.Decimal(18, 3)
  version        Int                            @default(1)
  createdAt      DateTime                       @default(now()) @db.Timestamptz(6)
  createdBy      String?                        @db.Uuid
  updatedAt      DateTime?                      @updatedAt @db.Timestamptz(6)
  updatedBy      String?                        @db.Uuid
  deletedAt      DateTime?                      @db.Timestamptz(6)
  deletedBy      String?                        @db.Uuid
  isDeleted      Boolean                        @default(false)

  // Relations
  quotation      Quotation                      @relation(fields: [quotationId], references: [id], onDelete: Restrict)
  course         Course                         @relation(fields: [courseId], references: [id], onDelete: Restrict)

  @@index([quotationId])
  @@map("quotation_line_items")
}

model QuotationRevision {
  id              String                        @id @default(uuid()) @db.Uuid
  quotationId     String                        @db.Uuid
  revisionNumber  Int
  snapshotJson    Json
  revisionReason  String                        @db.Text
  revisedBy       String                        @db.Uuid
  revisedAt       DateTime                      @default(now()) @db.Timestamptz(6)

  // Relations
  quotation       Quotation                     @relation(fields: [quotationId], references: [id], onDelete: Restrict)

  @@index([quotationId])
  @@map("quotation_revisions")
}

model QuotationCostingSheet {
  id                 String                     @id @default(uuid()) @db.Uuid
  quotationId        String                     @unique @db.Uuid
  trainerCost        Decimal                    @db.Decimal(18, 3)
  venueCost          Decimal                    @db.Decimal(18, 3)
  equipmentCost      Decimal                    @db.Decimal(18, 3)
  printingCost       Decimal                    @db.Decimal(18, 3)
  certificateCost    Decimal                    @db.Decimal(18, 3)
  travelCost         Decimal                    @db.Decimal(18, 3)
  accommodationCost  Decimal                    @db.Decimal(18, 3)
  foodCost           Decimal                    @db.Decimal(18, 3)
  vehicleCost        Decimal                    @db.Decimal(18, 3)
  administrationCost Decimal                    @db.Decimal(18, 3)
  marketingCost      Decimal                    @db.Decimal(18, 3)
  miscellaneousCost  Decimal                    @db.Decimal(18, 3)
  totalDirectCost    Decimal                    @db.Decimal(18, 3)
  totalIndirectCost  Decimal                    @db.Decimal(18, 3)
  totalCost          Decimal                    @db.Decimal(18, 3)
  sellingPrice       Decimal                    @db.Decimal(18, 3)
  profitAmount       Decimal                    @db.Decimal(18, 3)
  profitPercentage   Decimal                    @db.Decimal(5, 2)
  status             String                     @default("Draft") @db.VarChar(30)
  version            Int                        @default(1)
  createdAt          DateTime                   @default(now()) @db.Timestamptz(6)
  createdBy          String?                    @db.Uuid
  updatedAt          DateTime?                  @updatedAt @db.Timestamptz(6)
  updatedBy          String?                    @db.Uuid
  deletedAt          DateTime?                  @db.Timestamptz(6)
  deletedBy          String?                    @db.Uuid
  isDeleted          Boolean                    @default(false)

  // Relations
  quotation          Quotation                  @relation(fields: [quotationId], references: [id], onDelete: Restrict)

  @@map("quotation_costing_sheets")
}

model SalesOrder {
  id                 String                     @id @default(uuid()) @db.Uuid
  salesOrderNumber   String                     @unique @db.VarChar(80)
  quotationId        String                     @db.Uuid
  corporateAccountId String                     @db.Uuid
  orderDate          DateTime                   @db.Date
  totalAmount        Decimal                    @db.Decimal(18, 3)
  status             String                     @default("Draft") @db.VarChar(30) // Draft, Confirmed, ContractInitiated, TrainingHandoffCompleted, Cancelled
  LpoDocumentId      String?                    @db.Uuid
  branchId           String                     @db.Uuid
  version            Int                        @default(1)
  createdAt          DateTime                   @default(now()) @db.Timestamptz(6)
  createdBy          String?                    @db.Uuid
  updatedAt          DateTime?                  @updatedAt @db.Timestamptz(6)
  updatedBy          String?                    @db.Uuid
  deletedAt          DateTime?                  @db.Timestamptz(6)
  deletedBy          String?                    @db.Uuid
  isDeleted          Boolean                    @default(false)

  // Relations
  quotation          Quotation                  @relation(fields: [quotationId], references: [id], onDelete: Restrict)
  corporateAccount   CorporateAccount           @relation(fields: [corporateAccountId], references: [id], onDelete: Restrict)
  branch             Branch                     @relation(fields: [branchId], references: [id], onDelete: Restrict)

  @@index([quotationId])
  @@index([corporateAccountId])
  @@index([branchId])
  @@map("sales_orders")
}
```

---

# 3. CRUD & Context Ownership Matrix

| Entity | Owning Context | Created By | Read By | Updated By | Deleted By (Soft) | Transaction Lock Trigger |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `CorporateSalesLead` | Corporate Sales | Sales Executive | Sales Executive, Managers, CTM | Sales Executive, System | Sales Executive, Manager | Locked once transitioned to `Confirmed` / `Lost` |
| `CorporateMarketingVisit` | Corporate Sales | Sales Executive | Sales Executive, Managers | Sales Executive | Sales Executive, Manager | None |
| `CorporateSalesFollowUp` | Corporate Sales | Sales Executive, System | Sales Executive, System | Sales Executive, System | Sales Executive | None |
| `Quotation` | Corporate Sales | Sales Manager | Sales Manager, Branch Approvers, CTM | Sales Manager, Approvers | Sales Manager | Locked if status is `SubmittedForApproval` / `Approved` / `Accepted` |
| `QuotationLineItem` | Corporate Sales | Sales Manager | Sales Manager, Approvers | Sales Manager | Sales Manager | Same as Quotation |
| `QuotationRevision` | Corporate Sales | System (Auto-Revised) | Sales Manager, Approvers | Read-only | None | Complete Write Once Lock |
| `QuotationCostingSheet` | Corporate Sales | Sales Manager | Sales Manager, Approvers | Sales Manager | Sales Manager | Locked if Quotation is Locked |
| `SalesOrder` | Corporate Sales | Sales Manager (Auto-Won) | Sales Manager, CTM Admin, Finance | CTM Admin (Status change) | Sales Manager, CTM Admin | Locked once transitioned to `TrainingHandoffCompleted` |
| `Document` | Document Management | System / Sales Manager | Sales Manager, CTM, Finance | Document context | Document context | None |
