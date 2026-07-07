# Part 6 – Permission Matrix

## Module 13 – Document Management

## 1. Purpose

This document defines the authorization model for Module 13 – Document Management. It maps business roles to fine-grained permissions while preserving the ASTI IMS requirement for dynamic RBAC, server-side branch isolation, permission-based menu access, and permission-based reporting access.

Role names in this document are **business role bundles**, not hardcoded authorization rules. The Identity & Access Management context owns users, roles, permissions, role-permission assignments, user-role assignments, and branch access. Document Management only declares and consumes permission codes required to invoke its application services and read models.

The matrix is divided into:

1. Action-level permissions;
2. Menu-level permissions;
3. Report-level permissions;
4. Business-role bundles;
5. Branch/global/consolidated scope rules;
6. State and ownership constraints that remain mandatory even when a permission is granted.

---

# 2. Authorization Principles

1. Roles must remain configurable through IAM and must not be hardcoded into route handlers, Server Actions, React components, repositories, or SQL predicates.
2. A granted permission provides a capability, not unrestricted data access.
3. Every document access decision requires both permission evaluation and server-side owner-derived scope evaluation.
4. Menu visibility is not authorization.
5. Hidden UI controls are a usability measure only; every API and Server Action must enforce authorization again.
6. Direct-ID requests must apply the same branch and owner scope checks as list queries.
7. File preview/download requires a dedicated file-read permission and the same owner-derived scope check as metadata access.
8. Approval and rejection are separate capabilities.
9. Verification queue access does not imply approval or rejection rights.
10. Report permissions do not imply transaction-screen access.
11. Consolidated reports require both an explicit consolidated-report permission and IAM `canViewConsolidated = true`.
12. Parent/child branch visibility depends on IAM branch assignments and `canViewChildBranches`; it must not be inferred from job title.
13. Global operational permissions are exceptional and must be explicitly assigned.
14. Soft-deleted documents are excluded from normal operational access unless a dedicated administrative or audit use case explicitly allows access.
15. Person-owned documents fail closed where branch scope cannot be deterministically resolved.

---

# 3. Scope Classification Legend

| Code | Scope Type | Meaning |
|---|---|---|
| **B** | Branch-scoped | Permission applies only to records whose resolved owner scope intersects the user's effective IAM branch scope. |
| **B+** | Branch hierarchy scoped | Branch-scoped, with child branches included only when IAM grants `canViewChildBranches`. |
| **G** | Global | Permission may operate across all branches and owners, but only when explicitly assigned by IAM policy. This is exceptional. |
| **C** | Consolidated-report only | Read-only multi-branch reporting scope. Requires report permission plus IAM `canViewConsolidated = true`. No mutation rights are implied. |
| **SELF** | Identity-bound self-service | Access only to documents belonging to the authenticated Student or Trainer identity. Future/conditional portal scope. |
| **SYS** | System service scope | Non-human service operation. Must use a trusted server-side application service identity and remain limited to the declared job purpose. |

---

# 4. Canonical Permission Catalog

## 4.1 Action-Level Permissions

| Permission Code | Scope | Purpose | Primary Application Service / API Mapping |
|---|---|---|---|
| `document.read` | B/B+ | Read document metadata, registry entries, and document detail within authorized owner scope. | List documents; get document detail. |
| `document.create` | B/B+ | Initiate controlled upload and register document metadata for an authorized owner. | Upload intent; register document. |
| `document.update` | B/B+ | Edit permitted document metadata subject to lifecycle and optimistic-lock rules. | Update metadata. |
| `document.verify.submit` | B/B+ | Submit an eligible document for verification. | Submit for verification. |
| `document.verify.read` | B/B+ | Read pending-verification work queues and verification review context. | Verification queue. |
| `document.verify.approve` | B/B+ or explicit G | Approve a `PendingVerification` document. | Approve document. |
| `document.verify.reject` | B/B+ or explicit G | Reject a `PendingVerification` document with required remarks. | Reject document. |
| `document.history.read` | B/B+ | Read immutable verification history for an authorized document. | Verification history endpoint. |
| `document.file.read` | B/B+ | Request controlled preview/download access for the document file. | File-access endpoint. |
| `document.expiry.read` | B/B+ | Read expired and expiring-soon operational work queues. | Expiry workbench endpoint. |
| `document.retire` | B/B+ or explicit G | Soft-retire a document through the approved command. Never hard delete. | Retire document. |
| `document.operations.reconcile` | G or SYS | Read and retry approved Blob/database reconciliation operations. | Reconciliation list and retry. |
| `document.owner.search` | B/B+ | Search eligible document owners through owning-context read adapters. | Owner search endpoint. |
| `document.audit.read` | B/B+/C subject to Audit policy | Read document-related audit evidence exposed through the Audit & Compliance boundary. | Audit/history screen integration. |

