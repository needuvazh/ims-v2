# ASTI IMS Solution Design Specification (SDS)

# Module 01 – Identity & Access Management (IAM)

# Part 5

# REST API Specification

# Integration Contract

**Version:** 3.0

---

# 1. API Design Principles

The IAM APIs shall follow consistent RESTful principles across the entire ASTI IMS platform.

## Standards

* REST API
* JSON payloads
* HTTPS only
* JWT Authentication
* OAuth2-ready architecture
* Versioned APIs
* OpenAPI 3.1 specification
* RFC7807 Problem Details for error responses
* Idempotent operations where applicable

---

# 2. API Base URL

```text
Production

https://ims.alsaud.com/api/v1

Development

http://localhost:8080/api/v1
```

Future versions:

```text
/api/v2
/api/v3
```

Older versions remain supported during the deprecation window.

---

# 3. Authentication Flow

```text
Login

↓

Validate Credentials

↓

Issue JWT Access Token

↓

Issue Refresh Token

↓

Access Protected APIs

↓

Access Token Expired

↓

Refresh Token

↓

Issue New Access Token
```

---

# 4. Standard HTTP Headers

## Request

```http
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
Accept-Language: en
X-Correlation-Id: 3a3d9c0d...
X-Request-Id: 7e25...
X-Branch-Id: BR001
```

### Notes

* **Accept-Language** controls localized responses (`en`, `ar`).
* **X-Correlation-Id** is propagated across services for tracing.
* **X-Branch-Id** indicates the active branch context for users assigned to multiple branches.

---

# 5. Standard Response Envelope

Every successful API should return a consistent envelope.

```json
{
  "success": true,
  "message": "User created successfully.",
  "data": {
    ...
  },
  "meta": {
    "timestamp": "2026-06-29T10:30:00Z",
    "requestId": "7e25...",
    "correlationId": "3a3d9c0d..."
  }
}
```

---

# 6. Error Response (RFC7807)

```json
{
  "type": "https://ims.alsaud.com/errors/validation",
  "title": "Validation Failed",
  "status": 400,
  "detail": "Email address already exists.",
  "instance": "/api/v1/users",
  "errorCode": "IAM-VAL-001",
  "traceId": "3a3d9c0d..."
}
```

---

# 7. Authentication APIs

## 7.1 Login

### Endpoint

```http
POST /api/v1/auth/login
```

### Request

```json
{
  "email": "admin@asti.om",
  "password": "********"
}
```

### Success

```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 900,
    "user": {
      "id": "...",
      "displayName": "System Administrator",
      "defaultBranch": "Muscat"
    }
  }
}
```

### Business Rules

* Email must exist.
* Account must be active.
* Account must not be locked.
* Password must be valid.
* User must have at least one role.
* User must have at least one active branch.

---

## 7.2 Refresh Token

```http
POST /api/v1/auth/refresh
```

---

## 7.3 Logout

```http
POST /api/v1/auth/logout
```

---

## 7.4 Forgot Password

```http
POST /api/v1/auth/forgot-password
```

---

## 7.5 Reset Password

```http
POST /api/v1/auth/reset-password
```

---

## 7.6 Change Password

```http
POST /api/v1/auth/change-password
```

---

# 8. User APIs

---

## 8.1 Search Users

```http
GET /api/v1/users
```

### Query Parameters

```text
page
size
sort
search
status
roleId
branchId
departmentId
```

Example

```http
GET /users?page=1&size=20&status=ACTIVE
```

---

## 8.2 Get User

```http
GET /api/v1/users/{id}
```

---

## 8.3 Create User

```http
POST /api/v1/users
```

### Request

```json
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john@asti.om",
  "mobile": "+96890000000",
  "branchIds": [
    "branch-1"
  ],
  "roleIds": [
    "role-admin"
  ]
}
```

### Response

```http
201 Created
```

---

## 8.4 Update User

```http
PUT /api/v1/users/{id}
```

---

## 8.5 Archive User

```http
DELETE /api/v1/users/{id}
```

This performs a **logical archive**, not a physical delete.

---

## 8.6 Activate User

```http
POST /api/v1/users/{id}/activate
```

---

## 8.7 Suspend User

```http
POST /api/v1/users/{id}/suspend
```

---

## 8.8 Unlock User

```http
POST /api/v1/users/{id}/unlock
```

---

## 8.9 Reset Password (Admin)

```http
POST /api/v1/users/{id}/reset-password
```

---

# 9. Role APIs

---

## Search Roles

```http
GET /api/v1/roles
```

---

## Create Role

```http
POST /api/v1/roles
```

---

## Update Role

```http
PUT /api/v1/roles/{id}
```

---

## Archive Role

```http
DELETE /api/v1/roles/{id}
```

---

## Assign Permissions

```http
PUT /api/v1/roles/{id}/permissions
```

---

## Users in Role

```http
GET /api/v1/roles/{id}/users
```

---

# 10. Permission APIs

```http
GET /permissions

GET /permissions/{id}

POST /permissions

PUT /permissions/{id}

DELETE /permissions/{id}
```

---

# 11. Branch Access APIs

## Assign Branch

```http
PUT /users/{id}/branches
```

---

## Active Branch

