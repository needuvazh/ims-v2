---
name: ims-rbac-branch-authorization
description: Design and test IMS dynamic RBAC, branch-scoped permissions, counselor visibility, and menu/report/action access rules. Use when access control, authorization, or branch filtering changes.
---

# IMS RBAC and Branch Authorization

Use this skill for every IMS access-control change.

## What to determine

1. The actor type: student, trainer, counselor, accountant, branch manager, admin, or system job.
2. The permission needed: action, menu, or report access.
3. The branch scope: assigned branch, all branches, or explicit cross-branch access.
4. The owning context for the protected resource.

## Rules

- Enforce authorization server-side in the application service or route layer.
- Never rely on UI hiding.
- Do not hardcode roles.
- Counselor access is branch-scoped by default.
- Branch manager access stays within assigned branches unless a permission says otherwise.
- Any access-control mutation must be auditable.

## Output

Return:

- permission names
- branch-scoping rule
- allow/deny matrix
- policy checks
- test cases for positive and negative paths
- audit events if the change is sensitive

