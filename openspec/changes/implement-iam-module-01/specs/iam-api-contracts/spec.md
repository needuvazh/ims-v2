## ADDED Requirements

### Requirement: IAM REST API Contract
The system SHALL expose IAM REST APIs under `/api/v1` using JSON, stable success envelopes, RFC7807 error responses, Zod validation, authentication, permission checks, branch checks, and application-service delegation.

#### Scenario: Protected endpoint request succeeds
- **WHEN** a protected IAM API receives a valid access token, active session, required permission, valid branch context, and valid request body
- **THEN** the route handler SHALL call one IAM application service and return the documented success envelope

#### Scenario: Protected endpoint request fails authorization
- **WHEN** a protected IAM API request lacks the required permission or branch access
- **THEN** the API SHALL return RFC7807 with `IAM-AUTHZ-001` or `IAM-AUTHZ-002` and SHALL NOT mutate data

### Requirement: IAM Error Mapping
The system SHALL map IAM validation, authentication, authorization, and system errors to stable error codes and HTTP statuses.

#### Scenario: Duplicate email API error
- **WHEN** user creation is submitted with an existing email
- **THEN** the API SHALL return HTTP 400 RFC7807 with `IAM-VAL-001`

#### Scenario: Invalid login API error
- **WHEN** login is submitted with invalid credentials
- **THEN** the API SHALL return HTTP 401 RFC7807 with `IAM-AUTH-001` and generic detail `Invalid credentials.`

### Requirement: API Pagination Filtering Sorting
The system SHALL support documented pagination, filtering, and sorting standards on IAM list APIs.

#### Scenario: User search is filtered by branch
- **WHEN** a caller searches users with pagination and branch filters
- **THEN** the system SHALL return only users visible within the caller's branch scope and include pagination metadata

### Requirement: Standard API Headers and Localization
The system SHALL support the standard IAM request headers and localized response content used by the approved contract.

#### Scenario: Localized request is handled consistently
- **WHEN** an IAM API receives `Accept-Language: en` or `Accept-Language: ar`
- **THEN** the route handler SHALL preserve correlation headers, honor branch headers, and return localized validation/error messaging where available

### Requirement: OpenAPI Publication
The system SHALL publish the IAM `/api/v1` contract as OpenAPI 3.1 so implementation, review, and tests share the same source of truth.

#### Scenario: OpenAPI document is generated
- **WHEN** the IAM API contract is updated
- **THEN** the OpenAPI document SHALL be updated with the same routes, schemas, permissions, and error codes

### Requirement: IAM Endpoint Inventory and Contract Matrix
The system SHALL publish a complete IAM endpoint inventory and contract matrix that lists the HTTP method, route, permission, branch-scoping rule, response shape, and primary success/error contract for every Phase 1 IAM endpoint.

#### Scenario: Contract matrix is available for implementation and review
- **WHEN** the IAM module proposal is reviewed or implementation begins
- **THEN** the endpoint inventory SHALL include auth, user, role, permission, branch, session, security-policy, audit, report, dashboard, and health routes under `/api/v1` and `/health`

### Requirement: Standard IAM Contract Surface
The endpoint inventory SHALL cover at minimum the following routes:

