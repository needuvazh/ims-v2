# ASTI IMS Solution Design Specification (SDS)

# Module 01 – Identity & Access Management (IAM)

# Part 10

# Security Architecture and Non-Functional Requirements

**Version:** 3.0
**Status:** Draft

---

# 1. Purpose

This section defines the security architecture and non-functional requirements for the Identity & Access Management module.

The goal is to ensure the IAM module is:

* Secure
* Reliable
* Scalable
* Observable
* Auditable
* Maintainable
* Performant
* Compliant with enterprise-grade security standards

---

# 2. Security Architecture Overview

IAM is the central security gateway for ASTI IMS.

All modules depend on IAM for:

* Authentication
* Authorization
* Branch-level access
* Session validation
* Permission evaluation
* Security audit context

```text
Client Application
      ↓
HTTPS / TLS
      ↓
Authentication Middleware
      ↓
JWT Validation
      ↓
Session Validation
      ↓
User Status Check
      ↓
Branch Scope Validation
      ↓
Permission Evaluation
      ↓
Business Module Access
```

---

# 3. Security Principles

The IAM module follows these principles:

| Principle                  | Description                                          |
| -------------------------- | ---------------------------------------------------- |
| Zero Trust                 | Every request must be authenticated and authorized   |
| Least Privilege            | Users receive only the permissions needed            |
| Default Deny               | Access is denied unless explicitly allowed           |
| Defense in Depth           | Security is enforced at multiple layers              |
| Audit Everything Sensitive | All security-sensitive actions are logged            |
| No Hardcoded Roles         | Authorization depends on permissions, not role names |
| Secure by Default          | Strong security defaults are applied from day one    |

---

# 4. Authentication Security

## 4.1 Login Security

The system shall authenticate users using:

```text
Email + Password
```

Authentication must verify:

* User exists
* Account is active
* Account is not locked
* Password is valid
* User has at least one role
* User has at least one branch assignment

---

## 4.2 Password Storage

Passwords must never be stored in plain text or encrypted form.

They must be stored as strong one-way hashes.

Recommended:

```text
Argon2id
```

Fallback:

```text
bcrypt
```

Disallowed:

```text
MD5
SHA1
SHA256 plain hash
Base64 encoding
Reversible encryption
```

---

## 4.3 Password Policy

Default password policy:

| Rule               | Value             |
| ------------------ | ----------------- |
| Minimum length     | 12 characters     |
| Maximum length     | 128 characters    |
| Uppercase          | Required          |
| Lowercase          | Required          |
| Number             | Required          |
| Special character  | Required          |
| Password history   | Last 10 passwords |
| Expiry             | 90 days           |
| Reset token expiry | 15 minutes        |

All values must be configurable.

---

## 4.4 Account Lockout Policy

Default:

| Rule            | Value      |
| --------------- | ---------- |
| Failed attempts | 5          |
| Lock duration   | 30 minutes |
| Notify admin    | Yes        |
| Audit event     | Required   |

The system should avoid exposing whether the email exists during login failure.

Use generic error:

```text
Invalid credentials.
```

---

# 5. Token and Session Security

## 5.1 Access Token

| Property   | Requirement                  |
| ---------- | ---------------------------- |
| Token type | JWT                          |
| Algorithm  | RS256                        |
| Lifetime   | 15 minutes                   |
| Transport  | HTTPS only                   |
| Storage    | Memory preferred             |
| Revocation | Through session invalidation |

---

## 5.2 Refresh Token

| Property                      | Requirement              |
| ----------------------------- | ------------------------ |
| Lifetime                      | 7 days                   |
| Rotation                      | Required                 |
| Reuse detection               | Required                 |
| Storage                       | Server-side hashed token |
| Invalidated on logout         | Yes                      |
| Invalidated on password reset | Yes                      |

---

## 5.3 Session Management

The system shall maintain server-side session records.

Session record should track:

* User
* Device
* Browser
* IP address
* Login time
* Last activity time
* Expiry time
* Status

Default session timeout:

```text
30 minutes inactivity
```

Maximum concurrent sessions:

```text
3 active sessions per user
```

Configurable.

---

# 6. Authorization Security

## 6.1 Permission-Based Authorization

Business logic must never check hardcoded role names.

Incorrect:

```text
if user.role == "Admin"
```

Correct:

```text
hasPermission("iam.user.create")
```

---

## 6.2 Authorization Layers

Every protected request must pass:

```text
Authentication
↓
User status validation
↓
Session validation
↓
Permission validation
↓
Branch scope validation
↓
Resource ownership validation
↓
Business rule validation
```

---

## 6.3 Branch-Level Data Security

