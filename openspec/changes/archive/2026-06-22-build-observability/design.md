## Context

IMS currently has no shared observability layer. The existing admin portal is a single Next.js App Router application with protected route groups, server actions, a small set of route handlers, and edge middleware for auth redirects. There is no dedicated observability package, no app-root instrumentation file, and no standardized way to attach request correlation IDs, trace context, or structured log fields across server actions and route handlers.

The change is cross-cutting but still contained within the current monorepo and current admin portal runtime. It must remain compatible with the existing modular monolith approach and must not introduce a vendor-coupled observability stack, a message broker, or any new distributed runtime boundary.

Relevant constraints:

- The app is Next.js App Router, so instrumentation belongs at the app root.
- Middleware runs in the edge runtime and must remain lightweight.
- Server actions must stay serializable and cannot be treated like HTTP response writers.
- Observability must complement, not replace, audit logging.
- Future student and trainer portals should be able to reuse the same package and bootstrap contract if they are later split into separate apps.

## Goals / Non-Goals

**Goals:**

- Provide one shared observability package for IMS portal/server code.
- Standardize request correlation IDs and trace context propagation.
- Add app-root OpenTelemetry bootstrap for the current admin portal.
- Emit structured logs with request, user, branch, and trace fields where available.
- Allow API route responses to return a trace identifier header for support/debugging.
- Keep middleware focused on auth and correlation propagation only.
- Keep the implementation backend-agnostic so the exporter can be swapped by environment.
- Define a reusable foundation for future student, trainer, and public verification surfaces.

**Non-Goals:**

- Replacing audit logs with observability logs.
- Introducing Redis, a queue broker, CQRS, event sourcing, or microservices.
- Implementing application business rules inside the observability layer.
- Adding vendor-specific analytics, dashboards, or product telemetry.
- Forcing separate portal apps now; the current repo has one app with route groups.
- Changing persistence schemas or introducing new business entities.

## Decisions

### 1. Use one workspace package for observability

Create a shared package, likely `@ims/observability`, that owns the reusable server-side logger factory, request context helpers, trace utilities, and bootstrap helpers.

Rationale:

- Keeps observability code out of the app layer and avoids copy/paste across future portals.
- Preserves the modular monolith boundary by centralizing cross-cutting technical behavior in one package.
- Makes it easier to add future portal apps or worker processes without re-deriving telemetry wiring.

Alternatives considered:

- Inline telemetry setup in `apps/admin-portal`.
  - Rejected because it would hardcode the pattern in one app and make future reuse brittle.
- Separate package per portal.
  - Rejected because the portal differences are runtime concerns, not observability concerns.

### 2. Bootstrap OpenTelemetry from the app root, not from middleware

Add `instrumentation.ts` at the root of the admin portal app and initialize OpenTelemetry there. Middleware will only create or forward correlation metadata and auth redirects.

Rationale:

- Next.js instrumentation is the documented integration point for app startup observability.
- Middleware runs in the edge runtime and should not carry Node-only SDK initialization or exporter setup.
- Keeping bootstrap separate reduces the risk of startup failures and runtime incompatibility.

Alternatives considered:

- Initialize telemetry inside middleware.
  - Rejected because middleware is edge-constrained and should stay minimal.
- Initialize telemetry lazily in route handlers.
  - Rejected because it would fragment initialization and make request coverage inconsistent.

### 3. Keep middleware edge-safe and limited to correlation + auth

Middleware should generate or forward a request correlation ID, preserve it on the request context, and continue to handle existing auth redirects. It should not instantiate SDK exporters, batch processors, or any Node-only telemetry components.

Rationale:

- The current middleware is already part of the auth boundary.
- Edge runtime compatibility is simpler when middleware only uses request/response primitives.
- Correlation IDs are useful even when tracing exporters are disabled locally.

Alternatives considered:

- Move all correlation logic into route handlers.
  - Rejected because middleware is the earliest consistent request interception point.
- Use middleware for full trace export.
  - Rejected due to runtime and bundle constraints.

### 4. Treat response trace headers as a route-handler concern

API route handlers may attach a trace identifier header to their responses. Server actions should propagate correlation context and structured log fields, but they should not be designed as if they can set response headers directly.

Rationale:

- Route handlers produce HTTP responses directly and are the right place to attach response headers.
- Server actions are invoked as framework-managed server functions, so their output contract is serializable data, not raw headers.
- This avoids building a misleading abstraction that would break later when server actions are reused in forms or client-triggered mutations.

Alternatives considered:

- Add response headers from server actions.
  - Rejected because that is not the correct abstraction boundary.
- Omit trace headers entirely.
  - Rejected because the proposal explicitly needs support/debuggability.

Route handlers that do not pass through middleware, such as health or sign-out routes, must still be able to initialize or forward the request context from incoming headers so correlation does not depend on a matcher path.

### 5. Prefer official OpenTelemetry primitives over vendor-specific helpers

Use OpenTelemetry APIs and SDK packages directly, with exporter configuration driven by environment variables. Do not couple the implementation to a hosting-specific helper.

Rationale:

- The proposal calls for a backend-agnostic setup.
- The repo may evolve through different deployment targets, so the observability layer should not assume a single vendor.
- Environment-driven exporters make it easier to support local, staging, and production differences.

Alternatives considered:

- Use a platform-specific helper package.
  - Rejected because it narrows deployment flexibility.

### 6. Keep logging structured and domain-aware, but not domain-owned

Provide a server-side logger helper that emits JSON/structured fields such as `requestId`, `traceId`, `userId`, `branchId`, `route`, `action`, and `status`. Call sites should choose the right event name and include domain context, but the observability package should not own business semantics.

Rationale:

