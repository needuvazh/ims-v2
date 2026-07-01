# ASTI IMS: Functional Requirement Document
## Module 03: Lead & Inquiry Management
### Part 4 – Database Entities and CRUD Matrix

---

## 1. Entity Specifications

This section defines the database tables, Prisma models, data types, keys, and constraint rules for the Lead & Inquiry Management bounded context. All UUIDs conform to RFC 4122. All temporal timestamps default to PostgreSQL `TIMESTAMPTZ` set to Muscat timezone (GST, UTC+4).

### 1.1 `inquiries` Table (Inquiry Entity)
Represents raw, unqualified prospect inquiries ingested from manual intake channels or the public website integration API.

| Field Name | Prisma Type | PostgreSQL Type | Nullability | Key Type | Constraints / Indexes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `String` | `UUID` | NOT NULL | PK | `@default(uuid())` |
| `inquiryNumber` | `String` | `VARCHAR(50)` | NOT NULL | Unique | Unique Index |
| `branchId` | `String` | `UUID` | NOT NULL | FK | References `branches(id)`. Index |
| `firstName` | `String` | `VARCHAR(100)` | NOT NULL | - | - |
| `lastName` | `String` | `VARCHAR(100)` | NOT NULL | - | - |
| `mobile` | `String` | `VARCHAR(30)` | NOT NULL | - | Index (Fuzzy matches) |
| `email` | `String` | `VARCHAR(255)` | NULL | - | Index |
| `source` | `LeadSource` | `LeadSource` (Enum) | NOT NULL | - | Default: `Other` |
| `interestedCourseId`| `String` | `UUID` | NULL | FK | References `courses(id)` |
| `counselorId` | `String` | `UUID` | NULL | FK | References `users(id)` |
| `priority` | `String` | `VARCHAR(20)` | NOT NULL | - | Default: `Medium` |
| `notes` | `String` | `TEXT` | NULL | - | - |
| `status` | `String` | `VARCHAR(50)` | NOT NULL | - | Default: `Captured` |
| `isDuplicate` | `Boolean` | `BOOLEAN` | NOT NULL | - | Default: `false` |
| `duplicateRefId`| `String` | `VARCHAR(150)` | NULL | - | ID of duplicate Lead/Student |
| `utmSource` | `String` | `VARCHAR(100)` | NULL | - | - |
| `utmMedium` | `String` | `VARCHAR(100)` | NULL | - | - |
| `utmCampaign` | `String` | `VARCHAR(100)` | NULL | - | - |
| **Audit Columns** | | | | | |
| `createdAt` | `DateTime` | `TIMESTAMPTZ` | NOT NULL | - | `@default(now())` |
| `createdBy` | `String` | `UUID` | NULL | - | - |
| `updatedAt` | `DateTime` | `TIMESTAMPTZ` | NULL | - | `@updatedAt` |
| `updatedBy` | `String` | `UUID` | NULL | - | - |
| `deletedAt` | `DateTime` | `TIMESTAMPTZ` | NULL | - | - |
| `deletedBy` | `String` | `UUID` | NULL | - | - |
| `isDeleted` | `Boolean` | `BOOLEAN` | NOT NULL | - | Default: `false`, Index |

---

### 1.2 `leads` Table (Lead Entity)
Represents a qualified sales lead, actively managed by a counselor through the pipeline toward conversion or closure.