Every business query must be scoped by branch access.

Rules:

* User can access only assigned branches.
* User can switch active branch only among assigned branches.
* Parent branch users can view child branches only if allowed.
* Child branch users cannot view parent branch data unless explicitly assigned.
* Reports and dashboards must apply the same branch rules.

---

## 6.4 Permission Cache

Effective permissions may be cached for performance.

Cache must be invalidated when:

* Role changes
* Permission changes
* User role assignment changes
* Branch assignment changes
* User is suspended
* User is archived

---

# 7. API Security

## 7.1 Required Security Controls

All protected APIs must enforce:

* HTTPS
* JWT validation
* Permission checks
* Branch scope checks
* Input validation
* Rate limiting
* Audit logging for sensitive actions

---

## 7.2 Rate Limiting

Recommended default limits:

| Endpoint Type   | Limit                  |
| --------------- | ---------------------- |
| Login           | 10 requests/min/IP     |
| Forgot password | 5 requests/hour/email  |
| Refresh token   | 60 requests/min/user   |
| Search APIs     | 300 requests/min/token |
| Export APIs     | 10 requests/hour/user  |

---

## 7.3 API Error Disclosure

Security-sensitive errors must be generic.

Example:

```text
Invalid credentials.
```

Avoid:

```text
Email not found.
Password incorrect.
User exists.
```

---

# 8. Data Security

## 8.1 Encryption in Transit

All communication must use:

```text
TLS 1.2+
```

Recommended:

```text
TLS 1.3
```

---

## 8.2 Encryption at Rest

Encryption at rest is required for:

* Database storage
* File storage
* Backup storage
* Logs containing sensitive metadata

---

## 8.3 Sensitive Data Masking

Mask sensitive values in UI and logs.

Examples:

```text
Email: j***@asti.om
Phone: +968******00
Civil ID: ********1234
```

---

## 8.4 Logging Restrictions

Never log:

* Passwords
* Password reset tokens
* JWT access tokens
* Refresh tokens
* API keys
* SMTP passwords
* Private keys

---

# 9. Secrets Management

Secrets must not be stored in:

* Source code
* Git repository
* Docker image
* Client-side environment variables
* Plain text configuration files

Recommended secret stores:

* Cloud secret manager
* Vault
* Encrypted Kubernetes secrets
* Secure CI/CD secret vault

Secrets include:

* Database password
* JWT private keys
* SMTP credentials
* SMS API keys
* WhatsApp API keys
* Payment gateway keys
* Tally integration credentials

---

# 10. OWASP Security Requirements

The IAM module must address the OWASP Top 10 risks.

| Risk                             | Control                                  |
| -------------------------------- | ---------------------------------------- |
| Broken Access Control            | Permission + branch validation           |
| Cryptographic Failures           | TLS, hashing, encryption                 |
| Injection                        | Parameterized queries, validation        |
| Insecure Design                  | Secure-by-default patterns               |
| Security Misconfiguration        | Hardened deployment                      |
| Vulnerable Components            | Dependency scanning                      |
| Identification/Auth Failures     | Password policy, lockout, token rotation |
| Software/Data Integrity Failures | CI/CD signing and audit                  |
| Logging/Monitoring Failures      | Security event logs and alerts           |
| SSRF                             | Network egress restrictions              |

---

# 11. Frontend Security

The admin portal must implement:

* Route guards
* Permission-based menu rendering
* Secure token handling
* No sensitive data in localStorage where avoidable
* CSRF protection if cookies are used
* XSS protection
* Content Security Policy
* Secure headers
* Auto logout on inactivity
* Warning before session expiry

---

# 12. Audit and Compliance

Security-sensitive operations must generate audit logs.

Examples:

* Login success
* Login failure
* Logout
* Password reset
* Password change
* Account locked
* User created
* User suspended
* User archived
* Role assigned
* Permission changed
* Branch access changed
* Security policy changed

Audit log must capture:

```text
who
what
when
where
old value
new value
ip address
user agent
correlation id
reason
```

Audit logs must be append-only and not editable by normal application users.

---

# 13. Non-Functional Requirements

## 13.1 Performance Requirements

| Operation              |       Target |
| ---------------------- | -----------: |
| Login                  | < 500 ms P95 |
| Token refresh          | < 200 ms P95 |
| Permission evaluation  |  < 50 ms P95 |
| User search            | < 700 ms P95 |
| User details           | < 300 ms P95 |
| Create user            | < 800 ms P95 |
| Role assignment        | < 500 ms P95 |
| Dashboard initial load |  < 2 sec P95 |
| Report export 10k rows |     < 30 sec |

---

## 13.2 Scalability Requirements