### Canonical naming decision

Earlier draft material used both `document.submit_verification` and `document.verify.submit`. This Part standardizes the canonical code as:

```text
document.verify.submit
```

The legacy alias `document.submit_verification` must not be seeded as a second independent permission. Existing draft references should be normalized during implementation traceability review.

---

## 4.2 Menu-Level Permissions

| Permission Code | Scope | Navigation / Screen Access |
|---|---|---|
| `document.menu.view` | B/B+/G | Show the Document Management module entry in Admin navigation. |
| `document.menu.registry` | B/B+/G | Show Document Registry route. |
| `document.menu.upload` | B/B+/G | Show Upload Document route. |
| `document.menu.verification` | B/B+/G | Show Verification Queue route. |
| `document.menu.expiry` | B/B+/G | Show Expiry Workbench route. |
| `document.menu.operations` | G | Show restricted Blob Reconciliation operations route. |
| `document.menu.reports` | B/B+/C/G | Show Document Reports navigation group. |
| `document.menu.audit` | B/B+/C/G subject to Audit policy | Show Document Audit/History route where the user also has the underlying audit/history read capability. |

### Menu implication rules

1. `document.menu.view` alone provides no data access.
2. A route should appear only when the user has both the relevant menu permission and at least one meaningful underlying action/report capability.
3. Direct navigation to a hidden route must still be rejected server-side when authorization fails.
4. `document.menu.operations` must never be granted solely because a user is a branch manager or document administrator.

---

## 4.3 Report-Level Permissions

| Permission Code | Scope | Report / Analytics Capability |
|---|---|---|
| `document.report.operational.view` | B/B+ | View branch-scoped operational document summary. |
| `document.report.verification.view` | B/B+ | View verification throughput, backlog, approval, rejection, and turnaround metrics. |
| `document.report.expiry.view` | B/B+ | View expiry and expiring-soon reports. |
| `document.report.compliance.view` | B/B+ | View document compliance coverage and status distribution within authorized scope. |
| `document.report.owner.view` | B/B+ | View owner-type/document-type coverage reports. |
| `document.report.export` | B/B+ | Export an already-authorized branch-scoped report result. Does not independently grant report visibility. |
| `document.report.consolidated` | C | View approved consolidated multi-branch Document Management reports. Requires IAM `canViewConsolidated`. |
| `document.report.consolidated.export` | C | Export an already-authorized consolidated report result. Requires both consolidated view access and IAM consolidated scope. |
| `document.report.audit.view` | B/B+/C subject to Audit policy | View audit-oriented document reports through approved Audit/Reporting read models. |

### Report permission composition

A user requesting a consolidated verification report must satisfy all of the following:

```text
document.menu.reports
AND document.report.verification.view
AND document.report.consolidated
AND IAM.canViewConsolidated = true
```

Export additionally requires:

```text
document.report.consolidated.export
```

A consolidated report permission never allows update, approval, rejection, retirement, file access, or direct transaction-screen access.

---

# 5. Business Roles

The following roles represent expected ASTI business responsibilities. IAM may use different role names or compose equivalent permissions dynamically.