| Field Name | Prisma Type | PostgreSQL Type | Nullability | Key Type | Constraints / Indexes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `String` | `UUID` | NOT NULL | PK | `@default(uuid())` |
| `leadNumber` | `String` | `VARCHAR(50)` | NOT NULL | Unique | Unique Index |
| `personId` | `String` | `UUID` | NOT NULL | FK | References `persons(id)`. Index |
| `branchId` | `String` | `UUID` | NOT NULL | FK | References `branches(id)`. Index |
| `firstName` | `String` | `VARCHAR(100)` | NOT NULL | - | - |
| `lastName` | `String` | `VARCHAR(100)` | NOT NULL | - | - |
| `email` | `String` | `VARCHAR(255)` | NULL | - | Index |
| `phone` | `String` | `VARCHAR(30)` | NOT NULL | - | Index |
| `stage` | `LeadStage` | `LeadStage` (Enum) | NOT NULL | - | Default: `New`, Index |
| `source` | `LeadSource` | `LeadSource` (Enum) | NOT NULL | - | Default: `Other` |
| `counselorId` | `String` | `UUID` | NULL | FK | References `users(id)`. Index |
| `interestedCourseId`| `String` | `UUID` | NOT NULL | FK | References `courses(id)` |
| `campaignId` | `String` | `UUID` | NULL | FK | References `campaigns(id)` |
| `priority` | `String` | `VARCHAR(20)` | NOT NULL | - | Default: `Medium` |
| `notes` | `String` | `TEXT` | NULL | - | - |
| `lostReasonCode`| `String` | `VARCHAR(50)` | NULL | - | Matches LookupValue code |
| `lostReasonNotes`| `String` | `TEXT` | NULL | - | - |
| `inquiryId` | `String` | `UUID` | NULL | FK | References `inquiries(id)` |
| `version` | `Int` | `INTEGER` | NOT NULL | - | Optimistic Lock: Default `1` |
| **Audit Columns** | | | | | |
| `createdAt` | `DateTime` | `TIMESTAMPTZ` | NOT NULL | - | `@default(now())` |
| `createdBy` | `String` | `UUID` | NULL | - | - |
| `updatedAt` | `DateTime` | `TIMESTAMPTZ` | NULL | - | `@updatedAt` |
| `updatedBy` | `String` | `UUID` | NULL | - | - |
| `deletedAt` | `DateTime` | `TIMESTAMPTZ` | NULL | - | - |
| `deletedBy` | `String` | `UUID` | NULL | - | - |
| `isDeleted` | `Boolean` | `BOOLEAN` | NOT NULL | - | Default: `false`, Index |

---

### 1.3 `lead_follow_ups` Table (Follow-Up Entity)
Logs scheduled tasks and historical outcomes of communication between counselors and leads.

| Field Name | Prisma Type | PostgreSQL Type | Nullability | Key Type | Constraints / Indexes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `String` | `UUID` | NOT NULL | PK | `@default(uuid())` |
| `leadId` | `String` | `UUID` | NOT NULL | FK | References `leads(id)`. Index |
| `counselorId` | `String` | `UUID` | NOT NULL | FK | References `users(id)`. Index |
| `followUpDate` | `DateTime` | `TIMESTAMPTZ` | NOT NULL | - | Index |
| `followUpType` | `String` | `VARCHAR(50)` | NOT NULL | - | Call, Email, WhatsApp, Visit |
| `notes` | `String` | `TEXT` | NULL | - | - |
| `outcome` | `String` | `VARCHAR(50)` | NULL | - | Answered, Busy, SwitchedOff, NoResponse, NotInterested, Interested, VisitScheduled |
| `status` | `String` | `VARCHAR(50)` | NOT NULL | - | Scheduled, Completed, Cancelled |
| **Audit Columns** | | | | | |
| `createdAt` | `DateTime` | `TIMESTAMPTZ` | NOT NULL | - | `@default(now())` |
| `createdBy` | `String` | `UUID` | NULL | - | - |
| `updatedAt` | `DateTime` | `TIMESTAMPTZ` | NULL | - | - |
| `updatedBy` | `String` | `UUID` | NULL | - | - |

---

### 1.4 `campaigns` Table (Campaign Entity)
Stores details of marketing campaigns to support lead source attribution and analytical CPL tracking.

| Field Name | Prisma Type | PostgreSQL Type | Nullability | Key Type | Constraints / Indexes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `String` | `UUID` | NOT NULL | PK | `@default(uuid())` |
| `campaignName` | `String` | `VARCHAR(150)` | NOT NULL | Unique | Unique Index |
| `campaignType` | `String` | `VARCHAR(50)` | NOT NULL | - | Social, Search, Print, SMS |
| `utmSource` | `String` | `VARCHAR(100)` | NOT NULL | Unique | Combined Unique `[utmSource, utmMedium, utmCampaign]` |
| `utmMedium` | `String` | `VARCHAR(100)` | NOT NULL | - | - |
| `utmCampaign` | `String` | `VARCHAR(100)` | NOT NULL | - | - |
| `budget` | `Decimal` | `DECIMAL(12,3)` | NOT NULL | - | OMR Currency (3 decimals) |
| `effectiveStartDate`| `DateTime`| `DATE` | NOT NULL | - | - |
| `effectiveEndDate`| `DateTime` | `DATE` | NULL | - | - |
| `status` | `String` | `VARCHAR(50)` | NOT NULL | - | Default: `Active` |
| **Audit Columns** | | | | | |
| `createdAt` | `DateTime` | `TIMESTAMPTZ` | NOT NULL | - | `@default(now())` |
| `createdBy` | `String` | `UUID` | NULL | - | - |
| `updatedAt` | `DateTime` | `TIMESTAMPTZ` | NULL | - | - |
| `updatedBy` | `String` | `UUID` | NULL | - | - |
| `deletedAt` | `DateTime` | `TIMESTAMPTZ` | NULL | - | - |
| `isDeleted` | `Boolean` | `BOOLEAN` | NOT NULL | - | Default: `false` |

