## Context

The admin portal already has a partial IAM surface at `/identity`, but it is limited to users, roles, and permissions and still reflects older concepts from the pre-IAM backend shape. The completed IAM backend exposes additional operational capabilities for sessions, security policy, audit, reporting, and dashboards, so the portal needs a broader UI layer to make those capabilities usable.

This change stays within the admin portal and does not alter IAM business rules. It consumes existing IAM application contracts and presents them as a secure operational console with branch-aware filtering and permission-aware navigation.

## Goals / Non-Goals

**Goals:**
- Provide a complete IAM admin portal UX for the completed backend surface.
- Keep route handlers, server actions, and page loaders thin and permission-aware.
- Reuse existing shared UI primitives, form patterns, and server-side data loading patterns where possible.
- Make branch scope, permissions, and status transitions visible to the operator.
- Add test coverage for the core IAM screens and their failure states.

**Non-Goals:**
- No new IAM business rules or backend workflow changes.
- No redesign of the underlying IAM authorization model.
- No new browser-side state platform, API client generator, or UI framework.
- No student, trainer, or public certificate portal work in this phase.

## Decisions

1. Keep the IAM portal as Next.js App Router pages under the protected admin app.
   - Rationale: the repo already uses App Router with server components and server actions for admin workflows, so this keeps the change aligned with current patterns and minimizes plumbing.
   - Alternatives considered: a separate SPA or a new UI shell. Rejected because it would add routing and auth duplication with no business benefit.

2. Treat the portal as a thin presentation layer over IAM application contracts.
   - Rationale: the backend already owns permission checks, branch scoping, audit behavior, and lifecycle rules, so the UI should only render, validate, and call the existing operations.
   - Alternatives considered: duplicating logic in client-side state or local mocks. Rejected because it risks drift from the backend contract.

3. Use shared portal primitives for tables, filters, badges, breadcrumbs, dialogs, and form states.
   - Rationale: the current app already uses `@ims/shared-ui`; reusing those primitives keeps the screens consistent and reduces accessibility and styling risk.
   - Alternatives considered: introducing a parallel component set for IAM. Rejected because it would fragment the admin experience.

4. Model IAM screens around branch-aware server reads and permission-gated actions.
   - Rationale: IAM data is sensitive and branch-scoped, so page loaders should fetch the authoritative branch-visible data and action buttons should only appear when permitted.
   - Alternatives considered: client-side filtering and menu-only hiding. Rejected because UI-only access control is not safe.

5. Prioritize screen coverage over clever interaction patterns.
   - Rationale: the main need is operational clarity for admins, not experimental UX. Dense tables, details, forms, and export states are more useful than a highly dynamic single-page console.
   - Alternatives considered: an all-in-one dashboard with hidden panels. Rejected because it obscures workflows and makes audits harder.

6. Move the IAM console to a clearer `/iam` route family.
   - Rationale: Aligns with the backend `iam.*` permission naming convention and makes the security boundary explicit.

7. Dashboards will link into filtered reports and audit screens.
   - Rationale: Dashboards are more operational if admins can drill down from KPIs into the underlying records.

8. Keep "Sessions" and "Security Policy" as separate screens.
   - Rationale: Policy is a global/branch configuration, while sessions are user-specific ephemeral states. Combining them clutters the UI.

## Risks / Trade-offs

- [Risk] The IAM surface is broad and easy to under-scope. → Mitigation: ship by screen family, starting with users/roles/permissions and then adding sessions, policy, audit, reports, and dashboards.
- [Risk] UI labels may drift from backend permission and status codes. → Mitigation: source labels from the approved IAM contract and add targeted tests for visible statuses and actions.
- [Risk] Branch scoping errors can leak the wrong records. → Mitigation: keep server-side data loading branch-aware and verify filtered results in tests.
- [Risk] Export and report screens can become noisy if job states are unclear. → Mitigation: show job status, completion feedback, and explicit empty/error states.
- [Risk] Responsive admin tables can be brittle on smaller screens. → Mitigation: use shared responsive primitives and validate the core screens at desktop and mobile widths.

## Migration Plan

1. Add the new IAM UI route structure and navigation entry points.
2. Rework the existing identity landing page to route into the full IAM console.
3. Build the screen families in this order: users, roles/permissions, sessions/security policy, audit/reports/dashboards.
4. Wire each screen to the existing IAM application contracts and keep page-level validation local.
5. Add route, form, branch-scope, and permission tests before expanding the final screens.
6. Validate the affected portal build and smoke test the main IAM journeys.

Rollback/mitigation:
- Remove new routes and navigation entries if a screen family proves unstable.
- Because the UI phase does not change the backend contract, rollback is limited to the portal surface and does not require database changes.


