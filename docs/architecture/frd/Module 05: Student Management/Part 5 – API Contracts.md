# Part 5 – API Contracts
## Module 5 – Student Management

## 1. Purpose

This document defines the REST API contracts and server-action style command contracts for **Module 5 – Student Management**. The contracts are aligned to the module boundary established in Parts 1–4:

- Student Management owns `StudentProfile` and student-specific operational workflows.
- Shared identity (`Party`, `Person`) is referenced, not duplicated.
- Server-side branch scoping is mandatory for every read and write.
- Soft delete only; no hard delete endpoint is exposed.
- Sensitive actions require explicit reason capture and must emit audit events.

The API style assumes a Next.js modular monolith using route handlers and/or internal server actions, with Zod validation at the application boundary.

---

## 2. Conventions

## 2.1 Base Route Prefix

```text
/api/admin/student-management
```

Portal-specific read-only surfaces:

```text
/api/student-portal/student-management
/api/trainer-portal/student-management
```

## 2.2 Authentication Model

All endpoints require authenticated user context except internal trusted server actions invoked inside the modular monolith. Authentication is handled by the shared Identity & Access context.

Every request resolves:
- `userId`
- `activeBranchId`
- `assignedBranchIds`
- `canViewConsolidated`
- granted permissions

## 2.3 Permission Naming Convention

Action-level permissions use:
- `student.read`
- `student.create`
- `student.update`
- `student.status.change`
- `student.archive`
- `student.restore`
- `student.idcard.manage`
- `student.duplicate.read`
- `student.duplicate.resolve`
- `student.merge`
- `student.export`
- `student.audit.read`
- `student.portal.self.read`
- `student.trainer.roster.read`

Sensitive identity fields are masked by default in read responses. Returning unmasked identity values requires `student.identity.unmasked.read` in addition to the base read permission and branch scope.

Menu-level permissions use:
- `menu.studentManagement`
- `menu.studentManagement.list`
- `menu.studentManagement.duplicateWorkbench`
- `menu.studentManagement.audit`
- `menu.studentManagement.export`

Report-level permissions use:
- `report.studentMaster`
- `report.studentStatusHistory`
- `report.studentDuplicateCases`
- `report.studentMergeHistory`

## 2.4 Standard Success Envelope

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_01JABCXYZ",
    "timestamp": "2026-07-03T10:15:30+04:00"
  }
}
```

## 2.5 Standard Error Envelope

```json
{
  "success": false,
  "error": {
    "httpStatus": 409,
    "code": "ERR_STU_DUPLICATE_BLOCKING_MATCH",
    "message": "A blocking duplicate student or person match was found.",
    "details": {
      "duplicateCaseId": "8d4f7b4d-5d77-4f8a-9f45-9ac13e799001"
    }
  },
  "meta": {
    "requestId": "req_01JABCXYZ",
    "timestamp": "2026-07-03T10:15:30+04:00"
  }
}
```

## 2.6 Standard Pagination Envelope

```json
{
  "success": true,
  "data": {
    "items": [],
    "page": 1,
    "pageSize": 25,
    "totalItems": 238,
    "totalPages": 10
  },
  "meta": {
    "requestId": "req_01JABCXYZ",
    "timestamp": "2026-07-03T10:15:30+04:00"
  }
}
```

## 2.7 Standard Branch-Scoping Rules

1. If the caller does not have consolidated permission, all reads and writes are restricted to:
   - the active branch, or
   - another explicitly assigned branch in the request where allowed.
2. If the caller has consolidated permission, cross-branch reads are allowed only when the requested branch is inside the caller’s assigned branch set or allowed child-branch set.
3. Create and update endpoints always validate the target branch server-side.
4. Internal service calls must carry explicit `branchId` in command payload or derive it from the parent object (Admission, CorporateParticipant, Enrollment, WalkIn context).
5. Attempts to read or mutate out-of-scope records return:
   - `404` when the system must conceal record existence, or
   - `403` when policy allows explicit denial.

---

## 3. Shared Zod Schema Building Blocks

```ts
import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const dateTimeSchema = z.string().datetime({ offset: true });

