# ASTI IMS Solution Design Specification (SDS)

# Module 01 – Identity & Access Management (IAM)

# Part 11

# Deployment, Operations, Observability, Runbooks

**Version:** 3.0
**Status:** Draft

---

# 1. Purpose

This section defines how the IAM module should be deployed, operated, monitored, supported, and recovered in production.

It is intended for:

* Solution architects
* DevOps engineers
* SRE teams
* Backend engineers
* Security teams
* Production support teams

---

# 2. Deployment Goals

The IAM deployment must support:

* Secure production deployment
* High availability
* Zero or near-zero downtime releases
* Reliable authentication
* Fast rollback
* Centralized logging
* Metrics and alerting
* Disaster recovery
* Secure secret handling
* Operational support

---

# 3. Environment Strategy

## 3.1 Environments

| Environment | Purpose                    |
| ----------- | -------------------------- |
| Local       | Developer testing          |
| Development | Feature integration        |
| QA          | Functional testing         |
| UAT         | Client validation          |
| Staging     | Production-like validation |
| Production  | Live ASTI IMS system       |

---

## 3.2 Environment Rules

* Production data must not be copied to lower environments without masking.
* Secrets must be environment-specific.
* UAT should mirror production roles, permissions, and branch structure.
* Staging should mirror production infrastructure as closely as possible.
* All environments should use HTTPS where practical.

---

# 4. Deployment Architecture

## 4.1 Recommended Production Deployment

```text
User Browser
    ↓
HTTPS
    ↓
Load Balancer / Reverse Proxy
    ↓
Next.js Admin Portal
    ↓
API Layer / Backend Services
    ↓
IAM Service Layer
    ↓
PostgreSQL
    ↓
Redis Cache
```

---

## 4.2 IAM Runtime Components

| Component        | Responsibility                            |
| ---------------- | ----------------------------------------- |
| Admin Portal     | IAM screens and admin UI                  |
| IAM API          | Authentication, users, roles, permissions |
| PostgreSQL       | Identity, roles, permissions, audit data  |
| Redis            | Session cache, permission cache           |
| Email Service    | Activation and reset emails               |
| Object Storage   | Optional profile images                   |
| Monitoring Stack | Logs, metrics, traces, alerts             |

---

# 5. Deployment Strategy

## 5.1 Release Strategy

Recommended:

```text
Blue-Green Deployment
```

Alternative:

```text
Rolling Deployment
```

---

## 5.2 Deployment Steps

1. Build application artifact.
2. Run unit tests.
3. Run integration tests.
4. Run security scan.
5. Run database migration check.
6. Deploy to staging.
7. Run smoke tests.
8. Deploy to production.
9. Run production smoke tests.
10. Monitor for errors.
11. Roll back if threshold breached.

---

# 6. Database Migration Strategy

## 6.1 Migration Principles

* Migrations must be version-controlled.
* Migrations must be backward-compatible when possible.
* Destructive migrations are prohibited without approval.
* Migration rollback plan must exist.
* Schema changes must be tested in staging.

---

## 6.2 Migration Checklist

Before production migration:

* Backup completed.
* Migration tested in staging.
* Rollback script available.
* Downtime impact understood.
* Data integrity checks prepared.
* Approval received.

---

# 7. Configuration Management

## 7.1 Runtime Configuration

All environment-specific values must be externalized.

Examples:

```text
DATABASE_URL
REDIS_URL
JWT_PRIVATE_KEY
JWT_PUBLIC_KEY
JWT_ACCESS_TOKEN_TTL
JWT_REFRESH_TOKEN_TTL
SMTP_HOST
SMTP_USER
SMTP_PASSWORD
PASSWORD_MIN_LENGTH
SESSION_TIMEOUT_MINUTES
MAX_FAILED_LOGIN_ATTEMPTS
```

---

## 7.2 Feature Flags

Recommended flags:

```text
iam.mfa.enabled
iam.sso.enabled
iam.direct-permissions.enabled
iam.device-tracking.enabled
iam.password-expiry.enabled
iam.session-limit.enabled
```

---

# 8. Secrets Management

Secrets must be stored outside application code.

Allowed:

* Cloud Secrets Manager
* HashiCorp Vault
* Kubernetes Secrets with encryption
* CI/CD secret vault

Disallowed:

* Git repository
* `.env` committed to source control
* Docker images
* Frontend public environment variables

---

# 9. Observability Architecture

## 9.1 Observability Layers

```text
Logs
Metrics
Traces
Audit Events
Health Checks
Alerts
```

---

# 10. Logging

## 10.1 Log Format

All logs should be structured JSON.

Example:

```json
{
  "timestamp": "2026-06-29T10:00:00Z",
  "level": "INFO",
  "module": "IAM",
  "event": "LOGIN_SUCCESS",
  "userId": "user-001",
  "branchId": "branch-001",
  "ip": "192.168.1.10",
  "correlationId": "corr-123"
}
```

