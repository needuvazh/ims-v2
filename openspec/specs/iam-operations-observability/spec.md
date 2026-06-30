# Specification: IAM Operations & Observability

## Purpose
Define requirements for liveness, readiness, and startup health endpoints, structured logging parameters, trace context propagation, and monitoring metrics.

## Requirements

### Requirement: IAM Health Checks
The system SHALL expose liveness, readiness, and startup health checks for IAM operations.

#### Scenario: Readiness check evaluates dependencies
- **WHEN** `/health/ready` is requested
- **THEN** the system SHALL report database connectivity, JWT key availability, migration state when available, and optional email provider status

### Requirement: IAM Structured Logs and Trace Context
The system SHALL emit structured JSON logs and propagate trace/correlation context for IAM API requests.

#### Scenario: Login failure logged safely
- **WHEN** a login attempt fails
- **THEN** the system SHALL log a `LOGIN_FAILURE` event with safe metadata and SHALL NOT log passwords, tokens, reset links, API keys, private keys, or SMTP secrets

#### Scenario: Correlation context propagated
- **WHEN** an IAM API receives `X-Correlation-ID` or `traceparent`
- **THEN** logs, audit context, and downstream calls SHALL include the correlation or trace context where available

### Requirement: IAM Metrics
The system SHALL expose IAM metrics for authentication, authorization, sessions, audit, and API errors.

#### Scenario: Login metrics recorded
- **WHEN** login succeeds or fails
- **THEN** the system SHALL update `iam_login_total`, `iam_login_success_total` or `iam_login_failed_total`, and `iam_auth_latency_ms`

#### Scenario: Permission denial metric recorded
- **WHEN** authorization denies a request
- **THEN** the system SHALL increment `iam_permission_denied_total`

### Requirement: IAM Deployment Smoke Tests
The system SHALL support smoke tests aligned to Part 11 after deployment.

#### Scenario: Post-deploy IAM smoke test
- **WHEN** a deployment completes
- **THEN** smoke tests SHALL verify login page/API availability, valid login, invalid login, user list access, role list access, permission evaluation, branch switch, audit write, and logout