export const englishNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z][A-Za-z '.-]{0,98}[A-Za-z.]$/);

export const optionalEnglishNameSchema = z
  .string()
  .trim()
  .max(100)
  .regex(/^$|^[A-Za-z][A-Za-z '.-]{0,98}[A-Za-z.]$/);

export const arabicNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[\u0600-\u06FF][\u0600-\u06FF\s'.-]{0,198}[\u0600-\u06FF]$/);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5)
  .max(254)
  .email();

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{7,14}$/);

export const civilIdSchema = z
  .string()
  .trim()
  .min(5)
  .max(30)
  .regex(/^[A-Za-z0-9-]{5,30}$/);

export const passportSchema = z
  .string()
  .trim()
  .min(3)
  .max(20)
  .regex(/^[A-Za-z0-9]{3,20}$/);

export const visaSchema = z
  .string()
  .trim()
  .min(3)
  .max(30)
  .regex(/^[A-Za-z0-9/-]{3,30}$/);

export const reason500Schema = z.string().trim().min(10).max(500);
export const reason1000Schema = z.string().trim().min(20).max(1000);

export const statusEnum = z.enum(["Pending", "Active", "Suspended", "Archived"]);
export const creationSourceEnum = z.enum([
  "ApprovedAdmission",
  "DirectRegistration",
  "CorporateConversion",
  "WalkInHandoff",
  "OnlineHandoff",
  "MergeSurvivor"
]);

export const exportFormatEnum = z.enum(["CSV", "XLSX"]);
export const exportScopeEnum = z.enum(["CurrentPage", "AllFiltered", "SelectedRows"]);
```

---

## 4. Endpoint Inventory

| Route | Method | Purpose |
|---|---|---|
| `/students` | GET | List students with branch-scoped search/filter/sort/paging |
| `/students` | POST | Create student via direct registration |
| `/students/from-admission` | POST | Create or reuse student from approved admission |
| `/students/from-corporate-participant` | POST | Convert or reuse student from corporate participant |
| `/students/lookup` | POST | Branch-scoped quick lookup for side drawer/selectors |
| `/students/duplicate-check` | POST | Run duplicate screening before create/update |
| `/students/preflight-lookup` | POST | Run global masked identity preflight search before form load |
| `/students/request-profile-otp` | POST | Request OTP challenge to verify and claim an existing profile |
| `/students/claim-profile` | POST | Associate an existing profile with a new branch via admission |
| `/students/{studentId}` | GET | Read student detail summary |
| `/students/{studentId}` | PATCH | Update student profile fields |
| `/students/{studentId}/status` | POST | Change student lifecycle status |
| `/students/{studentId}/archive` | POST | Archive student (soft delete) |
| `/students/{studentId}/restore` | POST | Restore archived student |
| `/students/{studentId}/id-card` | POST | Issue or update current ID card state |
| `/students/{studentId}/id-card/reissue` | POST | Reissue ID card and log history |
| `/students/{studentId}/timeline` | GET | Get student timeline events |
| `/students/{studentId}/related-summary` | GET | Admission / enrollment / document summary |
| `/students/{studentId}/audit` | GET | Get student audit trail |
| `/duplicate-cases` | GET | List duplicate cases |
| `/duplicate-cases/{caseId}` | GET | Read duplicate case detail |
| `/duplicate-cases/{caseId}/resolve` | POST | Resolve duplicate case without merge |
| `/merge` | POST | Merge duplicate student profiles |
| `/exports` | POST | Export filtered student dataset |
| `/exports/{exportLogId}` | GET | Read export job/result metadata |
| `/student-portal/me/profile` | GET | Student self-view profile |
| `/student-portal/me/related-summary` | GET | Student self-view related admissions/enrollments/documents summary |
| `/trainer-portal/batches/{batchId}/students/{studentId}/quick-view` | GET | Trainer read-only student quick view from roster context |

---

## 5. Detailed Endpoint Contracts

# 5.1 GET `/api/admin/student-management/students`

### Purpose
List student profiles using server-side filter, sort, paging, and branch scoping.

### Authentication & Required Permission
- Authenticated user required
- Required permissions:
  - `student.read`
  - `menu.studentManagement.list`

### Branch-Scoping Behavior
- If `branchId` is omitted:
  - use `activeBranchId`
- If `branchId` is provided:
  - must belong to assigned branches
- `consolidated=true` allowed only with `canViewConsolidated`
- `branchId` and `consolidated=true` cannot request branches outside the caller’s allowed set

### Query Schema (Zod)
```ts
const listStudentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  branchId: uuidSchema.optional(),
  consolidated: z.coerce.boolean().optional().default(false),
  globalSearch: z.string().trim().max(150).optional(),
  studentStatus: z.array(statusEnum).optional(),
  studentNumber: z.string().trim().max(50).optional(),
  primaryPhone: z.string().trim().regex(/^\+?[1-9]\d{0,14}$/).optional(),
  primaryEmail: z.string().trim().max(254).optional(),
  civilId: z.string().trim().max(30).optional(),
  passportNumber: z.string().trim().max(20).optional(),
  visaNumber: z.string().trim().max(30).optional(),
  joinedAtFrom: dateSchema.optional(),
  joinedAtTo: dateSchema.optional(),
  hasIdCard: z.enum(["All", "Yes", "No"]).optional(),
  hasAdmissionLink: z.enum(["All", "Yes", "No"]).optional(),
  hasEnrollment: z.enum(["All", "Yes", "No"]).optional(),
  isArchived: z.enum(["All", "ActiveOnly", "ArchivedOnly"]).optional().default("ActiveOnly"),
  sortBy: z.enum([
    "studentNumber",
    "fullName",
    "joinedAt",
    "branchName",
    "studentStatus",
    "updatedAt"
  ]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
}).superRefine((data, ctx) => {
  if (data.joinedAtFrom && data.joinedAtTo && data.joinedAtFrom > data.joinedAtTo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["joinedAtTo"],
      message: "joinedAtTo must be greater than or equal to joinedAtFrom"
    });
  }
});
```

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "331b6076-1e36-4b91-b8e6-c96ef1f0d701",
        "studentNumber": "ASTI-MCT-2026-000231",
        "personId": "e3ef5d07-5d42-4ef1-9db6-632ad8e27e32",
        "fullName": {
          "en": "Ahmed Khalid",
          "ar": "أحمد خالد"
        },
        "primaryPhoneMasked": "+968****4567",
        "primaryEmailMasked": "a***@example.com",
        "nationalityCode": "OM",
        "branch": {
          "id": "9b38949b-4c2f-4cd5-9cb4-8c6dba679101",
          "code": "MCT",
          "name": "Muscat Branch"
        },
        "studentStatus": "Active",
        "joinedAt": "2026-06-01",
        "idCardIssued": true,
        "activeEnrollmentsCount": 2,
        "admissionNumber": "ADM-2026-00455",
        "duplicateReviewRequired": false,
        "updatedAt": "2026-07-02T14:35:11+04:00",
        "isArchived": false
      }
    ],
    "page": 1,
    "pageSize": 25,
    "totalItems": 238,
    "totalPages": 10
  },
  "meta": {
    "requestId": "req_01JABCXYZ",
    "timestamp": "2026-07-03T10:15:30+04:00"
  }
}
```

### Error Response Catalog
| HTTP | App Error Code | Meaning |
|---|---|---|
| 400 | `ERR_STU_INVALID_QUERY` | Query schema invalid |
| 401 | `ERR_AUTH_UNAUTHENTICATED` | No valid session |
| 403 | `ERR_AUTH_PERMISSION_DENIED` | Missing `student.read` |
| 403 | `ERR_AUTH_BRANCH_SCOPE_DENIED` | Requested branch is outside scope |
| 422 | `ERR_STU_INVALID_DATE_RANGE` | Joined-at range invalid |
| 500 | `ERR_SYS_INTERNAL` | Unexpected failure |

---

# 5.2 POST `/api/admin/student-management/students`

### Purpose
Create student via authorized direct registration flow.

### Authentication & Required Permission
- Authenticated
- Required:
  - `student.create`
  - `menu.studentManagement`
  - `menu.studentManagement.list`

### Branch-Scoping Behavior
- `branchId` in body must be writable by caller
- If omitted, branch resolution fails; create requires explicit target branch

### Request Payload Schema (Zod)
```ts
const createStudentDirectSchema = z.object({
  branchId: uuidSchema,
  creationSource: z.literal("DirectRegistration"),
  firstNameEnglish: englishNameSchema,
  middleNameEnglish: optionalEnglishNameSchema.optional(),
  lastNameEnglish: englishNameSchema,
  fullNameArabic: arabicNameSchema.optional(),
  gender: z.enum(["Male", "Female", "Other", "PreferNotToSay"]).optional(),
  dateOfBirth: dateSchema.optional(),
  nationalityCode: z.string().trim().min(2).max(10),
  civilId: civilIdSchema.optional(),
  passportNumber: passportSchema.optional(),
  visaNumber: visaSchema.optional(),
  primaryEmail: emailSchema.optional(),
  primaryPhone: phoneSchema,
  joinedAt: dateSchema,
  idCardIssued: z.boolean().default(false),
  idCardNumber: z.string().trim().max(50).optional(),
  remarks: z.string().trim().max(1000).optional()
}).superRefine((data, ctx) => {
  const hasIdentifier = !!(
    data.civilId || data.passportNumber || data.visaNumber || data.primaryEmail || data.primaryPhone
  );
  if (!hasIdentifier) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["civilId"],
      message: "At least one identifier/contact field is required"
    });
  }
  if (data.idCardIssued && !data.idCardNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["idCardNumber"],
      message: "idCardNumber is required when idCardIssued is true"
    });
  }
  if (!data.idCardIssued && data.idCardNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["idCardNumber"],
      message: "idCardNumber must be empty when idCardIssued is false"
    });
  }
});
```

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "331b6076-1e36-4b91-b8e6-c96ef1f0d701",
      "studentNumber": "ASTI-MCT-2026-000231",
      "branchId": "9b38949b-4c2f-4cd5-9cb4-8c6dba679101",
      "personId": "e3ef5d07-5d42-4ef1-9db6-632ad8e27e32",
      "studentStatus": "Active",
      "joinedAt": "2026-06-01",
      "idCardIssued": false,
      "duplicateReviewRequired": false,
      "creationSource": "DirectRegistration"
    }
  },
  "meta": {
    "requestId": "req_01JABCXYZ",
    "timestamp": "2026-07-03T10:15:30+04:00"
  }
}
```

### Error Response Catalog
| HTTP | App Error Code | Meaning |
|---|---|---|
| 400 | `ERR_STU_INVALID_PAYLOAD` | Schema validation failed |
| 401 | `ERR_AUTH_UNAUTHENTICATED` | No valid session |
| 403 | `ERR_AUTH_PERMISSION_DENIED` | Missing `student.create` |
| 403 | `ERR_AUTH_BRANCH_SCOPE_DENIED` | Target branch not writable |
| 404 | `ERR_CFG_NUMBERING_SERIES_NOT_FOUND` | Student numbering series missing |
| 409 | `ERR_STU_DUPLICATE_BLOCKING_MATCH` | Blocking duplicate found |
| 409 | `ERR_STU_PERSON_ALREADY_HAS_PROFILE` | Person already linked to student profile |
| 409 | `ERR_STU_ID_CARD_NUMBER_EXISTS` | ID card number already in use |
| 409 | `ERR_STU_IDENTITY_CONFLICT` | Civil ID / passport / visa / email / phone conflicts with existing person/student |
| 422 | `ERR_STU_INVALID_JOINED_AT` | Joined date invalid |
| 422 | `ERR_STU_INVALID_DOB` | Date of birth invalid |
| 500 | `ERR_SYS_INTERNAL` | Unexpected failure |

---

# 5.3 POST `/api/admin/student-management/students/from-admission`

### Purpose
Create or reuse student profile from approved admission.

### Authentication & Required Permission
- Authenticated
- Required:
  - `student.create`
  - `student.read`

### Branch-Scoping Behavior
- Admission branch must be writable by caller
- Branch derived from admission unless explicitly overridden by policy-enabled branch handoff

### Request Payload Schema (Zod)
```ts
const createFromAdmissionSchema = z.object({
  admissionId: uuidSchema,
  joinedAt: dateSchema,
  remarks: z.string().trim().max(1000).optional(),
  idCardIssued: z.boolean().default(false),
  idCardNumber: z.string().trim().max(50).optional()
}).superRefine((data, ctx) => {
  if (data.idCardIssued && !data.idCardNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["idCardNumber"],
      message: "idCardNumber is required when idCardIssued is true"
    });
  }
});
```

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "mode": "Created",
    "student": {
      "id": "331b6076-1e36-4b91-b8e6-c96ef1f0d701",
      "studentNumber": "ASTI-MCT-2026-000231",
      "personId": "e3ef5d07-5d42-4ef1-9db6-632ad8e27e32",
      "sourceAdmissionId": "f7ac38d5-6e79-4db3-a5a5-14d8c4f60211",
      "studentStatus": "Active"
    }
  }
}
```