---

## 10.2 Required Log Events

| Event                    | Level |
| ------------------------ | ----- |
| LOGIN_SUCCESS            | INFO  |
| LOGIN_FAILURE            | WARN  |
| ACCOUNT_LOCKED           | WARN  |
| PASSWORD_RESET_REQUESTED | INFO  |
| PASSWORD_RESET_COMPLETED | INFO  |
| ROLE_ASSIGNED            | INFO  |
| PERMISSION_CHANGED       | WARN  |
| BRANCH_SWITCHED          | INFO  |
| UNAUTHORIZED_ACCESS      | WARN  |
| SYSTEM_ERROR             | ERROR |

---

## 10.3 Log Redaction

Never log:

* Passwords
* Tokens
* Reset links
* OTPs
* API keys
* Private keys
* SMTP passwords

---

# 11. Metrics

## 11.1 IAM Metrics

| Metric                      | Type      | Description             |
| --------------------------- | --------- | ----------------------- |
| iam_login_total             | Counter   | Total login attempts    |
| iam_login_success_total     | Counter   | Successful logins       |
| iam_login_failed_total      | Counter   | Failed logins           |
| iam_account_locked_total    | Counter   | Accounts locked         |
| iam_password_reset_total    | Counter   | Password reset requests |
| iam_permission_denied_total | Counter   | Authorization failures  |
| iam_active_sessions         | Gauge     | Current active sessions |
| iam_auth_latency_ms         | Histogram | Authentication latency  |
| iam_api_errors_total        | Counter   | API errors              |
| iam_audit_events_total      | Counter   | Audit records created   |

---

## 11.2 Business Metrics

| Metric              | Description                   |
| ------------------- | ----------------------------- |
| Active Users        | Users currently active        |
| Suspended Users     | Users suspended               |
| Locked Users        | Users locked                  |
| Users by Branch     | Distribution by branch        |
| Users by Role       | Distribution by role          |
| Failed Login Rate   | Failed / total logins         |
| Password Reset Rate | Reset requests / active users |

---

# 12. Distributed Tracing

## 12.1 Trace Requirements

Every API request must include:

```text
traceId
spanId
correlationId
```

Propagate:

```text
X-Correlation-ID
traceparent
```

---

## 12.2 Trace Example

```text
Frontend
  ↓
API Gateway
  ↓
IAM API
  ↓
Database
  ↓
Audit Log
  ↓
Notification Service
```

---

# 13. Health Checks

## 13.1 Liveness Check

```http
GET /health/live
```

Checks whether application process is running.

---

## 13.2 Readiness Check

```http
GET /health/ready
```

Checks:

* Database connectivity
* Redis connectivity
* JWT key availability
* Email provider availability, optional
* Migration state

---

## 13.3 Startup Check

```http
GET /health/startup
```

Checks application bootstrapping.

---

# 14. Alerting

## 14.1 Alert Rules

| Alert                    | Severity | Condition                                |
| ------------------------ | -------- | ---------------------------------------- |
| IAM Login Down           | P1       | Login success rate drops below threshold |
| High Failed Login Rate   | P2       | Failed login rate > configured limit     |
| Audit Log Failure        | P1       | Audit records not being written          |
| Redis Down               | P2       | Permission cache unavailable             |
| Database Down            | P1       | IAM DB unavailable                       |
| Email Failure            | P3       | Activation/reset emails failing          |
| High Auth Latency        | P2       | Login P95 > 1 second                     |
| Too Many Locked Accounts | P2       | Lockouts spike above baseline            |

---

# 15. Monitoring Dashboards

## 15.1 IAM Operations Dashboard

Widgets:

* Login success rate
* Login failure rate
* Active sessions
* Locked accounts
* Authentication latency P95/P99
* API error rate
* Audit event volume
* Redis health
* Database health
* Email provider status

---

## 15.2 Security Monitoring Dashboard

Widgets:

* Failed logins by IP
* Failed logins by user
* Permission denied events
* Account lockouts
* Password reset spikes
* Suspicious session patterns
* Branch access denial events

---

# 16. Backup and Restore

## 16.1 Backup Requirements

| Backup Type          | Frequency  | Retention |
| -------------------- | ---------- | --------- |
| Full Database Backup | Daily      | 30 days   |
| Incremental Backup   | Hourly     | 7 days    |
| WAL / PITR           | Continuous | 7 days    |
| Monthly Archive      | Monthly    | 1 year    |

---

## 16.2 Restore Testing

Restore tests should be performed:

```text
Monthly
```

Minimum validation:

* User table restored
* Role/permission mapping restored
* Audit logs restored
* Login works after restore
* Permission evaluation works after restore

