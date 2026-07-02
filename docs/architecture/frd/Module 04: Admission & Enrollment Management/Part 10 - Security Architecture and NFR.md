# Functional Requirement Document (Part 10)
## Module 04: Admission & Enrollment Management - Security Architecture & NFRs

---

## 1. Security Architecture

* `Person.nationalId` must be encrypted at the application layer before persistence.
* Identity document access must be handled by the Document Management context using private object storage and signed URLs only; this module stores references and consumes signed links.
* All admission and enrollment reads and writes must be branch-scoped server-side.
* Audit logs are required for admission approval, enrollment approval, enrollment confirmation, soft delete, and branch access changes.

---

## 2. Non-Functional Requirements

| Category | Target |
| --- | --- |
| Search/read performance | 200ms p95 under normal load |
| Write performance | 500ms p95 for admission/enrollment transitions excluding background jobs |
| ID card generation | Asynchronous completion within 5 seconds of approval |
| Availability | 99.9% monthly |
| Concurrency | Prevent double-booking through transaction isolation or row locks |
| Accessibility | Keyboard navigable forms with ARIA labels |