Possible alternate success:
```json
{
  "success": true,
  "data": {
    "mode": "ReusedExisting",
    "student": {
      "id": "331b6076-1e36-4b91-b8e6-c96ef1f0d701",
      "studentNumber": "ASTI-MCT-2026-000231"
    }
  }
}
```

### Error Response Catalog
| HTTP | App Error Code | Meaning |
|---|---|---|
| 404 | `ERR_ADM_NOT_FOUND` | Admission not found or concealed by branch scope |
| 409 | `ERR_ADM_NOT_APPROVED` | Admission not in Approved state |
| 409 | `ERR_STU_DUPLICATE_BLOCKING_MATCH` | Blocking duplicate found |
| 409 | `ERR_STU_PERSON_ALREADY_HAS_PROFILE` | Person already has student profile |
| 422 | `ERR_STU_INVALID_JOINED_AT` | Joined date invalid |

---

# 5.4 POST `/api/admin/student-management/students/from-corporate-participant`

### Purpose
Convert or reuse student from corporate participant.

### Authentication & Required Permission
- Authenticated
- Required:
  - `student.create`
  - `student.read`

### Branch-Scoping Behavior
- `targetBranchId` must be writable by caller
- Corporate participant must be readable through corporate workflow context

### Request Payload Schema (Zod)
```ts
const createFromCorporateParticipantSchema = z.object({
  corporateParticipantId: uuidSchema,
  targetBranchId: uuidSchema,
  joinedAt: dateSchema,
  nationalityCode: z.string().trim().min(2).max(10).optional(),
  primaryEmail: emailSchema.optional(),
  primaryPhone: phoneSchema.optional(),
  remarks: z.string().trim().max(1000).optional()
});
```

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "mode": "Created",
    "student": {
      "id": "331b6076-1e36-4b91-b8e6-c96ef1f0d701",
      "studentNumber": "ASTI-MCT-2026-000231",
      "personId": "e3ef5d07-5d42-4ef1-9db6-632ad8e27e32",
      "sourceCorporateParticipantId": "d5f3f7a7-40e2-4ef5-983d-3b8cc4b01092"
    },
    "corporateLink": {
      "corporateParticipantId": "d5f3f7a7-40e2-4ef5-983d-3b8cc4b01092",
      "linkedStudentProfileId": "331b6076-1e36-4b91-b8e6-c96ef1f0d701"
    }
  }
}
```

### Error Response Catalog
| HTTP | App Error Code | Meaning |
|---|---|---|
| 404 | `ERR_CORP_PARTICIPANT_NOT_FOUND` | Corporate participant not found |
| 409 | `ERR_CORP_PARTICIPANT_ALREADY_LINKED` | Already linked to a student |
| 409 | `ERR_STU_DUPLICATE_BLOCKING_MATCH` | Blocking duplicate found |
| 422 | `ERR_STU_MISSING_CORPORATE_IDENTITY_DATA` | Required conversion data missing |

---

# 5.5 POST `/api/admin/student-management/students/lookup`

### Purpose
Quick branch-scoped lookup for selectors and drawers.

### Authentication & Required Permission
- Authenticated
- Required:
  - `student.read`

### Branch-Scoping Behavior
- same as list endpoint
- results capped at 25

### Request Payload Schema (Zod)
```ts
const studentLookupSchema = z.object({
  branchId: uuidSchema.optional(),
  consolidated: z.boolean().optional().default(false),
  globalSearch: z.string().trim().max(150).optional(),
  studentNumber: z.string().trim().max(50).optional(),
  primaryPhone: z.string().trim().max(15).optional(),
  primaryEmail: z.string().trim().max(254).optional()
});
```

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "331b6076-1e36-4b91-b8e6-c96ef1f0d701",
        "studentNumber": "ASTI-MCT-2026-000231",
        "fullName": {
          "en": "Ahmed Khalid",
          "ar": "أحمد خالد"
        },
        "primaryPhoneMasked": "+968****4567",
        "studentStatus": "Active",
        "branch": {
          "id": "9b38949b-4c2f-4cd5-9cb4-8c6dba679101",
          "name": "Muscat Branch"
        },
        "activeEnrollmentsCount": 2
      }
    ]
  }
}
```

### Error Response Catalog
- `400 ERR_STU_INVALID_LOOKUP_PAYLOAD`
- `403 ERR_AUTH_BRANCH_SCOPE_DENIED`
- `500 ERR_SYS_INTERNAL`

---

# 5.6 POST `/api/admin/student-management/students/duplicate-check`

### Purpose
Run duplicate screening before create or update.

### Authentication & Required Permission
- Authenticated
- Required:
  - `student.create` for pre-create screening, or
  - `student.update` for pre-update screening

### Branch-Scoping Behavior
- input branch checked if provided
- search may scan assigned branches; consolidated cross-branch scanning only if allowed

