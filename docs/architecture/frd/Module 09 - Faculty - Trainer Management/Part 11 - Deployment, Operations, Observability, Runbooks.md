# Part 11 - Deployment, Operations, Observability, Runbooks

## Module 09 - Faculty / Trainer Management

## 1. Purpose

This document defines the deployment shape, operational behavior, observability expectations, backup/recovery assumptions, and incident runbooks for Module 09.

The module is implemented inside the ASTI IMS modular monolith and uses the shared PostgreSQL database. It does not require an external message broker or a separate service boundary.

---

## 2. Deployment Model

1. Deploy the Next.js application as the primary runtime for the admin portal and server routes.
2. Use the shared database schema for trainer data and cross-context references.
3. Keep Module 09 events in-process and post-commit.
4. Treat background processing as a platform concern only when a later module explicitly requires it.

Operational dependencies:

- IAM branch context and permission evaluation
- Person / Party read access
- Course Catalog read access
- Training Delivery read access
- Document Management read access
- Audit & Compliance write/read access

---

## 3. Observability

| Operation                           | Log                                                         | Metric                              | Alert                           |
| ----------------------------------- | ----------------------------------------------------------- | ----------------------------------- | ------------------------------- |
| Trainer create/update/status change | requestId, userId, branchId, trainerId, action, version     | mutation latency, error count       | error spike, latency regression |
| Eligibility validation              | requestId, userId, branchId, trainerId, courseId, decision  | validation latency, rejection rate  | sustained validation failures   |
| Availability overlap failure        | requestId, userId, branchId, trainerId, conflictId          | overlap failure count               | repeated overlap failures       |
| Compensation resolution             | requestId, userId, branchId, trainerId, specificity, rateId | ambiguity count, resolution latency | ambiguous rate spike            |
| Branch denial                       | requestId, userId, branchId, requestedScope                 | denied access count                 | repeated denied access          |
| Report export                       | requestId, userId, branchId, reportCode, rowCount, format   | export count, export latency        | export failure or limit breach  |
| Audit write failure                 | requestId, userId, branchId, entityType, action             | audit failure count                 | any audit write failure         |

Log content must not include passwords, tokens, raw compensation amounts in unauthorized contexts, or unnecessary PII.

---

## 4. Backup and Recovery

Module 09-owned tables must be covered by full-database backups and point-in-time recovery:

- `TrainerProfile`
- `TrainerQualification`
- `TrainerAvailability`
- `TrainerCourseAuthorization`
- `TrainerCompensationRate`

Recovery validation after restore:

1. Verify referential integrity.
2. Verify soft-delete columns and effective-date columns.
3. Verify partial uniqueness rules for active trainer profile and trainer code.
4. Verify compensation ambiguity checks still function.
5. Verify audit continuity for sensitive trainer actions.

---

## 5. Runbooks

| Failure Mode                           | Detection                         | Immediate Action                                            |
| -------------------------------------- | --------------------------------- | ----------------------------------------------------------- |
| Slow trainer search                    | latency metric and timeout alerts | verify query plan, indexes, and scope predicates            |
| Trainer mutation failure               | mutation error count              | inspect validation, concurrency, and branch scope           |
| Overlap false positive                 | overlap rejection count           | compare effective dates, weekday, and time intervals        |
| Empty eligible-trainer search          | zero-result rate                  | check authorization, availability, and branch scope         |
| Authorization transition failure       | status change error count         | verify transition matrix and active assignment impact       |
| Missing or ambiguous compensation rate | compensation resolution errors    | check specificity, date range, and session/batch references |
| Cross-branch exposure                  | scope-denial audit anomalies      | verify IAM branch grants and query predicates               |
| Bulk import failure                    | import job error count            | inspect payload validation and duplicate detection          |
| Notification failure                   | communication failure logs        | confirm post-commit event and communication retry behavior  |
| Audit failure                          | audit write failure alert         | halt sensitive operations until audit path is healthy       |
| DB connection pool exhaustion          | DB health alert                   | reduce concurrency and verify query efficiency              |
| Report export failure                  | export error count                | check row limits, scope, and field permissions              |

Operational guidance:

- Do not retry failed state changes blindly if the original commit status is unknown.
- Do not bypass branch filtering to recover data faster.
- Do not expose compensation data while investigating read failures.
- Do not remove audit logging to work around downstream failures.
