# Functional Requirement Document (Part 7)
## Module 04: Admission & Enrollment Management - Validations, Errors, & Notifications

---

## 1. Validation Rules

| Rule ID | Rule | Location | Error Code |
| --- | --- | --- | --- |
| VAL-ADM-001 | Person must be at least 12 years old on admission date | Domain service | `ERR_ADM_AGE_LIMIT` |
| VAL-ADM-002 | Student profile must link to exactly one non-deleted Person | Domain service / DB constraint | `ERR_ADM_DUPLICATE_PERSON` |
| VAL-ADM-003 | Admission must be in a valid lifecycle state for submit/approve/reject/cancel | Domain service | `ERR_ADM_INVALID_STATE` |
| VAL-ADM-004 | Mandatory identity document verification must succeed before admission approval | Document Management integration | `ERR_DOC_VERIFICATION_FAILED` |
| VAL-ENR-001 | Enrollment must link to approved admission, course, batch, and branch | Domain service | `ERR_ENR_MISSING_ADMISSION` |
| VAL-ENR-002 | Course and batch must be active | Cross-context query | `ERR_ENR_INACTIVE_COURSE` |
| VAL-ENR-003 | Batch capacity must not be exceeded unless override is granted | Cross-context query | `ERR_ENR_BATCH_FULL` |
| VAL-ENR-004 | Corporate credit limit must be validated when enrollment type is Corporate | Cross-context query | `ERR_ENR_CREDIT_EXCEEDED` |
| VAL-ENR-005 | Enrollment cannot confirm without payment clearance when required | Finance event handler | `ERR_ENR_PAYMENT_INCOMPLETE` |
| VAL-ENR-006 | Enrollment cannot transition to an invalid state | Domain service | `ERR_ENR_INVALID_STATE` |
| VAL-BRN-001 | Read/write actions must stay within authenticated branch scope | API / application service | `ERR_AUTH_BRANCH_DENIED` |

---

## 2. Error Catalog

| Error Code | HTTP Status | Message |
| --- | --- | --- |
| `ERR_ADM_DUPLICATE_PERSON` | 409 | A student profile already exists for the matched person. |
| `ERR_ADM_AGE_LIMIT` | 400 | Learner must be at least 12 years old. |
| `ERR_ADM_INVALID_STATE` | 400 | Admission is not in a valid state for this operation. |
| `ERR_DOC_VERIFICATION_FAILED` | 422 | Mandatory identity document verification failed. |
| `ERR_ENR_MISSING_ADMISSION` | 400 | Approved admission, course, and batch are required. |
| `ERR_ENR_INACTIVE_COURSE` | 400 | Selected course or batch is inactive. |
| `ERR_ENR_BATCH_FULL` | 422 | The selected batch is full. |
| `ERR_ENR_CREDIT_EXCEEDED` | 422 | Corporate credit limit has been exceeded. |
| `ERR_ENR_PAYMENT_INCOMPLETE` | 422 | Payment clearance is required before confirmation. |
| `ERR_ENR_INVALID_STATE` | 400 | Enrollment is not in a valid state for this operation. |
| `ERR_AUTH_BRANCH_DENIED` | 403 | You are not authorized to access this branch. |

---

## 3. Notifications

| Event | Channel | Purpose |
| --- | --- | --- |
| `AdmissionCreated` | Internal / outbox | Downstream audit and lead tracking |
| Admission approval completed | Email / SMS | Notify student that the admission approval application succeeded and the ID card is being generated. This is a notification trigger, not a new domain event. |
| `EnrollmentApproved` | Outbox | Request invoice generation in Finance |
| `ReceiptGenerated` | Internal event | Confirm enrollment and update projections |
| `EnrollmentConfirmed` | Email / SMS / WhatsApp | Confirm enrollment and communicate schedule details |
| `StudentAddedToWaitingList` | SMS / WhatsApp | Notify user that batch capacity is full |