### Request Payload Schema (Zod)
```ts
const duplicateCheckSchema = z.object({
  currentStudentId: uuidSchema.optional(),
  branchId: uuidSchema.optional(),
  person: z.object({
    firstNameEnglish: englishNameSchema,
    middleNameEnglish: optionalEnglishNameSchema.optional(),
    lastNameEnglish: englishNameSchema,
    fullNameArabic: arabicNameSchema.optional(),
    dateOfBirth: dateSchema.optional(),
    nationalityCode: z.string().trim().min(2).max(10),
    civilId: civilIdSchema.optional(),
    passportNumber: passportSchema.optional(),
    visaNumber: visaSchema.optional(),
    primaryEmail: emailSchema.optional(),
    primaryPhone: phoneSchema.optional()
  })
});
```

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "result": "BlockingMatch",
    "riskLevel": "Blocking",
    "duplicateCase": {
      "id": "8d4f7b4d-5d77-4f8a-9f45-9ac13e799001",
      "caseNumber": "DUP-2026-00017",
      "caseStatus": "Open"
    },
    "candidates": [
      {
        "candidateStudentId": "331b6076-1e36-4b91-b8e6-c96ef1f0d701",
        "matchScore": 96.5,
        "matchReasons": [
          "primaryPhone exact match",
          "civilId exact match"
        ]
      }
    ]
  }
}
```

Possible `result` values:
- `NoMatch`
- `ReviewRequired`
- `BlockingMatch`
- `ExactStudentMatch`
- `ExactPersonMatchWithoutStudent`

### Error Response Catalog
- `400 ERR_STU_INVALID_DUPLICATE_CHECK_PAYLOAD`
- `403 ERR_AUTH_PERMISSION_DENIED`
- `403 ERR_AUTH_BRANCH_SCOPE_DENIED`
- `500 ERR_SYS_INTERNAL`

---

# 5.7 GET `/api/admin/student-management/students/{studentId}`

### Purpose
Read student detail overview.

### Authentication & Required Permission
- Required:
  - `student.read`

### Branch-Scoping Behavior
- target student must be in scope
- concealed as `404` when out of scope unless explicit denial policy configured

### Path Schema
```ts
const studentIdPathSchema = z.object({
  studentId: uuidSchema
});
```

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "id": "331b6076-1e36-4b91-b8e6-c96ef1f0d701",
    "studentNumber": "ASTI-MCT-2026-000231",
    "personId": "e3ef5d07-5d42-4ef1-9db6-632ad8e27e32",
    "fullName": {
      "en": "Ahmed Khalid",
      "ar": "أحمد خالد"
    },
    "gender": "Male",
    "dateOfBirthMasked": "1998-**-**",
    "nationalityCode": "OM",
    "primaryEmailMasked": "a***@example.com",
    "primaryPhoneMasked": "+968****4567",
    "branch": {
      "id": "9b38949b-4c2f-4cd5-9cb4-8c6dba679101",
      "code": "MCT",
      "name": "Muscat Branch"
    },
    "studentStatus": "Active",
    "joinedAt": "2026-06-01",
    "idCardIssued": true,
    "idCardNumberMasked": "ID-****-231",
    "duplicateReviewRequired": false,
    "creationSource": "ApprovedAdmission",
    "sourceAdmissionId": "f7ac38d5-6e79-4db3-a5a5-14d8c4f60211",
    "remarks": "Joined through approved admission",
    "isArchived": false,
    "version": 3,
    "summaryCounts": {
      "admissions": 1,
      "enrollments": 3,
      "activeEnrollments": 2,
      "documents": 4
    },
    "createdAt": "2026-06-01T09:10:13+04:00",
    "updatedAt": "2026-07-02T14:35:11+04:00"
  }
}
```

### Error Response Catalog
- `401 ERR_AUTH_UNAUTHENTICATED`
- `403 ERR_AUTH_PERMISSION_DENIED`
- `404 ERR_STU_NOT_FOUND`
- `500 ERR_SYS_INTERNAL`

---

# 5.8 PATCH `/api/admin/student-management/students/{studentId}`

### Purpose
Update editable student profile and person-linked fields within this module boundary.

### Authentication & Required Permission
- Required:
  - `student.update`

### Branch-Scoping Behavior
- target record must be writable in caller scope

### Request Payload Schema (Zod)
```ts
const updateStudentSchema = z.object({
  firstNameEnglish: englishNameSchema,
  middleNameEnglish: optionalEnglishNameSchema.optional(),
  lastNameEnglish: englishNameSchema,
  fullNameArabic: arabicNameSchema.optional().nullable(),
  gender: z.enum(["Male", "Female", "Other", "PreferNotToSay"]).optional().nullable(),
  dateOfBirth: dateSchema.optional().nullable(),
  nationalityCode: z.string().trim().min(2).max(10),
  civilId: civilIdSchema.optional().nullable(),
  passportNumber: passportSchema.optional().nullable(),
  visaNumber: visaSchema.optional().nullable(),
  primaryEmail: emailSchema.optional().nullable(),
  primaryPhone: phoneSchema,
  remarks: z.string().trim().max(1000).optional().nullable(),
  version: z.number().int().min(1)
}).superRefine((data, ctx) => {
  const hasIdentifier = !!(
    data.civilId || data.passportNumber || data.visaNumber || data.primaryEmail || data.primaryPhone
  );
  if (!hasIdentifier) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["civilId"],
      message: "At least one identifier/contact field is required"
    });
  }
});
```

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "331b6076-1e36-4b91-b8e6-c96ef1f0d701",
      "version": 4,
      "updatedAt": "2026-07-03T11:21:22+04:00"
    }
  }
}
```

### Error Response Catalog
| HTTP | App Error Code | Meaning |
|---|---|---|
| 404 | `ERR_STU_NOT_FOUND` | Student not found |
| 409 | `ERR_STU_CONCURRENT_MODIFICATION` | Version mismatch |
| 409 | `ERR_STU_DUPLICATE_BLOCKING_MATCH` | Duplicate check blocked update |
| 409 | `ERR_STU_IDENTITY_CONFLICT` | Unique identity collision |
| 422 | `ERR_STU_ARCHIVED_READ_ONLY` | Archived records cannot be updated |

---

# 5.9 POST `/api/admin/student-management/students/{studentId}/status`

### Purpose
Change student lifecycle status and insert status history.

### Authentication & Required Permission
- Required:
  - `student.status.change`

### Branch-Scoping Behavior
- target record must be writable in caller scope

### Request Payload Schema (Zod)
```ts
const changeStudentStatusSchema = z.object({
   targetStatus: z.enum(["Active", "Suspended", "Archived"]),
  effectiveStartDate: dateSchema,
  effectiveEndDate: dateSchema.optional(),
  reason: reason500Schema,
  notifyRelatedUsers: z.boolean().default(false),
  version: z.number().int().min(1)
}).superRefine((data, ctx) => {
  if (data.effectiveEndDate && data.effectiveEndDate < data.effectiveStartDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["effectiveEndDate"],
      message: "effectiveEndDate cannot be earlier than effectiveStartDate"
    });
  }
});
```

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "studentId": "331b6076-1e36-4b91-b8e6-c96ef1f0d701",
    "oldStatus": "Active",
    "newStatus": "Suspended",
    "historyId": "75d72f77-7d41-4d95-a8a5-0f43ddf5ec11",
    "effectiveStartDate": "2026-07-03"
  }
}
```

### Error Response Catalog
- `404 ERR_STU_NOT_FOUND`
- `409 ERR_STU_INVALID_STATUS_TRANSITION`
- `409 ERR_STU_CONCURRENT_MODIFICATION`
- `409 ERR_STU_ARCHIVE_BLOCKED_BY_POLICY`
- `422 ERR_STU_INVALID_EFFECTIVE_DATES`

---

# 5.10 POST `/api/admin/student-management/students/{studentId}/archive`

### Purpose
Archive student by soft delete semantics.

### Authentication & Required Permission
- Required:
  - `student.archive`

### Branch-Scoping Behavior
- target must be writable in caller scope

