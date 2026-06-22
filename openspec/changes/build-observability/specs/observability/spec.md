## ADDED Requirements

### Requirement: Shared observability package
The system SHALL provide a shared observability package for IMS server-side code that exposes reusable helpers for request context propagation, structured logging, and OpenTelemetry bootstrap registration.

#### Scenario: Shared helpers are available to app code
- **WHEN** the admin portal imports the observability package from workspace code
- **THEN** the package SHALL expose stable helpers for bootstrap registration, request-context access, and structured logger creation

#### Scenario: Shared helpers stay framework-agnostic
- **WHEN** a Next.js route handler or server action consumes the observability package
- **THEN** the package SHALL not require the caller to import vendor-specific telemetry code directly

### Requirement: App-root observability bootstrap
The system SHALL initialize OpenTelemetry from the Next.js app root instrumentation entrypoint exactly once per server instance startup and SHALL allow the server to start even when no external exporter is configured.

#### Scenario: Bootstrap runs during server startup
- **WHEN** the Next.js server instance starts
- **THEN** the app-root instrumentation entrypoint SHALL register observability initialization before the server begins handling requests

#### Scenario: Missing exporter does not block startup
- **WHEN** local development runs without exporter environment variables
- **THEN** the application SHALL continue to boot with a safe no-op or local-default observability configuration

### Requirement: Request correlation propagation
The system SHALL generate or forward a request correlation identifier for portal requests and SHALL preserve that identifier across middleware and server-side request handling without changing existing auth redirect behavior. Route handlers that are not matched by middleware SHALL still be able to establish the same correlation context from incoming headers or generate a new one.

#### Scenario: Middleware forwards an incoming correlation identifier
- **WHEN** an incoming request already contains a correlation identifier header
- **THEN** middleware SHALL preserve that identifier for the downstream request context

#### Scenario: Middleware creates a missing correlation identifier
- **WHEN** an incoming request does not contain a correlation identifier header
- **THEN** middleware SHALL generate a new identifier and make it available to downstream request handling

#### Scenario: Auth redirects still work
- **WHEN** an unauthenticated request targets a protected route
- **THEN** middleware SHALL continue to redirect to the sign-in page exactly as before while also preserving correlation context

#### Scenario: Unmatched routes still get correlation context
- **WHEN** a route handler such as health or sign-out is invoked without passing through middleware
- **THEN** the route handler SHALL still establish or forward a request correlation identifier for logging and response metadata

### Requirement: Trace headers on API responses
The system SHALL allow API route responses to include request correlation and trace identifier headers for support and debugging and SHALL keep that behavior in route handlers rather than server actions.

#### Scenario: Route handler response includes trace header
- **WHEN** an API route handler completes successfully
- **THEN** the response SHALL include a request correlation header and MAY include a trace identifier header when trace context is available

#### Scenario: Server actions do not write response headers directly
- **WHEN** a server action performs a mutation
- **THEN** the server action SHALL propagate correlation context for logging but SHALL not be responsible for writing HTTP response headers

#### Scenario: Existing API behavior is preserved
- **WHEN** the health route is called
- **THEN** the route SHALL still return a successful JSON health response and MAY include correlation metadata without changing the response contract

### Requirement: Server-side error tracking
The system SHALL capture uncaught server-side errors through the shared observability layer so route handlers, server components, and server actions can report production failures consistently.

#### Scenario: Uncaught server error is reported
- **WHEN** the Next.js server captures an uncaught error in a route handler, server component, or server action
- **THEN** the instrumentation layer SHALL forward the error details to the configured observability provider

#### Scenario: Existing route error boundaries remain intact
- **WHEN** a route segment already handles an error through `error.tsx` or equivalent framework error handling
- **THEN** the observability layer SHALL report the error without changing the route's existing fallback behavior

### Requirement: Structured logs and safe observability configuration
The system SHALL emit structured logs with request correlation fields and SHALL keep observability configuration safe for local development and optional for deployment environments that have no external telemetry exporter.

#### Scenario: Structured logs contain correlation fields
- **WHEN** a server-side request or action is logged through the shared observability helper
- **THEN** the log entry SHALL include the request correlation identifier and any available trace identifier

#### Scenario: Structured logs avoid secrets
- **WHEN** application code logs a request or action context
- **THEN** the observability layer SHALL not require or encourage logging passwords, tokens, payment secrets, document contents, or other sensitive payloads

#### Scenario: Configuration remains optional
- **WHEN** telemetry exporter environment variables are absent
- **THEN** the observability layer SHALL fall back to a safe local default instead of failing application startup