IAM must support initially:

| Metric           |  Target |
| ---------------- | ------: |
| Total users      |    500+ |
| Concurrent users |    100+ |
| Roles            |    100+ |
| Permissions      |    500+ |
| Active sessions  |    300+ |
| Login events/day |  5,000+ |
| Audit events/day | 50,000+ |

Future scalability target:

| Metric           |   Target |
| ---------------- | -------: |
| Total users      |  10,000+ |
| Concurrent users |   1,000+ |
| Permissions      |   1,000+ |
| Audit events/day | 500,000+ |

---

## 13.3 Availability Requirements

| Requirement        | Target                 |
| ------------------ | ---------------------- |
| IAM availability   | 99.9%                  |
| Planned downtime   | Outside business hours |
| Health checks      | Required               |
| Graceful shutdown  | Required               |
| Rolling deployment | Required               |

---

## 13.4 Reliability Requirements

The system must:

* Recover cleanly after restart.
* Not lose audit events.
* Not issue duplicate active refresh tokens after rotation.
* Invalidate sessions reliably.
* Keep login functional during normal traffic spikes.
* Fail safely by denying access if authorization state is unavailable.

---

## 13.5 Maintainability Requirements

The IAM codebase must support:

* Modular service structure
* Reusable permission middleware
* Centralized validation rules
* Centralized error handling
* Testable business logic
* OpenAPI documentation
* Clear audit event contracts

---

## 13.6 Observability Requirements

IAM must expose:

* Structured logs
* Metrics
* Distributed traces
* Audit events
* Health checks
* Security alerts

Required metrics:

```text
iam_login_total
iam_login_failed_total
iam_account_locked_total
iam_permission_denied_total
iam_active_sessions
iam_auth_latency_ms
iam_api_errors_total
```

---

## 13.7 Localization Requirements

IAM must support:

* English UI
* Arabic UI
* RTL layout
* Localized validation messages
* Localized notification templates
* Unicode-safe storage
* Arabic search/display support where applicable

---

## 13.8 Accessibility Requirements

Admin portal must support:

* Keyboard navigation
* Screen reader labels
* Visible focus states
* Logical tab order
* Form error association
* Sufficient color contrast
* RTL accessibility support

Target:

```text
WCAG 2.2 AA
```

---

## 13.9 Backup and Disaster Recovery

| Requirement        | Target     |
| ------------------ | ---------- |
| RPO                | 15 minutes |
| RTO                | 1 hour     |
| Full backup        | Daily      |
| Incremental backup | Hourly     |
| PITR               | Required   |
| Restore test       | Monthly    |

---

## 13.10 Data Retention

| Data                    | Retention            |
| ----------------------- | -------------------- |
| User account            | Permanent / archived |
| Login history           | 7 years              |
| Audit logs              | 7 years minimum      |
| Password history        | Last 10 passwords    |
| Expired sessions        | 90 days              |
| Security policy history | Permanent            |

---

# 14. Security Testing Requirements

IAM must pass:

* Static Application Security Testing
* Dependency vulnerability scanning
* API security testing
* Penetration testing
* OWASP Top 10 testing
* JWT tampering tests
* Brute force tests
* Branch bypass tests
* Permission escalation tests
* Session fixation tests

---

# 15. Compliance Checklist

Before production:

* HTTPS enabled
* Password hashing verified
* JWT signing key rotation tested
* Refresh token rotation tested
* Rate limiting enabled
* Audit logs immutable
* Secrets externalized
* Security headers configured
* Permission middleware tested
* Branch scoping tested
* Backup and restore tested
* Arabic RTL verified
* Accessibility verified

---

# 16. Key Architecture Decisions

| ADR         | Decision                                         |
| ----------- | ------------------------------------------------ |
| IAM-ADR-001 | Use JWT access token with refresh token rotation |
| IAM-ADR-002 | Use dynamic permission-based authorization       |
| IAM-ADR-003 | Use branch-scoped access model                   |
| IAM-ADR-004 | Use soft delete/archive for users                |
| IAM-ADR-005 | Use immutable audit logs                         |
| IAM-ADR-006 | Use localized resource bundles for EN/AR         |
| IAM-ADR-007 | Use structured logging and OpenTelemetry         |

---

# Deliverables of Part 10

This part defines:

* IAM security architecture
* Authentication security rules
* Token and session security
* Permission and branch security
* API security
* Data security
* Secrets management
* OWASP controls
* Audit and compliance rules
* Performance NFRs
* Scalability NFRs
* Availability NFRs
* Localization and accessibility NFRs
* DR and backup targets
* Security testing requirements
* Production compliance checklist