### Request Payload Schema (Zod)
```ts
const archiveStudentSchema = z.object({
  reason: reason500Schema,
  version: z.number().int().min(1)
});
```

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "studentId": "331b6076-1e36-4b91-b8e6-c96ef1f0d701",
    "studentStatus": "Archived",
    "isDeleted": true,
    "archivedAt": "2026-07-03T11:50:00+04:00"
  }
}
```

### Error Response Catalog
- `404 ERR_STU_NOT_FOUND`
- `409 ERR_STU_ALREADY_ARCHIVED`
- `409 ERR_STU_ARCHIVE_BLOCKED_BY_ACTIVE_ENROLLMENT_POLICY`
- `409 ERR_STU_CONCURRENT_MODIFICATION`

---

# 5.11 POST `/api/admin/student-management/students/{studentId}/restore`

### Purpose
Restore archived student.

### Authentication & Required Permission
- Required:
  - `student.restore`

### Branch-Scoping Behavior
- target must be writable in caller scope

### Request Payload Schema (Zod)
```ts
const restoreStudentSchema = z.object({
  restoreTargetStatus: z.enum(["Active", "Suspended"]),
  effectiveStartDate: dateSchema,
  reason: reason500Schema,
  version: z.number().int().min(1)
});
```

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "studentId": "331b6076-1e36-4b91-b8e6-c96ef1f0d701",
    "studentStatus": "Active",
    "restoredAt": "2026-07-03T12:05:00+04:00"
  }
}
```

### Error Response Catalog
- `404 ERR_STU_NOT_FOUND`
- `409 ERR_STU_NOT_ARCHIVED`
- `409 ERR_STU_CONCURRENT_MODIFICATION`
- `422 ERR_STU_INVALID_RESTORE_TARGET_STATUS`

---

# 5.12 POST `/api/admin/student-management/students/{studentId}/id-card`

### Purpose
Issue first ID card or correct current ID card state.

### Authentication & Required Permission
- Required:
  - `student.idcard.manage`

### Branch-Scoping Behavior
- target must be writable in caller scope

### Request Payload Schema (Zod)
```ts
const issueOrUpdateIdCardSchema = z.object({
  idCardIssued: z.boolean(),
  idCardNumber: z.string().trim().max(50).optional(),
  issueDate: dateSchema.optional(),
  issueRemarks: reason500Schema.optional(),
  version: z.number().int().min(1)
}).superRefine((data, ctx) => {
  if (data.idCardIssued && !data.idCardNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["idCardNumber"],
      message: "idCardNumber is required when idCardIssued is true"
    });
  }
});
```

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "studentId": "331b6076-1e36-4b91-b8e6-c96ef1f0d701",
    "idCardIssued": true,
    "idCardNumberMasked": "ID-****-231",
    "historyId": "d05d61d9-2f8d-4fdb-8f1b-4eb8b2f22711"
  }
}
```

### Error Response Catalog
- `404 ERR_STU_NOT_FOUND`
- `409 ERR_STU_ID_CARD_NUMBER_EXISTS`
- `409 ERR_STU_CONCURRENT_MODIFICATION`
- `422 ERR_STU_INVALID_ID_CARD_STATE`

---

# 5.13 POST `/api/admin/student-management/students/{studentId}/id-card/reissue`

### Purpose
Reissue an already-issued ID card and preserve history.

### Authentication & Required Permission
- Required:
  - `student.idcard.manage`

### Branch-Scoping Behavior
- target must be writable in caller scope

### Request Payload Schema (Zod)
```ts
const reissueIdCardSchema = z.object({
  newIdCardNumber: z.string().trim().min(1).max(50),
  reissueDate: dateSchema,
  reissueReason: reason500Schema,
  version: z.number().int().min(1)
});
```

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "studentId": "331b6076-1e36-4b91-b8e6-c96ef1f0d701",
    "oldIdCardNumberMasked": "ID-****-121",
    "newIdCardNumberMasked": "ID-****-231",
    "historyId": "d05d61d9-2f8d-4fdb-8f1b-4eb8b2f22711"
  }
}
```

### Error Response Catalog
- `404 ERR_STU_NOT_FOUND`
- `409 ERR_STU_ID_CARD_NOT_ISSUED`
- `409 ERR_STU_ID_CARD_NUMBER_EXISTS`
- `409 ERR_STU_CONCURRENT_MODIFICATION`
- `422 ERR_STU_INVALID_REISSUE_DATE`

---

# 5.14 GET `/api/admin/student-management/students/{studentId}/timeline`

### Purpose
Return chronological timeline of student module events.

### Authentication & Required Permission
- Required:
  - `student.read`

### Query Schema
```ts
const timelineQuerySchema = z.object({
  eventTypes: z.array(z.enum([
    "StudentCreated",
    "StudentUpdated",
    "StatusChanged",
    "IdCardIssued",
    "IdCardReissued",
    "DuplicateFlagged",
    "MergeCompleted",
    "Archived",
    "Restored"
  ])).optional(),
  dateFrom: dateSchema.optional(),
  dateTo: dateSchema.optional(),
  actorUserId: uuidSchema.optional()
});
```

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "eventType": "StatusChanged",
        "eventAt": "2026-07-03T12:05:00+04:00",
        "performedBy": {
          "id": "0e33d32e-8c4a-4e35-9466-c1fe0c67d931",
          "displayName": "Branch Admin"
        },
        "summary": "Student restored to Active",
        "details": {
          "oldStatus": "Archived",
          "newStatus": "Active"
        }
      }
    ]
  }
}
```

### Error Catalog
- `404 ERR_STU_NOT_FOUND`
- `422 ERR_STU_INVALID_DATE_RANGE`

---

# 5.15 GET `/api/admin/student-management/students/{studentId}/related-summary`

### Purpose
Read-only summary of admissions, enrollments, and documents linked to student.

### Authentication & Required Permission
- Required:
  - `student.read`

### Branch-Scoping Behavior
- student must be in scope
- downstream summaries filtered to allowed scope and downstream permissions

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "admissions": [
      {
        "id": "f7ac38d5-6e79-4db3-a5a5-14d8c4f60211",
        "admissionNumber": "ADM-2026-00455",
        "status": "Approved",
        "submittedAt": "2026-05-20T09:12:00+04:00"
      }
    ],
    "enrollments": [
      {
        "id": "f594dca0-5cbb-42f4-b628-90696a9cb641",
        "enrollmentNumber": "ENR-2026-00871",
        "courseName": {
          "en": "Safety Training",
          "ar": "تدريب السلامة"
        },
        "batchCode": "B-MCT-210",
        "enrollmentStatus": "Active",
        "completionStatus": "InProgress",
        "certificateStatus": "NotIssued"
      }
    ],
    "documents": [
      {
        "id": "09012ef8-a022-4d2a-b8f6-48de87e49311",
        "documentType": "Passport",
        "verificationStatus": "Approved",
        "expiryDate": "2028-10-20"
      }
    ]
  }
}
```

### Error Catalog
- `404 ERR_STU_NOT_FOUND`
- `403 ERR_AUTH_PERMISSION_DENIED`

---

# 5.16 GET `/api/admin/student-management/students/{studentId}/audit`

### Purpose
View module-specific and central audit history for a student.

### Authentication & Required Permission
- Required:
  - `student.audit.read`
  - or `audit.read`

### Branch-Scoping Behavior
- read only within caller’s allowed branch scope
- concealed as `404` where required

