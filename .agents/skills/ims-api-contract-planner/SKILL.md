---
name: ims-api-contract-planner
description: Plan IMS API endpoints, request and response DTOs, Zod validation, permissions, branch scoping, domain error mapping, and audit requirements. Use for Next.js route handlers and application-service backed endpoints.
---

# IMS API Contract Planner

Use this skill when defining or changing an IMS HTTP API.

## What to produce

For each endpoint, define:

- route and method
- owning bounded context
- command or query service
- request DTO
- response DTO
- required permission
- branch-scoping rule
- validation failures
- domain errors and HTTP mapping
- audit behavior

## Rules

1. Keep route handlers thin.
2. Validate every request at the boundary with Zod or the repo-standard validator.
3. Call one application service per mutation.
4. Do not leak Prisma models into responses.
5. Use stable, explicit error codes.
6. Document whether the endpoint is command-like or query-like.

## IMS-specific checks

- If the endpoint changes Enrollment, Finance, Completion, Certificate, or RBAC, include audit and test notes.
- If the endpoint is branch scoped, specify the exact access rule.
- If the endpoint is a form submission, include field-level validation failures.