```http
POST /auth/switch-branch
```

Request

```json
{
  "branchId": "branch-2"
}
```

Response

Returns updated JWT claims and active branch context.

---

# 12. Session APIs

## Active Sessions

```http
GET /users/{id}/sessions
```

---

## Terminate Session

```http
DELETE /sessions/{sessionId}
```

---

## Terminate All Sessions

```http
DELETE /users/{id}/sessions
```

---

# 13. Security Policy APIs

```http
GET /security/password-policy

PUT /security/password-policy

GET /security/session-policy

PUT /security/session-policy
```

---

# 14. Audit APIs

```http
GET /audit

GET /audit/{id}

GET /audit/export
```

---

# 15. Pagination Standard

Every list endpoint uses:

```http
?page=1
&size=20
&sort=createdAt,desc
```

Response

```json
{
  "data": [],
  "page": 1,
  "size": 20,
  "totalElements": 234,
  "totalPages": 12
}
```

---

# 16. Filtering Standard

Examples

```http
/users?status=ACTIVE

/users?branchId=123

/users?roleId=finance

/users?search=john
```

Multiple filters supported.

---

# 17. Sorting Standard

```http
?sort=name,asc

?sort=createdAt,desc

?sort=email,asc
```

Multiple sort fields allowed.

---

# 18. API Versioning

Current

```text
/api/v1
```

Future

```text
/api/v2
```

Breaking changes require a new version. Non-breaking additions (e.g., optional fields) remain within the same version.

---

# 19. Idempotency Rules

| Operation           | Idempotent |
| ------------------- | ---------- |
| GET                 | Yes        |
| PUT                 | Yes        |
| DELETE (Archive)    | Yes        |
| POST Create         | No         |
| POST Login          | No         |
| POST Reset Password | No         |

For sensitive create operations (future integrations), support an **Idempotency-Key** header to prevent duplicate requests.

---

# 20. Rate Limiting

| API             | Limit                  |
| --------------- | ---------------------- |
| Login           | 10 requests/min/IP     |
| Forgot Password | 5 requests/hour/email  |
| Refresh Token   | 60 requests/min/user   |
| Search APIs     | 300 requests/min/token |

Exceeding limits returns:

```http
429 Too Many Requests
```

with retry information.

---

# 21. API Security

Every protected API validates:

1. JWT signature
2. Token expiration
3. User status
4. Branch assignment
5. Required permission
6. Resource ownership (where applicable)

Example permission mapping:

| Endpoint                    | Required Permission        |
| --------------------------- | -------------------------- |
| POST /users                 | iam.user.create            |
| PUT /users/{id}             | iam.user.update            |
| DELETE /users/{id}          | iam.user.archive           |
| POST /roles                 | iam.role.create            |
| PUT /roles/{id}/permissions | iam.role.permission.assign |
| GET /audit                  | iam.audit.read             |

---

# 22. API Events

The IAM module publishes domain events for downstream consumers.

| Event           | Trigger                |
| --------------- | ---------------------- |
| UserCreated     | User account created   |
| UserActivated   | User activated         |
| UserSuspended   | User suspended         |
| UserArchived    | User archived          |
| PasswordChanged | Password updated       |
| RoleAssigned    | Role assigned to user  |
| RoleRemoved     | Role removed from user |
| BranchAssigned  | Branch access granted  |
| BranchRevoked   | Branch access revoked  |
| LoginSucceeded  | Successful login       |
| LoginFailed     | Failed login           |
| AccountLocked   | Account locked         |

These events can later be consumed by Notification, Audit, Analytics, or HR modules.

---

# 23. API Performance Targets

| Operation             | Target (P95) |
| --------------------- | -----------: |
| Login                 |     < 500 ms |
| Token Refresh         |     < 200 ms |
| User Search           |     < 700 ms |
| User Details          |     < 300 ms |
| Create User           |     < 800 ms |
| Role Assignment       |     < 500 ms |
| Permission Assignment |     < 500 ms |

---

# 24. API Documentation Requirements

Every endpoint must include:

* OpenAPI 3.1 definition
* Request schema
* Response schema
* Validation constraints
* Example requests/responses
* Required permissions
* Error codes
* Rate limits
* Audit behavior
* Domain events raised

---

# Deliverables of Part 5

The IAM specification now defines:

* Enterprise REST API standards
* Authentication contract
* CRUD APIs for users, roles, permissions, sessions, and security policies
* Request/response conventions
* Pagination, filtering, and sorting standards
* API versioning and idempotency rules
* Rate limiting strategy
* Security enforcement model
* Domain event publication
* Performance targets
* Documentation requirements

## Recommended Improvements

Since we're designing this as an **enterprise-grade system**, I recommend two enhancements that will benefit every module:

1. **Adopt JSON:API or a consistent response contract** across the entire IMS. This avoids inconsistencies as more modules are added.
2. **Introduce a Command/Query separation** in the API design. For example:

   * Commands: `POST /users`, `PUT /users/{id}`, `POST /users/{id}/activate`
   * Queries: `GET /users`, `GET /users/{id}`, `GET /users/{id}/sessions`

This aligns well with your DDD architecture and will make future evolution toward CQRS (if needed) much smoother without forcing that complexity into the initial implementation.