### Query Schema
```ts
const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  actionTypes: z.array(z.string().trim().max(50)).optional(),
  performedBy: uuidSchema.optional(),
  dateFrom: dateSchema.optional(),
  dateTo: dateSchema.optional()
});
```

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "auditId": "dd5a0b08-ec0b-47d0-8fe6-4adcaee3e0a5",
        "eventAt": "2026-07-03T12:05:00+04:00",
        "action": "student.restore",
        "performedBy": {
          "id": "0e33d32e-8c4a-4e35-9466-c1fe0c67d931",
          "displayName": "Branch Admin"
        },
        "reason": "Validated original archival was accidental",
        "changeSummary": {
          "studentStatus": {
            "old": "Archived",
            "new": "Active"
          }
        }
      }
    ],
    "page": 1,
    "pageSize": 25,
    "totalItems": 8,
    "totalPages": 1
  }
}
```

### Error Catalog
- `403 ERR_AUTH_PERMISSION_DENIED`
- `404 ERR_STU_NOT_FOUND`
- `500 ERR_SYS_INTERNAL`

---

# 5.17 GET `/api/admin/student-management/duplicate-cases`

### Purpose
List duplicate cases.

### Authentication & Required Permission
- Required:
  - `student.duplicate.read`
  - `menu.studentManagement.duplicateWorkbench`

### Branch-Scoping Behavior
- branch-scoped list
- consolidated optional when allowed

### Query Schema
```ts
const listDuplicateCasesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  branchId: uuidSchema.optional(),
  consolidated: z.coerce.boolean().default(false),
  caseStatus: z.array(z.enum(["Open", "UnderReview", "Merged", "ResolvedNoDuplicate", "Cancelled"])).optional(),
  riskLevel: z.array(z.enum(["Low", "Medium", "High", "Blocking"])).optional(),
  sourceType: z.array(z.enum(["Create", "Update", "BatchScan", "ManualReview", "CorporateConversion"])).optional(),
  createdFrom: dateSchema.optional(),
  createdTo: dateSchema.optional(),
  sortBy: z.enum(["createdAt", "riskLevel", "caseNumber"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});
```

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "8d4f7b4d-5d77-4f8a-9f45-9ac13e799001",
        "caseNumber": "DUP-2026-00017",
        "branch": {
          "id": "9b38949b-4c2f-4cd5-9cb4-8c6dba679101",
          "name": "Muscat Branch"
        },
        "sourceType": "Create",
        "caseStatus": "Open",
        "riskLevel": "Blocking",
        "triggerSummary": "Civil ID and primary phone exact match",
        "createdAt": "2026-07-03T09:20:00+04:00"
      }
    ],
    "page": 1,
    "pageSize": 25,
    "totalItems": 4,
    "totalPages": 1
  }
}
```

### Error Catalog
- `403 ERR_AUTH_PERMISSION_DENIED`
- `403 ERR_AUTH_BRANCH_SCOPE_DENIED`
- `500 ERR_SYS_INTERNAL`

---

# 5.18 GET `/api/admin/student-management/duplicate-cases/{caseId}`

### Purpose
Read duplicate case detail including candidate items.

### Authentication & Required Permission
- Required:
  - `student.duplicate.read`

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "id": "8d4f7b4d-5d77-4f8a-9f45-9ac13e799001",
    "caseNumber": "DUP-2026-00017",
    "caseStatus": "Open",
    "riskLevel": "Blocking",
    "triggerSummary": "Civil ID and primary phone exact match",
    "items": [
      {
        "id": "be9c36a9-f403-4cd7-b1fa-e5a57637c4bf",
        "candidateStudentProfileId": "331b6076-1e36-4b91-b8e6-c96ef1f0d701",
        "candidatePersonId": "e3ef5d07-5d42-4ef1-9db6-632ad8e27e32",
        "candidateBranchId": "9b38949b-4c2f-4cd5-9cb4-8c6dba679101",
        "matchScore": 96.5,
        "matchReasons": [
          "civilId exact match",
          "primaryPhone exact match"
        ],
        "isPrimaryCandidate": true
      }
    ]
  }
}
```

### Error Catalog
- `404 ERR_STU_DUPLICATE_CASE_NOT_FOUND`
- `403 ERR_AUTH_PERMISSION_DENIED`

---

# 5.19 POST `/api/admin/student-management/duplicate-cases/{caseId}/resolve`

### Purpose
Resolve duplicate case without merge, such as keep existing, create new with exception, or mark not duplicate.

### Authentication & Required Permission
- Required:
  - `student.duplicate.resolve`

### Request Payload Schema (Zod)
```ts
const resolveDuplicateCaseSchema = z.object({
  resolutionType: z.enum(["KeepExisting", "CreateNew", "NotDuplicate", "Cancelled"]),
  resolutionReason: reason1000Schema,
  chosenCandidateStudentId: uuidSchema.optional()
}).superRefine((data, ctx) => {
  if (data.resolutionType === "KeepExisting" && !data.chosenCandidateStudentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["chosenCandidateStudentId"],
      message: "chosenCandidateStudentId is required for KeepExisting"
    });
  }
});
```

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "caseId": "8d4f7b4d-5d77-4f8a-9f45-9ac13e799001",
    "caseStatus": "ResolvedNoDuplicate",
    "resolutionType": "NotDuplicate",
    "resolvedAt": "2026-07-03T13:10:00+04:00"
  }
}
```

### Error Catalog
- `404 ERR_STU_DUPLICATE_CASE_NOT_FOUND`
- `409 ERR_STU_DUPLICATE_CASE_ALREADY_RESOLVED`
- `422 ERR_STU_INVALID_DUPLICATE_RESOLUTION`

---

# 5.20 POST `/api/admin/student-management/merge`

### Purpose
Merge duplicate student profiles.

### Authentication & Required Permission
- Required:
  - `student.merge`
  - `student.duplicate.resolve`

### Branch-Scoping Behavior
- both source and survivor students must be readable and mutable in caller scope
- cross-branch merge allowed only for consolidated role with explicit permission