- Structured logs need consistent keys to be useful.
- Domain packages should remain responsible for business decisions, not logging policy.
- Audit records remain a separate, durable business/compliance concern.

Alternatives considered:

- Use plain `console.log` everywhere.
  - Rejected because it does not standardize correlation or structured fields.
- Put logging helpers inside each domain package.
  - Rejected because it duplicates cross-cutting infrastructure.

### 7. Add package transpilation and env defaults as part of rollout

Update `apps/admin-portal/next.config.ts` to transpile the new package, and add non-blocking environment defaults for local development so observability does not prevent the app from starting.

Rationale:

- Workspace packages must be included in Next.js transpilation when they contain modern TypeScript or ESM output.
- Observability should be safe to run with no external exporter configured in local dev.

Alternatives considered:

- Rely on build-time imports only.
  - Rejected because the package is expected to be imported directly by app code and server runtime entrypoints.

### 8. Capture server-side production errors through instrumentation

Export `onRequestError` from the root instrumentation file so uncaught server-side errors in route handlers, server components, and server actions are reported through the shared observability layer.

Rationale:

- The Next.js instrumentation API explicitly supports server error capture through `onRequestError`.
- This change would otherwise cover traces and logs but miss the NFR error-tracking requirement.
- Centralizing this at instrumentation time keeps error capture consistent across the whole server runtime.

Alternatives considered:

- Rely only on local `try/catch` blocks in application code.
  - Rejected because uncaught framework-level errors would still be missed.
- Use client error boundaries as the only capture mechanism.
  - Rejected because those do not cover server-side failures.

### 9. Separate request correlation from trace identity

Use one stable request correlation identifier for ingress, logging, and support troubleshooting, and treat the OpenTelemetry trace ID as separate context metadata. Route handlers may expose both where appropriate, but the design should not collapse them into one implicit value.

Rationale:

- Request correlation IDs are stable operational identifiers even when tracing is disabled.
- Trace IDs are tied to active spans and may not exist on every code path.
- Keeping them separate avoids ambiguous logs and inconsistent header semantics.

Alternatives considered:

- Use a single ID for both request correlation and trace identity.
  - Rejected because it blurs two different debugging concerns and makes the contract harder to evolve.

### 10. Standardize the request-header contract and bootstrap fallback

Use `x-request-id` as the canonical request correlation header and mirror it to `x-correlation-id` on outgoing responses. Accept `x-request-id`, `x-correlation-id`, and the legacy `x-ims-request-id` as inbound correlation sources. Use `x-trace-id` as the explicit trace header when a trace is available, and continue to accept `traceparent` or the legacy `x-ims-trace-id` for upstream trace continuity.

Middleware, route handlers, and redirect responses should all apply the same response-header contract so support tooling sees a consistent correlation ID even when the request ends in a redirect.

For local startup, "safe local default" means the bootstrap layer may no-op when exporter environment variables are absent. That keeps development runnable without requiring OTLP or any vendor backend, while still allowing traces and metrics to be enabled by environment when desired.

Rationale:

- A single canonical request header avoids ambiguity in logs and response handling.
- Mirroring the request ID to a correlation alias keeps backward compatibility for existing tooling.
- Redirect responses are still support-relevant and should carry the same correlation metadata as 200 responses.
- A no-op fallback is safer than a partially configured exporter that can break startup.

Alternatives considered:

- Support multiple unrelated request-id headers with no canonical name.
  - Rejected because it complicates search, support tooling, and future docs.
- Fail startup when exporter settings are missing.
  - Rejected because observability should not block development or local review.

## Risks / Trade-offs

- [Risk] App startup may fail if OpenTelemetry setup depends on missing exporter env vars. -> Mitigation: make exporters optional and default to no-op or stdout-safe local behavior.
- [Risk] Middleware bundle size or runtime incompatibility could break auth redirects. -> Mitigation: keep middleware edge-safe, avoid Node-only imports, and test redirects separately.
- [Risk] Correlation IDs could be generated in multiple places and diverge. -> Mitigation: define a single request-correlation source of truth and reuse it across middleware, route handlers, and logger context helpers.
- [Risk] Structured logs may accidentally capture sensitive PII. -> Mitigation: whitelist fields and avoid logging secrets, tokens, payment data, or document contents.
- [Risk] Tracing might be mistaken for compliance audit logging. -> Mitigation: keep audit logging in the Audit bounded context and document observability as non-authoritative for compliance.
- [Risk] Over-broad middleware matching could affect public routes or server actions unexpectedly. -> Mitigation: scope the matcher deliberately and test the exact protected and API paths that need correlation headers.
- [Risk] Future portal apps may not share the same route topology. -> Mitigation: design the package and bootstrap API so it can be reused by separate apps without assuming route groups.

## Migration Plan

1. Add the shared observability package in the workspace and expose a small public API for logger creation, request context, and bootstrap registration.
2. Add app-root instrumentation for the admin portal and wire it to the shared bootstrap API.
3. Update `apps/admin-portal/next.config.ts` to transpile the observability package.
4. Add correlation propagation in middleware while preserving current auth redirect behavior.
5. Update API route handlers to read the request context and attach response trace headers where appropriate.
6. Add safe local environment defaults for exporter configuration.
7. Verify that existing sign-in, sign-out, and health routes still behave as expected.

Rollback strategy:

- Remove the instrumentation entrypoint.
- Remove the new package import from app code.
- Revert the `next.config.ts` transpilation entry.
- Remove any new env vars or default exporter wiring.

No persistence migration is required for this change.

## Open Questions

- Should the initial logger helper be built on a dedicated logging library or a thin JSON wrapper around console output?
- Should the observability package expose a shared request-context API for future worker processes as well as Next.js routes?
- Should public certificate verification routes use the same trace header policy as protected admin routes?