| Role | Business Responsibility |
|---|---|
| System Administrator | Configures IAM access and platform operations. Does not automatically receive unrestricted document business access. |
| Document Administrator | Manages document registration, metadata, operational queues, and permitted retirement actions. |
| Admission Officer | Manages Student/Person documents required during admission and enrollment workflows. |
| Trainer Coordinator | Manages Trainer-owned qualification and compliance evidence. |
| Corporate Account Coordinator | Manages Corporate-owned documents permitted by Corporate Training visibility rules. |
| Document Verifier | Reviews pending documents and records approval/rejection decisions. |
| Compliance Officer | Oversees verification quality, expiry risk, compliance reporting, and audit evidence. |
| Branch Manager | Oversees branch operations and may receive selected approval/reporting capabilities. |
| Head Office Operations Manager | Oversees multiple authorized branches and may receive branch-hierarchy or consolidated visibility. |
| Auditor / Compliance Reviewer | Read-only review of metadata, verification history, and approved audit evidence. |
| Reporting / MIS Analyst | Uses approved reporting read models; no transaction mutation rights by default. |
| Student Self-Service User | Future/conditional portal role restricted to own documents. |
| Trainer Self-Service User | Future/conditional portal role restricted to own Trainer documents. |
| Reconciliation Operator | Highly restricted operational role for Blob/database inconsistency investigation and retry. |

---

# 6. Action-Level Business Role Matrix

Legend: **✓** default recommended grant, **O** optional by business policy, **—** not recommended, **SELF** self-owned only, **G** global restricted operational capability.

| Action Permission | System Admin | Document Admin | Admission Officer | Trainer Coordinator | Corporate Coordinator | Document Verifier | Compliance Officer | Branch Manager | HO Ops Manager | Auditor | MIS Analyst | Student | Trainer | Reconciliation Operator |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `document.read` | O | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | SELF | SELF | O |
| `document.create` | O | ✓ | ✓ | ✓ | ✓ | — | O | O | O | — | — | SELF | SELF | — |
| `document.update` | O | ✓ | ✓ | ✓ | ✓ | — | O | O | O | — | — | SELF* | SELF* | — |
| `document.verify.submit` | O | ✓ | ✓ | ✓ | ✓ | — | O | O | O | — | — | SELF* | SELF* | — |
| `document.verify.read` | O | O | — | — | — | ✓ | ✓ | O | ✓ | O | — | — | — | — |
| `document.verify.approve` | — | O | — | — | — | ✓ | O | O | O | — | — | — | — | — |
| `document.verify.reject` | — | O | — | — | — | ✓ | O | O | O | — | — | — | — | — |
| `document.history.read` | O | ✓ | O | O | O | ✓ | ✓ | O | ✓ | ✓ | — | SELF** | SELF** | — |
| `document.file.read` | O | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | O | — | SELF | SELF | O*** |
| `document.expiry.read` | O | ✓ | O | O | O | O | ✓ | ✓ | ✓ | O | — | SELF | SELF | — |
| `document.retire` | — | ✓ | — | — | — | — | O | O | O | — | — | — | — | — |
| `document.operations.reconcile` | — | — | — | — | — | — | — | — | O | — | — | — | — | G |
| `document.owner.search` | O | ✓ | ✓ | ✓ | ✓ | — | O | O | O | — | — | — | — | — |
| `document.audit.read` | O | O | — | — | — | O | ✓ | O | ✓ | ✓ | — | — | — | — |

Notes:

- `SELF*`: future portal policy only; metadata editing/submission is limited to eligible self-owned records and lifecycle states.
- `SELF**`: self-service users may receive a filtered outcome/history view, but never unrestricted verifier identity or sensitive internal audit data unless policy explicitly permits it.
- `O***`: reconciliation operator file access must be narrowly justified for investigation and logged; the reconciliation permission itself does not automatically grant file read.
- System Administrator does not receive business permissions automatically. Assignment must be explicit.

---

# 7. Menu-Level Business Role Matrix