---

# 17. Disaster Recovery

## 17.1 Recovery Targets

| Target | Value      |
| ------ | ---------- |
| RPO    | 15 minutes |
| RTO    | 1 hour     |

---

## 17.2 DR Procedure

1. Declare incident.
2. Freeze deployments.
3. Identify last good backup.
4. Restore database.
5. Restore secrets.
6. Start IAM services.
7. Run health checks.
8. Validate login.
9. Validate role and permission mapping.
10. Resume traffic.
11. Communicate recovery status.

---

# 18. Operational Runbooks

## 18.1 Runbook: User Locked Out

Steps:

1. Verify identity of requesting user.
2. Open User Management.
3. Review failed login history.
4. Confirm no suspicious activity.
5. Unlock account.
6. Force password reset if needed.
7. Record support note.
8. Notify user.

---

## 18.2 Runbook: Admin Account Compromised

Steps:

1. Disable compromised account immediately.
2. Terminate all sessions.
3. Rotate affected credentials.
4. Review audit logs.
5. Identify changed roles or permissions.
6. Revert unauthorized changes.
7. Notify management.
8. Create incident report.

---

## 18.3 Runbook: Email Provider Down

Steps:

1. Confirm provider status.
2. Queue activation/password reset emails.
3. Display warning to administrators.
4. Retry delivery every configured interval.
5. Switch provider if fallback is available.
6. Notify support team.

---

## 18.4 Runbook: Database Unavailable

Steps:

1. Trigger P1 incident.
2. Stop write operations.
3. Check database health.
4. Fail over to standby if required.
5. Restore connectivity.
6. Validate login.
7. Validate audit writes.
8. Close incident after monitoring.

---

## 18.5 Runbook: Permission Misconfiguration

Steps:

1. Identify affected role.
2. Export current role permissions.
3. Compare with previous version.
4. Revert incorrect permission changes.
5. Clear permission cache.
6. Validate user access.
7. Record audit and incident notes.

---

## 18.6 Runbook: JWT Key Rotation

Steps:

1. Generate new key pair.
2. Store private key securely.
3. Publish new public key.
4. Begin signing new tokens with new key.
5. Continue accepting old key until existing tokens expire.
6. Retire old key.
7. Monitor token validation errors.

---

# 19. Incident Management

## 19.1 Severity Levels

| Severity | Example                    | Response    |
| -------- | -------------------------- | ----------- |
| P1       | Users cannot log in        | Immediate   |
| P2       | Permission system degraded | 1 hour      |
| P3       | Email reset delayed        | 4 hours     |
| P4       | Minor dashboard issue      | Next sprint |

---

## 19.2 Incident Communication

Each incident should include:

* Summary
* Impact
* Start time
* Current status
* Next update time
* Owner
* Resolution
* Preventive action

---

# 20. CI/CD Requirements

Pipeline stages:

```text
Lint
Type Check
Unit Tests
Integration Tests
Security Scan
Build
Migration Dry Run
Deploy to Staging
Smoke Test
Approval
Deploy to Production
Post-Deploy Verification
```

---

# 21. Smoke Tests

After every deployment, verify:

* Login page loads.
* Valid login works.
* Invalid login fails.
* User list loads.
* Role list loads.
* Permission evaluation works.
* Branch switch works.
* Audit log is written.
* Logout works.

---

# 22. Rollback Strategy

Rollback triggers:

* Login failures spike.
* API error rate exceeds threshold.
* Database migration fails.
* Permission evaluation broken.
* Audit logging fails.

Rollback steps:

1. Stop traffic to new version.
2. Route traffic to previous stable version.
3. Roll back database if required.
4. Clear cache.
5. Validate login.
6. Notify stakeholders.

---

# 23. Production Readiness Checklist

## Deployment

* Environment variables configured
* Secrets configured
* Database migrations tested
* Rollback tested
* Health checks active

## Security

* HTTPS enabled
* Password hashing verified
* JWT keys configured
* Rate limiting enabled
* Secrets externalized

## Observability

* Logs visible
* Metrics visible
* Traces visible
* Alerts configured
* Dashboards configured

## Operations

* Runbooks approved
* Support team trained
* Escalation contacts defined
* Backup tested
* DR tested

---

# 24. Final IAM Module Completion Status

With Part 11 complete, the IAM SDS now covers:

* Business overview
* Functional requirements
* User stories
* Use cases
* Workflows
* State machines
* Screen specifications
* UI/UX requirements
* Database design
* CRUD matrix
* API contracts
* Authorization model
* Permission catalogue
* Validation rules
* Notifications
* Reports and dashboards
* BDD test scenarios
* Security architecture
* Non-functional requirements
* Deployment and operations
* Observability and runbooks

This makes IAM the reference module template for the rest of ASTI IMS.
