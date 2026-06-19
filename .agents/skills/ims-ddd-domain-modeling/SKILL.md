---
name: ims-ddd-domain-modeling
description: Model IMS business behavior into bounded contexts, aggregates, value objects, invariants, domain services, and events. Use for Enrollment, Finance, Completion, Certificate, RBAC, or any change that needs DDD-safe ownership and lifecycle rules.
---

# IMS DDD Domain Modeling

Use this skill when a change touches IMS business behavior and you need a domain-safe model before code.

## What to do

1. Identify the owning bounded context and aggregate root.
2. Prefer `Enrollment` as the central learning-lifecycle aggregate when the flow spans Student, Course, Batch, Finance, Attendance, Completion, or Certificate.
3. Write the invariant first, then the state transition, then the event.
4. Split commands from queries. Keep orchestration in application services, not route handlers.
5. Use value objects for validated concepts such as Money, DateRange, Percentage, BranchId, CourseId, EnrollmentId, and CertificateNumber.

## Guardrails

- Do not create duplicate lifecycle models for Regular, Corporate, and Walk-In flows.
- Do not let one bounded context mutate another context's tables directly.
- Do not hide business rules in UI, Prisma hooks, or database triggers.
- If the rule affects finance, certificates, completion, or access control, call out the audit and test impact.

## Output

Return:

- aggregate and entity names
- command names
- domain events
- repository interfaces
- invariants and state transitions
- edge cases that need tests