| Menu Permission | System Admin | Document Admin | Admission Officer | Trainer Coordinator | Corporate Coordinator | Document Verifier | Compliance Officer | Branch Manager | HO Ops Manager | Auditor | MIS Analyst | Student | Trainer | Reconciliation Operator |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `document.menu.view` | O | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | O | O | — | — | O |
| `document.menu.registry` | O | ✓ | ✓ | ✓ | ✓ | O | ✓ | ✓ | ✓ | O | — | — | — | — |
| `document.menu.upload` | O | ✓ | ✓ | ✓ | ✓ | — | O | O | O | — | — | — | — | — |
| `document.menu.verification` | O | O | — | — | — | ✓ | ✓ | O | ✓ | O | — | — | — | — |
| `document.menu.expiry` | O | ✓ | O | O | O | O | ✓ | ✓ | ✓ | O | — | — | — | — |
| `document.menu.operations` | — | — | — | — | — | — | — | — | O | — | — | — | — | ✓ |
| `document.menu.reports` | O | O | O | O | O | O | ✓ | ✓ | ✓ | O | ✓ | — | — | — |
| `document.menu.audit` | O | O | — | — | — | O | ✓ | O | ✓ | ✓ | — | — | — | — |

### Portal navigation note

Student and Trainer portals are future/conditional channels. Their self-service document navigation should use portal-specific IAM/menu permissions when those portals are activated, rather than reusing Admin Portal menu permissions.

---

# 8. Report-Level Business Role Matrix

| Report Permission | System Admin | Document Admin | Admission Officer | Trainer Coordinator | Corporate Coordinator | Document Verifier | Compliance Officer | Branch Manager | HO Ops Manager | Auditor | MIS Analyst |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `document.report.operational.view` | O | ✓ | O | O | O | O | ✓ | ✓ | ✓ | O | ✓ |
| `document.report.verification.view` | O | O | — | — | — | ✓ | ✓ | O | ✓ | O | ✓ |
| `document.report.expiry.view` | O | ✓ | O | O | O | O | ✓ | ✓ | ✓ | O | ✓ |
| `document.report.compliance.view` | O | O | — | — | — | O | ✓ | ✓ | ✓ | ✓ | ✓ |
| `document.report.owner.view` | O | ✓ | O | O | O | — | ✓ | O | ✓ | O | ✓ |
| `document.report.export` | O | O | O | O | O | O | ✓ | O | ✓ | O | ✓ |
| `document.report.consolidated` | O | — | — | — | — | — | O | — | ✓ | O | O |
| `document.report.consolidated.export` | O | — | — | — | — | — | O | — | ✓ | O | O |
| `document.report.audit.view` | O | — | — | — | — | O | ✓ | O | ✓ | ✓ | O |

### Consolidated report rule

A role marked **O** or **✓** for `document.report.consolidated` still requires the authenticated user to have IAM `canViewConsolidated = true`. Role assignment alone is insufficient.

---

# 9. Recommended Role Bundles and Scope

## 9.1 Document Administrator

**Recommended default scope:** B or B+

Recommended permissions:

```text
document.menu.view
document.menu.registry
document.menu.upload
document.menu.expiry
document.read
document.create
document.update
document.verify.submit
document.history.read
document.file.read
document.expiry.read
document.retire
document.owner.search
document.report.operational.view
document.report.expiry.view
document.report.owner.view
```

Approval/rejection is not included by default; add only where segregation-of-duties policy permits it.

## 9.2 Document Verifier

**Recommended default scope:** B or B+

```text
document.menu.view
document.menu.verification
document.read
document.verify.read
document.verify.approve
document.verify.reject
document.history.read
document.file.read
document.report.verification.view
```

The verifier must not receive general metadata update or retirement capability merely because verification access is granted.

## 9.3 Compliance Officer

**Recommended default scope:** B+, or C for approved consolidated reporting

```text
document.menu.view
document.menu.registry
document.menu.verification
document.menu.expiry
document.menu.reports
document.menu.audit
document.read
document.verify.read
document.history.read
document.file.read
document.expiry.read
document.audit.read
document.report.operational.view
document.report.verification.view
document.report.expiry.view
document.report.compliance.view
document.report.owner.view
document.report.audit.view
document.report.export
```

Optional consolidated access:

```text
document.report.consolidated
document.report.consolidated.export
```

only when IAM `canViewConsolidated` is true.

## 9.4 Branch Manager

**Recommended default scope:** B; B+ only where IAM grants child-branch access.

Recommended baseline:

```text
document.menu.view
document.menu.registry
document.menu.expiry
document.menu.reports
document.read
document.file.read
document.expiry.read
document.report.operational.view
document.report.expiry.view
document.report.compliance.view
```

