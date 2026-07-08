# Part 10 - Security Architecture and NFR

## Module 09 - Faculty / Trainer Management

## 1. Purpose

This document defines the security architecture, non-functional requirements, and control expectations for Module 09. It complements the functional, UI, API, validation, reporting, and BDD specifications for trainer master data.

Module 09 is a branch-scoped, permission-based bounded context. It must not expose compensation, identity, or audit details beyond the caller's explicit permissions and branch scope.

---

## 2. Security Principles

1. Authenticate every request.
2. Authorize by permission code, not role name.
3. Derive branch scope server-side from IAM context.
4. Never trust client-supplied `branchId` as an access-expanding input.
5. Redact compensation data unless `trainer.compensation.read` is granted.
6. Keep Person-owned identity fields out of TrainerProfile writes.
7. Exclude soft-deleted rows from normal reads, eligibility checks, and rate resolution.
8. Use scope-safe 403 or 404 responses for out-of-scope objects.
9. Record audit evidence for sensitive trainer actions.
10. Do not send Email, SMS, or WhatsApp directly from Module 09.

---

## 3. Threat Controls

| Threat                      | Control                                                                       | Module 09 Enforcement                                            |
| --------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| IDOR / direct object access | Server-side branch scope + entity reload by id and scope                      | All routes and services                                          |
| Cross-branch exposure       | Intersect requested branch with effective branch scope                        | List, detail, report, export, mutation                           |
| Compensation leakage        | Separate `trainer.compensation.read` and `trainer.compensation.manage` checks | Detail, report, export, notification payloads                    |
| Mass assignment             | Strict Zod schemas and field ownership validation                             | Create/update endpoints                                          |
| Stale writes                | Optimistic concurrency version checks                                         | Mutable records                                                  |
| Soft-delete bypass          | Repository default filters exclude deleted rows                               | All normal queries                                               |
| Audit bypass                | Sensitive writes emit audit entries in the same transaction                   | Status, qualification, availability, authorization, compensation |
| CSV injection               | Sanitize export values and prefix dangerous formulas                          | CSV exports                                                      |
| Sensitive logging           | Do not log protected fields or raw payloads                                   | Route handlers, services, workers                                |
| Notification misuse         | Communication context owns delivery and retry                                 | All events and templates                                         |

---

## 4. Non-Functional Requirements

| NFR                               | Target                                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Trainer list queries              | p95 within 500 ms under normal operating load, excluding network latency                                          |
| Trainer eligibility validation    | p95 within 300 ms for a single trainer/course/branch/time request                                                 |
| Standard create/update operations | p95 within 700 ms, excluding external document-storage latency                                                    |
| Report freshness                  | Report and dashboard data should reflect source changes within the freshness window defined in the reporting part |
| Branch isolation                  | No cross-branch read or write is allowed without explicit permission and branch visibility                        |
| Compensation confidentiality      | No compensation amount or rate detail is returned without explicit permission                                     |
| Auditability                      | Sensitive changes produce immutable audit records                                                                 |
| Localization                      | User-visible trainer data supports English and Arabic labels where available                                      |

---

## 5. Security Validation Summary

- All write routes must enforce permission, scope, and entity ownership before persistence.
- All read routes must enforce permission, scope, and field-level redaction before response serialization.
- All exports must apply the same branch and field filters as the interactive views.
- Compensation notifications are suppressed when recipient authorization is insufficient.
- No module-specific hard delete path is permitted for trainer-owned records.