### Request Payload Schema (Zod)
```ts
const mergeStudentsSchema = z.object({
  duplicateCaseId: uuidSchema.optional(),
  survivorStudentId: uuidSchema,
  sourceStudentId: uuidSchema,
  mergeReason: reason1000Schema,
  fieldResolution: z.object({
    firstNameEnglish: z.enum(["survivor", "source"]).optional(),
    middleNameEnglish: z.enum(["survivor", "source"]).optional(),
    lastNameEnglish: z.enum(["survivor", "source"]).optional(),
    fullNameArabic: z.enum(["survivor", "source"]).optional(),
    gender: z.enum(["survivor", "source"]).optional(),
    dateOfBirth: z.enum(["survivor", "source"]).optional(),
    nationalityCode: z.enum(["survivor", "source"]).optional(),
    civilId: z.enum(["survivor", "source"]).optional(),
    passportNumber: z.enum(["survivor", "source"]).optional(),
    visaNumber: z.enum(["survivor", "source"]).optional(),
    primaryEmail: z.enum(["survivor", "source"]).optional(),
    primaryPhone: z.enum(["survivor", "source"]).optional(),
    remarks: z.enum(["survivor", "source"]).optional()
  }),
  confirmationText: z.string().trim().min(1)
}).superRefine((data, ctx) => {
  if (data.survivorStudentId === data.sourceStudentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sourceStudentId"],
      message: "sourceStudentId must differ from survivorStudentId"
    });
  }
});
```

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "mergeLogId": "2e17192d-c265-4051-8771-42a7ae17e5b7",
    "survivorStudentId": "331b6076-1e36-4b91-b8e6-c96ef1f0d701",
    "sourceStudentId": "2827ed75-7a9a-4f40-90db-eaa42cc9820b",
    "sourceArchived": true,
    "reassignedCounts": {
      "admissions": 1,
      "enrollments": 3,
      "documents": 2,
      "otherRefs": 0
    }
  }
}
```

### Error Response Catalog
| HTTP | App Error Code | Meaning |
|---|---|---|
| 404 | `ERR_STU_NOT_FOUND` | One or both students not found |
| 409 | `ERR_STU_MERGE_SELF_FORBIDDEN` | Same source and survivor |
| 409 | `ERR_STU_MERGE_SCOPE_DENIED` | Cross-branch merge not allowed |
| 409 | `ERR_STU_MERGE_ALREADY_COMPLETED_FOR_SOURCE` | Source already merged previously |
| 409 | `ERR_STU_CONCURRENT_MODIFICATION` | Source or survivor changed before merge commit |
| 422 | `ERR_STU_INVALID_MERGE_PAYLOAD` | Confirmation or field resolution invalid |
| 500 | `ERR_STU_MERGE_TRANSACTION_FAILED` | Merge transaction failed |

---

# 5.21 POST `/api/admin/student-management/exports`

### Purpose
Export filtered student data and create export audit log.

### Authentication & Required Permission
- Required:
  - `student.export`
  - `report.studentMaster` or `menu.studentManagement.export`

### Branch-Scoping Behavior
- filter branch scope enforced server-side
- export cannot exceed caller’s readable branches
- when identity-sensitive fields included, additional permission required:
  - `student.identity.unmasked.read` (internal extended permission)

### Request Payload Schema (Zod)
```ts
const exportStudentsSchema = z.object({
  branchId: uuidSchema.optional(),
  consolidated: z.boolean().default(false),
  exportScope: exportScopeEnum,
  format: exportFormatEnum,
  includeMaskedIdentity: z.boolean().default(false),
  selectedStudentIds: z.array(uuidSchema).max(1000).optional(),
  filters: z.object({
    globalSearch: z.string().trim().max(150).optional(),
    studentStatus: z.array(statusEnum).optional(),
    isArchived: z.enum(["All", "ActiveOnly", "ArchivedOnly"]).optional()
  }).default({}),
  reason: z.string().trim().min(10).max(500).optional()
}).superRefine((data, ctx) => {
  if (data.includeMaskedIdentity && !data.reason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["reason"],
      message: "reason is required when includeMaskedIdentity is true"
    });
  }
  if (data.exportScope === "SelectedRows" && (!data.selectedStudentIds || data.selectedStudentIds.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["selectedStudentIds"],
      message: "selectedStudentIds are required for SelectedRows"
    });
  }
});
```

### Success Response DTO
Immediate:
```json
{
  "success": true,
  "data": {
    "exportLogId": "9e4c77ba-467d-4d3c-a37c-28cda403fd82",
    "exportStatus": "Completed",
    "rowCount": 125,
    "downloadUrl": "https://signed.example.com/exports/9e4c77ba.csv"
  }
}
```

Queued large export:
```json
{
  "success": true,
  "data": {
    "exportLogId": "9e4c77ba-467d-4d3c-a37c-28cda403fd82",
    "exportStatus": "Queued",
    "rowCount": 12054
  }
}
```

### Error Response Catalog
- `403 ERR_AUTH_PERMISSION_DENIED`
- `403 ERR_AUTH_BRANCH_SCOPE_DENIED`
- `403 ERR_STU_UNMASKED_IDENTITY_PERMISSION_REQUIRED`
- `422 ERR_STU_INVALID_EXPORT_REQUEST`
- `422 ERR_STU_EXPORT_ROW_LIMIT_EXCEEDED`
- `500 ERR_STU_EXPORT_FAILED`

---

# 5.22 GET `/api/admin/student-management/exports/{exportLogId}`

### Purpose
Read export job/result metadata.

### Authentication & Required Permission
- Required:
  - `student.export`

### Branch-Scoping Behavior
- caller can only read logs for branches they are entitled to

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "exportLogId": "9e4c77ba-467d-4d3c-a37c-28cda403fd82",
    "branchId": "9b38949b-4c2f-4cd5-9cb4-8c6dba679101",
    "requestedBy": "0e33d32e-8c4a-4e35-9466-c1fe0c67d931",
    "exportScope": "AllFiltered",
    "format": "CSV",
    "rowCount": 125,
    "includedMaskedIdentity": false,
    "exportStatus": "Completed",
    "exportedAt": "2026-07-03T13:50:00+04:00",
    "downloadUrl": "https://signed.example.com/exports/9e4c77ba.csv"
  }
}
```

### Error Catalog
- `404 ERR_STU_EXPORT_LOG_NOT_FOUND`
- `403 ERR_AUTH_PERMISSION_DENIED`

---

# 5.23 GET `/api/student-portal/student-management/me/profile`

### Purpose
Read-only student self profile.

### Authentication & Required Permission
- Authenticated portal user
- Required:
  - `student.portal.self.read`

### Branch-Scoping Behavior
- not branch-browsable
- resolved only through authenticated portal account’s linked student profile

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "studentId": "331b6076-1e36-4b91-b8e6-c96ef1f0d701",
    "studentNumber": "ASTI-MCT-2026-000231",
    "fullName": {
      "en": "Ahmed Khalid",
      "ar": "أحمد خالد"
    },
    "nationalityCode": "OM",
        "primaryEmailMasked": "a***@example.com",
        "primaryPhoneMasked": "+968****4567",
    "joinedAt": "2026-06-01",
    "idCardIssued": true,
    "studentStatus": "Active"
  }
}
```

### Error Catalog
- `404 ERR_STU_PORTAL_PROFILE_NOT_LINKED`
- `403 ERR_AUTH_PERMISSION_DENIED`

---

# 5.24 GET `/api/student-portal/student-management/me/related-summary`

### Purpose
Student self-view of admissions/enrollments/documents summary.

### Authentication & Required Permission
- Required:
  - `student.portal.self.read`

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "admissions": [],
    "enrollments": [],
    "documents": []
  }
}
```

### Error Catalog
- `404 ERR_STU_PORTAL_PROFILE_NOT_LINKED`
- `500 ERR_SYS_INTERNAL`

---

# 5.25 GET `/api/trainer-portal/batches/{batchId}/students/{studentId}/quick-view`

### Purpose
Provide trainer with read-only quick-view of student in roster context.

### Authentication & Required Permission
- Required:
  - `student.trainer.roster.read`

### Branch-Scoping Behavior
- trainer must be assigned to the batch or authorized via training-delivery permission
- student must belong to the requested batch roster context

### Success Response DTO
```json
{
  "success": true,
  "data": {
    "studentId": "331b6076-1e36-4b91-b8e6-c96ef1f0d701",
    "studentNumber": "ASTI-MCT-2026-000231",
    "fullName": {
      "en": "Ahmed Khalid",
      "ar": "أحمد خالد"
    },
        "primaryPhoneMasked": "+968****4567",
    "nationalityCode": "OM",
    "studentStatus": "Active",
    "identityAlerts": [
      "DuplicateReviewPending"
    ],
    "enrollmentContext": {
      "batchId": "d8a2fa5d-df6b-4ad5-9833-bf607dfec0e9",
      "enrollmentStatus": "Active"
    }
  }
}
```

### Error Catalog
- `403 ERR_AUTH_PERMISSION_DENIED`
- `404 ERR_TRN_BATCH_OR_STUDENT_NOT_FOUND_IN_CONTEXT`