Approval, rejection, update, or retirement rights are optional and must be explicitly assigned.

## 9.5 Head Office Operations Manager

**Recommended default scope:** B+ and optional C.

May receive broad read/reporting capability and selected approval capabilities across assigned branch hierarchy. Global mutation is not implied.

## 9.6 Auditor / Compliance Reviewer

**Recommended default scope:** B/B+ or C depending assignment.

```text
document.menu.view
document.menu.audit
document.read
document.history.read
document.audit.read
document.report.compliance.view
document.report.audit.view
```

File access should remain optional and separately justified.

## 9.7 Reporting / MIS Analyst

**Recommended default scope:** B/B+; optional C.

```text
document.menu.view
document.menu.reports
document.report.operational.view
document.report.verification.view
document.report.expiry.view
document.report.compliance.view
document.report.owner.view
document.report.export
```

The role does not receive transaction `document.read` automatically; report read models should expose only report-necessary data.

## 9.8 Reconciliation Operator

**Recommended default scope:** G or trusted SYS operational scope.

```text
document.menu.view
document.menu.operations
document.operations.reconcile
```

This role must not receive business verification, retirement, or reporting permissions by default.

---

# 10. Branch-Scoping Rules by Owner Type

| `ownerType` | Owning Context / Resolver | Branch Scope Rule |
|---|---|---|
| `Student` | Admission & Enrollment | Resolve StudentProfile/Enrollment-linked branch through the approved read boundary; intersect with IAM effective branches. |
| `Trainer` | Faculty / Trainer Management | Resolve `TrainerProfile.branchId`; intersect with IAM effective branches. |
| `Corporate` | Corporate Training | Apply Corporate Account visibility and branch/account policy from Corporate Training; intersect with IAM access. |
| `Person` | Shared Person/Party plus contextual resolver | No direct branch exists in current ER baseline. Deny access when scope cannot be deterministically resolved, unless an explicitly approved global policy applies. |

### Branch hierarchy evaluation

```text
Assigned Branches
      |
      +-- canViewChildBranches = false --> Assigned branches only
      |
      +-- canViewChildBranches = true  --> Assigned branches + approved descendants
```

The result is intersected with the document owner's resolved scope.

### Prohibited patterns

The following are forbidden:

- trusting `branchId` from the request body or query string as authorization evidence;
- granting branch access based only on UI-selected branch;
- treating knowledge of `documentId` as access;
- inferring Person-document global visibility because Person lacks `branchId`;
- bypassing branch checks for file access;
- using report consolidated scope to mutate records.

---

# 11. Permission-to-API Enforcement Matrix

| API / Use Case | Required Permission | Scope |
|---|---|---|
| Create upload intent | `document.create` | B/B+ |
| Register document | `document.create` | B/B+ |
| List documents | `document.read` | B/B+ |
| Read document detail | `document.read` | B/B+ |
| Update metadata | `document.update` | B/B+ |
| Submit for verification | `document.verify.submit` | B/B+ |
| Read verification queue | `document.verify.read` | B/B+ |
| Approve document | `document.verify.approve` | B/B+ or explicit G |
| Reject document | `document.verify.reject` | B/B+ or explicit G |
| Read verification history | `document.history.read` | B/B+ |
| Preview/download file | `document.file.read` | B/B+ |
| Read expiry workbench | `document.expiry.read` | B/B+ |
| Soft-retire document | `document.retire` | B/B+ or explicit G |
| Read reconciliation queue | `document.operations.reconcile` | G/SYS |
| Retry reconciliation action | `document.operations.reconcile` | G/SYS |
| Search owners | `document.owner.search` plus calling-use-case capability | B/B+ |
| Read audit evidence | `document.audit.read` plus Audit-context policy | B/B+/C |

---

# 12. Permission-to-Screen Enforcement Matrix

