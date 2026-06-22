## Why

IMS currently has database tables and domain objects for User, Role, Permission, and UserDataScope, but lacks the core execution runtime for dynamic Role-Based Access Control (RBAC) and branch-scoped data scoping. 

By implementing server-side permission assertions, loading data scope limits into user sessions, and dynamically resolving active branch parameters inside portals, we establish a robust security foundation that ensures branch isolation (e.g. branch managers accessing assigned branches only) and counselor isolation (accessing assigned leads only).

## What Changes

- **Session DTO Extension**: Extend the `@ims/shared-auth` session token payload to store user scope rules (`dataScopes`) along with active branch information (`activeBranchId`) and token lifespan (`expiresAt`).
- **Data Scopes Retrieval**: Update database user repositories to load user scopes during credentials checking in `AuthService`.
- **Scoping Check Utilities**: Introduce helper functions (`isAuthorizedForBranch`, `getAuthorizedBranchIds`, `isGlobalScope`) inside `@ims/shared-auth` to resolve scope assertions.
- **Server Action Guards**: Add server-side guards (`assertPermission`, `assertBranchScope`) to secure admin portal mutation paths (like user creation, role status toggles) from unauthorized API requests, enforcing real-time user status checks against the database.
- **Token Expiration & Policy Enforcement**: Validate session token expiration times at decoding time and enforce password complexity rules using regex constraints in command schemas.
- **Granular Security Error Mapping**: Map auth/permission failures directly to dedicated domain errors (`InactiveUserCannotLogin`, `LockedUserCannotLogin`, `BranchScopeViolation`, etc.) to support clean client-side feedback.
- **UI Integration**: Replace hardcoded branch indicators in portal layouts with dynamic active branch context from the authenticated session.
- **Test Stabilizations**: Restructure test configurations to separate Vitest unit tests from Playwright E2E specs, and resolve broken role/username expectations in existing tests.

## Capabilities

### New Capabilities
- `rbac-branch-auth-foundation`: core utilities for data scoping resolution, branch-based authorization limits, and Next.js server action validation wrappers.

### Modified Capabilities
- `identity-access`: authentication session token payload now packs user data scopes dynamically.

## Impact

- **Security & Authorization**: Next.js Server Actions enforce action-level validation (e.g., `identity.write` or `identity.role.manage`) before executing business operations, sealing API pathways.
- **Data Scoping Integration**: Prisma DB adapters can extract allowed branch contexts from active sessions to filter multi-branch query outputs.
- **Unified Portal Layout**: Admin navigation header displays branch details dynamically.
- **Clean Testing boundary**: E2E Playwright tests run isolated from Vitest suite execution.

## Source Anchors

- FRD security requirements: `docs/architecture/frd/Module 1: Identity & Access Management.md` (FR-IAM-008 to FR-IAM-012, FR-IAM-015).
- DDD boundaries and responsibilities: `docs/architecture/ddd/Domain-Driven Design Context Map.pdf` (Section 7.1).
- Non-functional security expectations: `docs/architecture/nfr/Non-Functional Requirement Document.md`.