### 1.5 `lead_notes` Table (Lead Note Entity)
Stores timeline note logs posted by counselors or managers regarding a lead.

| Field Name | Prisma Type | PostgreSQL Type | Nullability | Key Type | Constraints / Indexes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `String` | `UUID` | NOT NULL | PK | `@default(uuid())` |
| `leadId` | `String` | `UUID` | NOT NULL | FK | References `leads(id)`. Index |
| `content` | `String` | `TEXT` | NOT NULL | - | Note details (Immutable) |
| `createdAt` | `DateTime` | `TIMESTAMPTZ` | NOT NULL | - | `@default(now())` |
| `createdBy` | `String` | `UUID` | NOT NULL | FK | References `users(id)` |

---

### 1.6 `lead_stage_history` Table (Stage History Entity)
Logs all pipeline stage transitions for auditing and timeline presentation.

| Field Name | Prisma Type | PostgreSQL Type | Nullability | Key Type | Constraints / Indexes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `String` | `UUID` | NOT NULL | PK | `@default(uuid())` |
| `leadId` | `String` | `UUID` | NOT NULL | FK | References `leads(id)`. Index |
| `oldStage` | `String` | `VARCHAR(50)` | NOT NULL | - | Prior stage |
| `newStage` | `String` | `VARCHAR(50)` | NOT NULL | - | Current transitioned stage |
| `lostReasonCode` | `String`| `VARCHAR(100)`| NULL | - | Required if transitioning to Lost |
| `lostReasonNotes`| `String`| `TEXT` | NULL | - | Required if transitioning to Lost |
| `performedBy` | `String` | `UUID` | NOT NULL | FK | References `users(id)` |
| `performedAt` | `DateTime` | `TIMESTAMPTZ` | NOT NULL | - | `@default(now())` |

---

## 2. Entity Relationships & Integrity Rules

```mermaid
erDiagram
    BRANCH ||--o{ INQUIRY : receives
    COURSE ||--o{ INQUIRY : references
    USER ||--o{ INQUIRY : manages
    PERSON ||--|| LEAD : identifies
    BRANCH ||--o{ LEAD : owns
    COURSE ||--o{ LEAD : targets
    USER ||--o{ LEAD : assigned-to
    CAMPAIGN ||--o{ LEAD : attributes
    INQUIRY ||--o[1] LEAD : qualifies-to
    LEAD ||--o{ LEAD_FOLLOW_UP : records
    USER ||--o{ LEAD_FOLLOW_UP : executes
    LEAD ||--o{ LEAD_NOTE : contains
    LEAD ||--o{ LEAD_STAGE_HISTORY : logs
```

### 2.1 Referential Integrity Constraints
* **Inquiry to Lead (`inquiryId` -> `leads.inquiryId`)**:
  * **Relationship**: `1:0..1` (An inquiry can match at most one converted Lead).
  * **Constraint**: `ON DELETE SET NULL`. If an inquiry record is logically archived, the lead's historical link is preserved.
* **Person to Lead (`personId` -> `leads.personId`)**:
  * **Relationship**: `1:N` (A unique person profile can match multiple leads over time for distinct courses).
  * **Constraint**: `ON DELETE RESTRICT`. A person profile cannot be deleted if a lead references it.
  * **Duplicate Override Policy**: If a duplicate lead creation is forced via API or Counselor action (`bypassDuplicateBlock = true`), the system MUST link the new `Lead` record to the existing `Person.id` (reusing the profile) rather than creating a duplicate `Person` record, to satisfy the `@unique` constraint on `Person.mobile`.
* **Lead to Follow-up (`leadId` -> `lead_follow_ups.leadId`)**:
  * **Relationship**: `1:N` (A lead contains multiple follow-up logs).
  * **Constraint**: `ON DELETE RESTRICT`. If a lead is physically removed, follow-up records are blocked from orphan state (in practice, soft-deletion does not trigger database cascaded deletes).