| Method | Route | Permission | Notes |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/login` | Public | Supports `rememberMe` within session policy |
| POST | `/api/v1/auth/refresh` | Public | Refresh-token rotation and reuse detection |
| POST | `/api/v1/auth/logout` | Authenticated | Terminates the active session |
| POST | `/api/v1/auth/forgot-password` | Public | Generic success, no enumeration |
| POST | `/api/v1/auth/reset-password` | Public | Token-based password reset |
| POST | `/api/v1/auth/change-password` | Authenticated | Current password required |
| POST | `/api/v1/auth/activate-account` | Public | Self-service activation token flow |
| POST | `/api/v1/users/:id/resend-activation` | `iam.user.activate` | Admin fallback for activation delivery |
| GET | `/api/v1/users` | `iam.user.read` | Branch-scoped pagination/filtering |
| POST | `/api/v1/users` | `iam.user.create` | Creates `Person` + `User` |
| GET | `/api/v1/users/:id` | `iam.user.read` | Branch-scoped detail view |
| PUT | `/api/v1/users/:id` | `iam.user.update` | Branch-scoped update |
| POST | `/api/v1/users/:id/activate` | `iam.user.activate` | Admin activation |
| POST | `/api/v1/users/:id/suspend` | `iam.user.suspend` | Suspends user and sessions |
| POST | `/api/v1/users/:id/archive` | `iam.user.archive` | Logical archive |
| POST | `/api/v1/users/:id/unlock` | `iam.user.unlock` | Unlocks a locked user |
| POST | `/api/v1/users/:id/reset-password` | `iam.user.reset-password` | Admin reset |
| GET | `/api/v1/users/:id/roles` | `iam.user.read` | Role assignments |
| POST | `/api/v1/users/:id/roles` | `iam.user.assign-role` | Adds role assignment |
| DELETE | `/api/v1/users/:id/roles/:roleId` | `iam.user.assign-role` | Revokes role assignment |
| GET | `/api/v1/users/:id/branches` | `iam.user.read` | Branch assignments |
| POST | `/api/v1/users/:id/branches` | `iam.user.assign-branch` | Adds branch access |
| DELETE | `/api/v1/users/:id/branches/:branchId` | `iam.user.assign-branch` | Revokes branch access |
| PUT | `/api/v1/users/:id/branches/default` | `iam.user.assign-branch` | Sets default branch |
| GET | `/api/v1/users/:id/sessions` | `iam.session.read` | Active sessions |
| DELETE | `/api/v1/sessions/:sessionId` | `iam.session.terminate` | Terminate one session |
| DELETE | `/api/v1/users/:id/sessions` | `iam.session.terminate` | Terminate all sessions |
| GET | `/api/v1/roles` | `iam.role.read` | Role list |
| POST | `/api/v1/roles` | `iam.role.create` | Create role |
| GET | `/api/v1/roles/:id` | `iam.role.read` | Role details |
| PUT | `/api/v1/roles/:id` | `iam.role.update` | Update role |
| POST | `/api/v1/roles/:id/archive` | `iam.role.archive` | System-role guard |
| GET | `/api/v1/roles/:id/permissions` | `iam.role.read` | Role permissions |
| POST | `/api/v1/roles/:id/permissions` | `iam.role.permission.assign` | Assign permission |
| DELETE | `/api/v1/roles/:id/permissions/:permissionId` | `iam.role.permission.assign` | Remove permission |
| GET | `/api/v1/roles/:id/users` | `iam.role.read` | Users in role |
| GET | `/api/v1/permissions` | `iam.permission.read` | Permission list |
| POST | `/api/v1/permissions` | `iam.permission.create` | Create permission |
| GET | `/api/v1/permissions/:id` | `iam.permission.read` | Permission details |
| PUT | `/api/v1/permissions/:id` | `iam.permission.update` | Update permission |
| POST | `/api/v1/permissions/:id/archive` | `iam.permission.archive` | Archive permission |
| GET | `/api/v1/security/policy` | `iam.security-policy.read` | Security policy read |
| PUT | `/api/v1/security/policy` | `iam.security-policy.update` | Security policy update |
| GET | `/api/v1/security/login-history` | `iam.audit.read` | Security view |
| GET | `/api/v1/users/:id/login-history` | `iam.user.read` | Per-user login history |
| GET | `/api/v1/audit` | `iam.audit.read` | Branch-scoped audit trail |
| GET | `/api/v1/audit/:id` | `iam.audit.read` | Audit detail |
| POST | `/api/v1/audit/export` | `iam.audit.read` + export | Export job |
| GET | `/api/v1/reports/iam/*` | report permissions | Report endpoints are branch-scoped |
| POST | `/api/v1/reports/iam/*/export` | report + export | Export endpoints are branch-scoped |
| GET | `/api/v1/dashboards/iam/*` | dashboard permissions | KPI dashboards |
| GET | `/health/live` | Public | Liveness |
| GET | `/health/ready` | Public | Readiness |
| GET | `/health/startup` | Public | Startup |
| GET | `/health/metrics` | Internal | Metric scraping |