### 5.22 Global Preflight Lookup
* **Route:** `/api/v1/students/preflight-lookup`
* **Method:** `POST`
* **Purpose:** Runs a cross-branch search on identity keys before displaying the registration form to detect duplicates and enable cross-branch enrollment.
* **Authentication & Required Permission:** `student.create`
* **Branch-Scoping Behavior:** Bypasses branch-scoping limitations to perform a global look-up. Returns a masked summary if a duplicate profile exists in another branch, protecting student PII.
* **Request Payload Schema (Zod):**
```typescript
const preflightLookupSchema = z.object({
  civilId: z.string().trim().min(3).optional(),
  passportNumber: z.string().trim().min(3).optional(),
  email: z.string().email().optional(),
  mobile: z.string().trim().min(5).optional(),
}).refine(data => data.civilId || data.passportNumber || data.email || data.mobile, {
  message: "At least one lookup key (civilId, passportNumber, email, or mobile) must be provided.",
  path: ["civilId"],
});
```
* **Success Response DTO:**
```json
{
  "success": true,
  "data": {
    "personFound": true,
    "personId": "e30dcd1e-a4b5-4b08-9df2-bb53a5c18e10",
    "firstNameMasked": "F****a",
    "lastNameMasked": "Al-S***d",
    "maskedMobile": "+968****7890",
    "maskedEmail": "f*****a@domain.com",
    "studentProfileId": "77ae0e01-d890-482a-a92c-63b123910c0e",
    "studentNumber": "STU-2026-00412",
    "hasAdmissionInActiveBranch": false,
    "activeBranches": ["Sohar Branch (SHR)"]
  }
}
```
* **Error Catalog:**
- `400 ERR_VAL_FAILED`
- `500 ERR_STUDENT_INTERNAL_ERROR`

### 5.23 Request Profile Verification OTP
* **Route:** `/api/v1/students/request-profile-otp`
* **Method:** `POST`
* **Purpose:** Sends a verification code via SMS/Email to authorize profile linkage/transfer to the requesting branch.
* **Authentication & Required Permission:** `student.create`
* **Branch-Scoping Behavior:** Scoped to the target student profile context.
* **Request Payload Schema (Zod):**
```typescript
const requestOtpSchema = z.object({
  personId: z.string().uuid(),
  channel: z.enum(["SMS", "Email", "Both"]).default("Both"),
});
```
* **Success Response DTO:**
```json
{
  "success": true,
  "data": {
    "message": "OTP verification code sent successfully.",
    "expiresInSeconds": 300
  }
}
```
* **Error Catalog:**
- `400 ERR_VAL_FAILED`
- `404 ERR_STU_NOT_FOUND`

### 5.24 Claim Profile (Register in Requesting Branch)
* **Route:** `/api/v1/students/claim-profile`
* **Method:** `POST`
* **Purpose:** Links an existing student profile in another branch to the requesting branch. It creates a new `Admission` record in the target branch, which dynamically authorizes the local staff to view the student profile.
* **Authentication & Required Permission:** `student.create`
* **Branch-Scoping Behavior:** The counselor must have branch access to the `branchId` they are registering the student in.
* **Request Payload Schema (Zod):**
```typescript
const claimProfileSchema = z.object({
  personId: z.string().uuid(),
  otp: z.string().min(6).max(6),
  branchId: z.string().uuid(),
  courseId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
});
```
* **Success Response DTO:**
```json
{
  "success": true,
  "data": {
    "admissionId": "23a8bc98-5cfa-4eb0-bb2a-e99acbc10b90",
    "admissionNumber": "ADM-2026-0158",
    "studentProfileId": "77ae0e01-d890-482a-a92c-63b123910c0e",
    "message": "Student profile successfully linked to Branch."
  }
}
```
* **Error Catalog:**
- `400 ERR_VAL_FAILED`
- `409 ERR_STU_OTP_INVALID`
- `409 ERR_STU_ALREADY_LINKED`

---

## 6. Internal Server Actions

These server actions are not exposed as public HTTP endpoints but are part of the module boundary.

| Server Action | Purpose | Invokers |
|---|---|---|
| `createStudentFromAdmissionAction` | Used by Admission module UI and workflow | Admission UI, internal orchestration |
| `createStudentFromCorporateParticipantAction` | Used by Corporate Training workflow | Corporate module UI |
| `duplicateScreeningAction` | Shared duplicate check | Student create/update forms |
| `mergeStudentsAction` | Performs transactional merge orchestration | Duplicate workbench |
| `exportStudentsAction` | Creates export logs and file payload | Admin export dialog |
| `getStudentLookupAction` | Fast selector lookup | Enrollment, Finance, Walk-In flows |

Each server action uses the same Zod schemas and permission checks as its equivalent route handler.

---

## 7. Common Error Code Set for Module 5 APIs

| Code | Default HTTP | Meaning |
|---|---:|---|
| `ERR_STU_NOT_FOUND` | 404 | Student profile not found |
| `ERR_STU_INVALID_PAYLOAD` | 400 | Invalid request body |
| `ERR_STU_INVALID_QUERY` | 400 | Invalid query string |
| `ERR_STU_DUPLICATE_BLOCKING_MATCH` | 409 | Duplicate match blocks action |
| `ERR_STU_PERSON_ALREADY_HAS_PROFILE` | 409 | Person already linked to student profile |
| `ERR_STU_IDENTITY_CONFLICT` | 409 | Identity/contact collision |
| `ERR_STU_ID_CARD_NUMBER_EXISTS` | 409 | ID card number already used |
| `ERR_STU_INVALID_STATUS_TRANSITION` | 409 | Disallowed status change |
| `ERR_STU_ARCHIVE_BLOCKED_BY_POLICY` | 409 | Archive not allowed under business policy |
| `ERR_STU_NOT_ARCHIVED` | 409 | Restore attempted on non-archived record |
| `ERR_STU_ALREADY_ARCHIVED` | 409 | Archive attempted on already archived record |
| `ERR_STU_CONCURRENT_MODIFICATION` | 409 | Optimistic locking/version mismatch |
| `ERR_STU_INVALID_EFFECTIVE_DATES` | 422 | Invalid effective date range |
| `ERR_STU_INVALID_DOB` | 422 | Invalid date of birth |
| `ERR_STU_INVALID_JOINED_AT` | 422 | Invalid joined date |
| `ERR_STU_INVALID_EXPORT_REQUEST` | 422 | Invalid export configuration |
| `ERR_STU_EXPORT_FAILED` | 500 | Export processing failed |
| `ERR_STU_DUPLICATE_CASE_NOT_FOUND` | 404 | Duplicate case not found |
| `ERR_STU_DUPLICATE_CASE_ALREADY_RESOLVED` | 409 | Duplicate case already resolved |
| `ERR_STU_INVALID_DUPLICATE_RESOLUTION` | 422 | Resolution payload invalid |
| `ERR_STU_MERGE_TRANSACTION_FAILED` | 500 | Merge execution failed |
| `ERR_STU_MERGE_SCOPE_DENIED` | 409 | Merge not allowed across scope |
| `ERR_STU_MERGE_SELF_FORBIDDEN` | 409 | Same record used as source and survivor |
| `ERR_STU_UNMASKED_IDENTITY_PERMISSION_REQUIRED` | 403 | Sensitive export requested without permission |
| `ERR_STU_PORTAL_PROFILE_NOT_LINKED` | 404 | Student portal account not linked to profile |

---

## 8. Security Notes

1. No endpoint returns unmasked Civil ID, passport number, visa number, or full current ID card number unless a dedicated permission is granted.
2. Every write endpoint must emit central audit events including:
   - actor,
   - branch context,
   - entity id,
   - action,
   - old/new values,
   - reason where applicable.
3. Rate limiting is recommended for duplicate-check and lookup endpoints.
4. Merge and export endpoints require stricter audit review because they affect privacy and data lineage.