* **Branch to Lead / Inquiry (`branchId`)**:
  * **Relationship**: `1:N` (A branch handles multiple leads/inquiries).
  * **Constraint**: `ON DELETE RESTRICT`. Branches cannot be deleted if active leads are registered under them.
* **Campaign to Lead (`campaignId`)**:
  * **Relationship**: `1:N` (A marketing campaign maps to multiple leads).
  * **Constraint**: `ON DELETE RESTRICT`. Active campaigns cannot be deleted if leads are associated with them.

---

## 3. CRUD Matrix & Access Control Scoping

This matrix maps access rights for each actor against the context's entities. All operations are subject to the **Branch-Scoping** rules defined in section 3.1.

### 3.1 Branch-Scoping Rules
1. **Counselor Scope**: Can only execute CRUD operations on `inquiries`, `leads`, and `lead_follow_ups` if they possess a valid `UserBranchAccess` entry matching the entity's `branchId` AND the entity is explicitly assigned to them (`counselorId == currentUserId`).
2. **Branch Admin Scope**: Can execute CRUD operations on all records matching their authorized `branchId` list, regardless of the assigned counselor.
3. **Super Admin Scope**: Global context access. No branch filters applied on queries unless explicitly requested by UI selectors.
4. **Web API Client Scope**: Restricted to write-only `CREATE` actions for inquiries. No read permission on existing records.

### 3.2 Matrix Table

| Human/System Actor | Entity | C | R | U | D | Audit Tracked? | Access Scoping Logic |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Super Admin** | inquiries | Yes | Yes | Yes | Soft | Yes | Global access. No filter locks. |
| | leads | Yes | Yes | Yes | Soft | Yes | Global access. |
| | lead_follow_ups| Yes | Yes | Yes | Yes | Yes | Global access. |
| | campaigns | Yes | Yes | Yes | Soft | Yes | Global access. |
| **Branch Admin** | inquiries | Yes | Yes | Yes | Soft | Yes | Branch-bound (`branchId` match). |
| | leads | Yes | Yes | Yes | Soft | Yes | Branch-bound (`branchId` match). Can assign counselors. |
| | lead_follow_ups| Yes | Yes | Yes | No | Yes | Branch-bound. |
| | campaigns | No | Yes | No | No | Yes | Read-only. |
| **Counselor** | inquiries | Yes | Yes | Yes | No | Yes | Branch-bound. Can read all branch inquiries; can edit only if assigned. |
| | leads | Yes | Yes | Yes | No | Yes | Assigned-bound (`counselorId == user.id`). Can only edit assigned leads. |
| | lead_follow_ups| Yes | Yes | Yes | No | Yes | Assigned-bound. Can only create/edit follow-ups for assigned leads. |
| | campaigns | No | Yes | No | No | No | Read-only. |
| **Receptionist** | inquiries | Yes | Yes | Yes | No | Yes | Branch-bound (`branchId` match). |
| | leads | No | Yes | No | No | No | Read-only access within branch. |
| | lead_follow_ups| No | No | No | No | No | Denied. |
| | campaigns | No | No | No | No | No | Denied. |
| **Registrar** | inquiries | No | No | No | No | No | Denied. |
| | leads | No | Yes | No | No | No | Read-only access within branch scope. |
| | lead_follow_ups| No | No | No | No | No | Denied. |
| | campaigns | No | No | No | No | No | Denied. |
| **Accountant** | inquiries | No | No | No | No | No | Denied. |
| | leads | No | Yes | No | No | No | Read-only access within branch scope. |
| | lead_follow_ups| No | No | No | No | No | Denied. |
| | campaigns | No | No | No | No | No | Denied. |
| **Executive** | inquiries | No | Yes | No | No | No | Read-only global access. |
| | leads | No | Yes | No | No | No | Read-only global access. |
| | lead_follow_ups| No | No | No | No | No | Denied. |
| | campaigns | No | Yes | No | No | No | Read-only global access. |
| **Web Ingestion API**| inquiries | Yes | No | No | No | Yes | Write-only. Automatically injects client-sent `branchId`. |
| | leads | No | No | No | No | No | Denied. |
| | lead_follow_ups| No | No | No | No | No | Denied. |
| | campaigns | No | No | No | No | No | Denied. |