| Screen | Menu Permission | Minimum Functional Permission | Scope |
|---|---|---|---|
| Document Registry | `document.menu.registry` | `document.read` | B/B+/G |
| Upload Document | `document.menu.upload` | `document.create` | B/B+/G |
| Document Detail | Registry navigation or contextual link | `document.read` | B/B+/G |
| Edit Metadata | No separate menu required | `document.update` | B/B+/G |
| Verification Queue | `document.menu.verification` | `document.verify.read` | B/B+/G |
| Verification Review | Queue/contextual route | `document.verify.read` plus approve/reject capability for actions | B/B+/G |
| Expiry Workbench | `document.menu.expiry` | `document.expiry.read` | B/B+/G |
| Verification History | Contextual route | `document.history.read` | B/B+/G |
| Audit View | `document.menu.audit` | `document.audit.read` and Audit-context access | B/B+/C/G |
| Blob Reconciliation | `document.menu.operations` | `document.operations.reconcile` | G/SYS |
| Reports | `document.menu.reports` | At least one `document.report.*.view` permission | B/B+/C/G |

---

# 13. Segregation of Duties

The following combinations require explicit business approval because they concentrate sensitive powers:

| Combination | Risk | Recommended Control |
|---|---|---|
| `document.create` + `document.verify.approve` | User can upload and approve own evidence. | Prefer separate creator and verifier roles; log exception assignments. |
| `document.update` + `document.verify.approve` | User may alter metadata and approve it. | Restrict post-submission edit fields and require re-evaluation after material change. |
| `document.verify.approve` + `document.retire` | User can approve and then remove document from operational visibility. | Limit retirement to Document Admin/Manager; audit all retirements. |
| `document.operations.reconcile` + broad business mutation rights | Operational troubleshooting role could alter both storage state and business state. | Keep reconciliation role isolated from normal document mutation rights. |
| `document.audit.read` + broad mutation rights | Reviewer may audit their own actions. | Use independent audit/compliance reviewer for high-risk investigations. |

---

# 14. Permission and State Interaction Rules

A permission grant does not override lifecycle guards.

| Current State | Requested Action | Permission | Result Rule |
|---|---|---|---|
| `Uploaded` | Submit | `document.verify.submit` | Allowed only when file, metadata, owner, and scope validations pass. |
| `Uploaded` | Approve | `document.verify.approve` | Denied; invalid state transition. |
| `PendingVerification` | Approve | `document.verify.approve` | Allowed when branch scope and optimistic-lock checks pass. |
| `PendingVerification` | Reject | `document.verify.reject` | Allowed with mandatory remarks and transaction guarantees. |
| `Approved` | Approve again | `document.verify.approve` | Denied; duplicate approval prohibited. |
| `Rejected` | Resubmit | `document.verify.submit` | Conditional gap: allowed only after approved resubmission policy is finalized. |
| Any active state | Retire | `document.retire` | Allowed only when retirement business guards pass; soft delete only. |
| Soft-deleted | Normal read | `document.read` | Excluded from operational results. Audit/admin restoration behavior is not defined in current scope. |

---

# 15. Reporting Scope Rules

1. Branch-scoped reports query only records resolved into the user's effective branch set.
2. Consolidated report access is read-only.
3. `document.report.consolidated` must not broaden transaction permissions.
4. Export must re-run or reuse the same authorized report query and must not export rows outside the visible result scope.
5. Reporting read models must retain branch dimensions needed for scope filtering.
6. Reporting & Dashboards may consume Document Management data but do not own `Document` or `DocumentVerification` transactions.
7. Report definitions must not expose permanent Blob URLs.
8. File-level document access remains governed by `document.file.read`, even when a report row references a document.

---

# 16. Audit Requirements for Permission-Sensitive Actions

The following actions require audit evidence according to module and Audit & Compliance policy:

| Action | Required Audit Content |
|---|---|
| Document create | actor, owner type/id, document type, file metadata reference, timestamp, branch context |
| Metadata update | actor, old/new values, reason where required, version, timestamp |
| Submit for verification | actor, prior/new state, timestamp |
| Approve | verifier, prior/new state, decision, remarks if present, timestamp |
| Reject | verifier, prior/new state, mandatory remarks/reason, timestamp |
| File access | actor, document id, access mode where sensitive-access policy requires logging, timestamp |
| Retirement | actor, reason, prior state, timestamp |
| Reconciliation retry | operator, reconciliation item, action attempted, result, timestamp |
| Permission assignment change | Owned by IAM; role/user, permission added/removed, actor, timestamp |

