## Why

IMS currently has no shared observability layer, so request tracing, structured logs, and metrics are inconsistent or absent across the admin portal and any future portals. This change creates a vendor-neutral foundation now so the current Next.js app can expose traceable API responses and the student and trainer route groups can reuse the same pattern later without duplicating telemetry logic. Future standalone portals, if split into separate apps, should reuse the same package and bootstrap contract.

## What Changes

- Introduce a shared observability package for the IMS monorepo.
- Add a single Next.js app bootstrap for OpenTelemetry initialization at the app root.
- Add request correlation IDs and trace propagation at the request boundary.
- Ensure API route responses can include a trace identifier header for support and debugging.
- Emit structured logs with trace and request correlation fields.
- Export traces and metrics through a backend-agnostic OpenTelemetry setup.
- Keep middleware focused on auth and request correlation, not full telemetry setup.

## Capabilities

### New Capabilities
- `observability`: shared tracing, structured logging, metrics, request correlation, and response trace headers for IMS portals and API routes.

### Modified Capabilities
- None.

## Impact

- New shared package for observability helpers and bootstrap code.
- Next.js app-root instrumentation entrypoint for the admin portal now, with route-group reuse inside the same app and future reuse by separate portal apps if they are added later.
- Update `apps/admin-portal/next.config.ts` so the new shared package is transpiled with the rest of the workspace packages.
- API route handlers can attach trace/correlation headers where appropriate; server actions should propagate correlation context and log fields but should not be assumed to set response headers directly.
- Middleware will carry only request correlation concerns alongside existing auth redirects.
- Environment configuration will need telemetry exporter settings for local, staging, and production use, with safe local defaults so observability setup does not block development startup.

## Source Anchors

- NFR observability requirements: `docs/architecture/nfr/Non-Functional Requirement Document.md` (NFR-OBS-001 to NFR-OBS-004).
- ARD observability requirements: `docs/architecture/ard/Architecture Requirement Document.md` (Section 26).
- Technology-stack observability guidance: `docs/ims-technology-stack-recommendation.md` (Observability section).
