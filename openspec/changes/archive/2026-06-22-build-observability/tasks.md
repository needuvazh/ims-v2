## 1. Shared Package

- [x] 1.1 Create the `@ims/observability` workspace package and export a minimal public API for request context, structured logging, and bootstrap registration.
- [x] 1.2 Implement framework-agnostic request context helpers for correlation ID and trace ID propagation.
- [x] 1.3 Implement a structured server-side logger helper that emits safe correlation fields and excludes sensitive payloads by default.
- [x] 1.4 Implement OpenTelemetry bootstrap helpers with optional exporter configuration and a safe local no-op default.
- [x] 1.5 Implement server-side error reporting hooks that forward uncaught errors through the shared observability layer.

## 2. Next.js App Bootstrap

- [x] 2.1 Add the app-root instrumentation entrypoint for the admin portal and wire it to the shared observability bootstrap.
- [x] 2.2 Update `apps/admin-portal/next.config.ts` to transpile the new observability package with the other workspace packages.
- [x] 2.3 Add local environment defaults or documentation for observability-related environment variables so development startup does not fail when exporters are unset.

## 3. Request Boundary Integration

- [x] 3.1 Update `apps/admin-portal/middleware.ts` to generate or forward a correlation identifier without changing the existing auth redirect behavior.
- [x] 3.2 Ensure the middleware implementation remains edge-safe and does not import Node-only telemetry SDK code.
- [x] 3.3 Add request-context propagation helpers to the admin portal runtime so server actions and route handlers can access correlation data consistently, including routes not matched by middleware.
- [x] 3.4 Update the health route to preserve its response contract while optionally exposing correlation metadata when available.
- [x] 3.5 Confirm the sign-out route and any other unmatched route handlers can still establish correlation context from incoming headers.

## 4. Route Handler and Server Action Logging

 - [x] 4.1 Update API route handlers to read trace context from the shared request helper and attach support headers consistently.
 - [x] 4.2 Update API route handlers to attach a request correlation header on responses and a trace identifier header where trace context is available.
 - [x] 4.3 Update server action entrypoints to log with correlation-aware context without attempting to write HTTP response headers directly.
 - [x] 4.4 Confirm sign-in, sign-out, and protected-route request paths continue to work with the new correlation flow.

## 5. Verification

- [x] 5.1 Add unit tests for request context generation, correlation preservation, and structured logger field selection.
- [x] 5.2 Add tests for middleware auth redirects to verify the new observability changes do not alter redirect behavior.
- [x] 5.3 Add tests for route-handler correlation/trace header behavior and health route contract preservation.
- [x] 5.4 Add tests that uncaught server-side errors are forwarded through the instrumentation error hook.
- [x] 5.5 Run affected validation commands: typecheck, lint, unit tests, and Next.js build for the admin portal.
