# Detailed API Contract Specification

## Module 11: Corporate Training APIs

**Version:** 1.0  
**Base URL:** `/api/v1`  
**Module Code:** `COR`  
**Owning Bounded Context:** Corporate Training Management

---

# 1. Module Purpose

Corporate Training APIs manage B2B accounts, contacts, contracts, programs, participants, credit validation, and corporate enrollment orchestration.

Corporate Training does not own the learner lifecycle. Participant enrollment must call Admission & Enrollment application services and Finance application services where billing or credit exposure is involved.

---

# 2. Security Requirements

All APIs require authentication and server-side authorization.

Required controls:

| Control | Requirement |
| --- | --- |
| Permission | Explicit corporate permission per action |
| Branch scope | User must have access to the account/program branch |
| Data scope | Corporate coordinator access may be limited to assigned accounts |
| Audit | Mutations, credit checks, imports, and enrollments are audit logged |

---

# 3. Corporate Account APIs

## 3.1 List Corporate Accounts

```http
GET /api/v1/corporate/accounts
```

**Application service:** `listCorporateAccounts`  
**Permission:** `CORPORATE_ACCOUNT_VIEW`  
**Branch scope:** Filter to authorized branches unless cross-branch permission exists.

Query parameters:

```text
page
limit
search
branchId
status
creditStatus
```

## 3.2 Create Corporate Account

```http
POST /api/v1/corporate/accounts
```

**Application service:** `createCorporateAccount`  
**Permission:** `CORPORATE_ACCOUNT_CREATE`  
**Branch scope:** `branchId` must be inside the user's allowed branches.

Request DTO:

```json
{
  "branchId": "br_001",
  "legalName": { "en": "ABC Oil & Gas LLC", "ar": "" },
  "primaryEmail": "training@example.com",
  "primaryPhone": "+96890000000",
  "creditLimit": { "amount": "5000.000", "currency": "OMR" },
  "status": "Active"
}
```

Validation failures:

| Code | HTTP | Meaning |
| --- | --- | --- |
| `INVALID_BRANCH_SCOPE` | 403 | User cannot create accounts for the branch |
| `CORPORATE_NAME_REQUIRED` | 400 | English legal name is missing |
| `INVALID_CREDIT_LIMIT` | 400 | Credit limit is negative or invalid currency |

Audit event: `CorporateAccountCreated`

---

# 4. Corporate Program APIs

## 4.1 Create Corporate Program

```http
POST /api/v1/corporate/programs
```

**Application service:** `createCorporateProgram`  
**Permission:** `CORPORATE_PROGRAM_CREATE`  
**Branch scope:** Program branch must be allowed for the user and account.

Request DTO:

```json
{
  "corporateAccountId": "corp_001",
  "contractId": "contract_001",
  "branchId": "br_001",
  "courseId": "course_001",
  "programName": { "en": "HSE Safety Cohort", "ar": "" },
  "estimatedParticipantCount": 25,
  "estimatedProgramValue": { "amount": "2500.000", "currency": "OMR" },
  "startDate": "2026-08-01",
  "endDate": "2026-08-30"
}
```

Domain errors:

| Code | HTTP | Meaning |
| --- | --- | --- |
| `CORPORATE_ACCOUNT_INACTIVE` | 409 | Account cannot sponsor new programs |
| `CONTRACT_NOT_EFFECTIVE` | 409 | Contract is outside effective date range |
| `CREDIT_LIMIT_EXCEEDED` | 409 | Program value exceeds available credit |

Audit event: `CorporateProgramCreated`

## 4.2 Validate Corporate Credit

```http
POST /api/v1/corporate/programs/{programId}/validate-credit
```

**Application service:** `validateCorporateProgramCredit`  
**Permission:** `CORPORATE_CREDIT_VALIDATE`

Response DTO:

```json
{
  "success": true,
  "data": {
    "corporateAccountId": "corp_001",
    "creditLimit": { "amount": "5000.000", "currency": "OMR" },
    "unpaidBalance": { "amount": "1000.000", "currency": "OMR" },
    "committedUninvoicedValue": { "amount": "1500.000", "currency": "OMR" },
    "availableCredit": { "amount": "2500.000", "currency": "OMR" },
    "estimatedEnrollmentCost": { "amount": "2000.000", "currency": "OMR" },
    "decision": "Approved"
  }
}
```

If `decision` is `Rejected`, the response must include `CREDIT_LIMIT_EXCEEDED` with available credit and estimated cost.

Audit event: `CorporateCreditValidated`

---

# 5. Corporate Participant APIs

## 5.1 Import Participants

```http
POST /api/v1/corporate/participants/import
```

**Application service:** `importCorporateParticipants`  
**Permission:** `CORPORATE_PARTICIPANT_IMPORT`

Validation failures must identify row number, field name, and stable error code. Import does not create Enrollment records unless explicitly requested by a separate enrollment command.

## 5.2 Enroll Corporate Participant

```http
POST /api/v1/corporate/participants/{participantId}/enroll
```

**Application service:** `enrollCorporateParticipant`  
**Permission:** `CORPORATE_PARTICIPANT_ENROLL`  
**Calls:** Admission & Enrollment application service after corporate credit validation.

Domain errors:

| Code | HTTP | Meaning |
| --- | --- | --- |
| `PARTICIPANT_NOT_FOUND` | 404 | Participant does not exist in authorized branch/account |
| `CREDIT_LIMIT_EXCEEDED` | 409 | Credit invariant failed |
| `COURSE_NOT_OPEN_FOR_CORPORATE` | 409 | Course does not allow corporate enrollment |
| `BATCH_CAPACITY_EXCEEDED` | 409 | Batch has insufficient seats |

Audit event: `CorporateParticipantEnrollmentRequested`

Domain event: `CorporateParticipantRegistered`

---

# 6. Integration Points

| Context | Integration |
| --- | --- |
| Admission & Enrollment | Creates and confirms Enrollment through application service |
| Fee & Finance | Provides credit exposure and corporate invoice state |
| Course & Batch | Validates course and batch availability |
| Documents | Stores corporate account and participant documents |
| Audit & Compliance | Records credit checks, imports, enrollments, and approval overrides |