---

# 17. DDD Ownership Check

| Authorization Concern | Owner | Document Management Responsibility |
|---|---|---|
| User authentication | IAM | Consume authenticated principal only. |
| Role creation | IAM | None. |
| Permission catalog persistence | IAM | Declare required permission codes; IAM stores assignments. |
| Role-permission mapping | IAM | None. |
| User-role mapping | IAM | None. |
| User branch access | IAM | Consume effective branch access. |
| Branch hierarchy | Organization/IAM access rules | Consume approved hierarchy visibility. |
| Document owner existence | Owning context of Student/Trainer/Corporate/Person | Validate through approved read boundary. |
| Document lifecycle authorization | Document Management | Enforce permission + scope + state guards in application services. |
| Audit log persistence | Audit & Compliance | Emit/record required facts through approved boundary. |
| Report definitions and dashboards | Reporting & Dashboards | Expose read data; reporting owns report composition, not document transactions. |

Document Management must not create local copies of `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `UserBranchAccess`, `Branch`, `StudentProfile`, `TrainerProfile`, or `CorporateAccount` merely to enforce authorization.

---

# 18. ER and DDD Alignment Notes

1. The ER model defines `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, and `UserBranchAccess` under IAM, so this permission matrix does not introduce local authorization tables.
2. The ER model defines `UserBranchAccess.canViewConsolidated` and `canViewChildBranches`, which this matrix uses for consolidated and branch-hierarchy visibility.
3. The DDD model requires dynamic RBAC and permission-based dashboard access; all matrices therefore map roles to permissions rather than binding application logic to role names.
4. The DDD model assigns Document and verification ownership to Document Management, while audit history ownership remains with Audit & Compliance; this matrix keeps operational verification-history access separate from audit evidence access.
5. Document owner branch scope is derived from the owner and its owning context. The matrix does not add `Document.branchId` merely for authorization convenience.
6. The generic `Person` branch-scope problem remains an explicit gap. Permission alone must not make such records globally visible.
7. Student and Trainer self-service roles remain conditional/future because the current application strategy is a single Admin Portal first.

---

# 19. Open Permission Decisions / Gaps

| Gap ID | Decision Required | Current Safe Behavior |
|---|---|---|
| GAP-PERM-001 | Final IAM permission seed naming normalization | Use canonical codes in this Part, especially `document.verify.submit`; do not create duplicate aliases. |
| GAP-PERM-002 | Person-owned document branch resolver | Fail closed where branch scope cannot be deterministically resolved. |
| GAP-PERM-003 | Whether approval and rejection require different business role bundles or can coexist on one verifier role | Keep permissions separate even when both are assigned to the same role. |
| GAP-PERM-004 | Whether Document Administrator may verify documents they created | Prefer segregation of duties; require explicit exception policy. |
| GAP-PERM-005 | Final definition of global operational user access | Do not grant global business access by role name; require explicit IAM policy. |
| GAP-PERM-006 | Student/Trainer portal activation and self-service permission names | Keep Admin Portal permissions separate; define portal-specific menu permissions when portals are activated. |
| GAP-PERM-007 | Report inventory finalization in Part 8 | Preserve report permission families here and refine exact report-to-permission mapping in Part 8 without broadening ownership. |

---

# 20. Final Consistency Check

This permission model is consistent with the previously defined Module 13 requirements and boundaries because it:

- uses dynamic RBAC rather than hardcoded roles;
- separates menu visibility from action authorization;
- separates transactional permissions from reporting permissions;
- applies owner-derived server-side branch scoping;
- supports IAM child-branch visibility without granting unrestricted global access;
- requires explicit consolidated-report permission plus IAM consolidated access;
- separates document read from file read;
- separates queue visibility, approval, and rejection;
- preserves soft-delete-only behavior;
- keeps reconciliation operations highly restricted;
- avoids introducing local IAM, owner-master, audit, communication, or reporting transaction tables;
- preserves future/conditional status for Student and Trainer portal authorization;
- carries forward unresolved Person scope and permission normalization gaps rather than inventing hidden business rules.
