Yes, you should include them. For this IMS project, I recommend this document order:

1. **BRD – Business Requirement Document**
   Already done at high level. It explains business goals, scope, users, and problems.

2. **DDD Context Map + Business Domains**
   Already done. It defines domain boundaries and ownership.

3. **Domain Data Model / ERD**
   Already done at business level. Next it can become Prisma/DB schema.

   Review-aligned additions are captured in `architecture/ddd/domain-model-v2.md` and `architecture/ddd/ddd-context-map-v2.md`.

4. **FRD – Functional Requirement Document**
   This should be the **next major document**. It explains each module in detail: screens, fields, workflows, validations, permissions, reports, and business rules.

5. **ARD – Architecture Requirement Document**
   After FRD. It explains technical architecture: Next.js monorepo, auth, DB, APIs, file storage, deployment, logging, security, scalability.

   Review-aligned architecture decisions are summarized in `architecture/architecture-v2.md` and traced in `architecture/architecture-validation-report.md`.

6. **NFR – Non-Functional Requirement Document**
   Can be part of ARD or separate. Covers performance, security, availability, backup, audit, localization, accessibility.

7. **API Specification Document**
   Module-wise API contracts, request/response payloads, errors, validations, permissions.

8. **Database Design Document**
   Physical schema: tables, columns, indexes, constraints, enums, audit fields.

9. **UI/UX Screen Inventory + Wireframe Notes**
   Screen list, navigation, forms, table actions, user flows.

10. **User Stories + Acceptance Criteria**
    Best for development execution and sprint planning.

11. **Test Strategy / QA Document**
    Functional test cases, role-based testing, integration testing, UAT checklist.

12. **Deployment & DevOps Document**
    Environments, CI/CD, hosting, backups, monitoring, release process.

**Current documentation priority:** keep the BRD, ARD, NFR, API Specification, Database Design, `architecture-v2.md`, `ddd-context-map-v2.md`, `domain-model-v2.md`, and `architecture-validation-report.md` synchronized after every architecture review.
