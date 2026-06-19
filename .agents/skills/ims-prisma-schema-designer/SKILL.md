---
name: ims-prisma-schema-designer
description: Design Prisma and PostgreSQL schema changes for IMS while preserving bounded-context ownership, audit fields, effective dating, soft delete rules, and migration safety. Use for new tables, relationships, indexes, or schema refactors.
---

# IMS Prisma Schema Designer

Use this skill when changing IMS persistence.

## What to do

1. Confirm the owning bounded context for each table.
2. Model one aggregate owner per write path.
3. Add audit fields and status fields where the domain expects them.
4. Use effective dating on configuration, pricing, rules, templates, contracts, and assignments.
5. Prefer relational constraints for facts that must always be true.
6. Keep cross-context joins out of write paths.

## Schema rules

- Use soft delete only when history must be preserved.
- Use `NULL` `effectiveEndDate` for indefinite validity.
- Avoid nullable fields that hide required domain inputs.
- Keep indexes aligned with lookup and branch-scoped access patterns.
- If a change touches finance, certificate, or completion data, treat it as high-risk and pair it with tests.

## Output

Return:

- table ownership
- Prisma models and relations
- indexes and constraints
- migration notes
- repository impact
- any data backfill or rollout risk

