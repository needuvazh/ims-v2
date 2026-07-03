# ASTI IMS: Functional Requirement Document
## Module 03: Lead & Inquiry Management
### Part 6 – Permission Matrix

---

## 1. Role Definitions

Authorization policies within ASTI IMS utilize fine-grained permissions assigned to roles. Roles are dynamic configurations inside the IAM context; role assignments are audited, and the policies are enforced server-side.

* **Super Admin (SA)**: Global operations controller. Has unrestricted permission across configuration, execution, and reporting.
* **Branch Admin (BA)**: Manages department, counselor assignment, and operational logs within their assigned branch context.
* **Counselor (CO)**: Primary operator of the lead pipeline, managing follow-ups, qualification, and sales negotiations.
* **Registrar (RE)**: Receives won leads and converts them to student profiles; manages admissions.
* **Accountant (AC)**: Reviews fee proposal terms and initial installment calculations linked to prospective students.
* **Receptionist (RC)**: Performs front-office activities, registers raw inquiries, and has branch-restricted read access.
* **Trainer (TR)**: Instructors who deliver batch content. Have no access to sales pipelines or counselor activities.
* **Student (ST)**: External learners. Have zero visibility into CRM systems.
* **Executive (EX)**: Senior leadership (CEO, Managing Director, Chairman). Have read-only access to consolidated reporting dashboards.
* **Web Ingestion API (API)**: Public website client, restricted to write-only inquiry ingestion.

---

## 2. Fine-Grained Permission Matrix

In the matrix below:
* `Yes` indicates the action is permitted.
* `No` indicates access is denied.
* `Assigned` indicates the operation is allowed only if the record is explicitly assigned to the user (`counselorId == user.id`) AND is scoped to their authorized branch.
* `Branch` indicates the operation is allowed for any record matching the user's branch access list.
* `Branch-Unassigned` indicates the operation is allowed for any record matching the user's branch access list ONLY IF the record has no currently assigned counselor.

### 2.1 Action-Level Permissions

| Permission Code | Super Admin | Branch Admin | Counselor | Receptionist | Registrar | Accountant | Trainer | Student | Executive | Web Ingestion API |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`inquiry.create`** | Yes | Yes | Yes | Yes | No | No | No | No | No | Yes |
| **`inquiry.read`** | Yes | Branch | Branch | Branch | No | No | No | No | Yes | No |
| **`inquiry.update`** | Yes | Branch | Assigned / Branch-Unassigned | Branch | No | No | No | No | No | No |
| **`inquiry.qualify`**| Yes | Branch | Assigned / Branch-Unassigned | No | No | No | No | No | No | No |
| **`lead.create`** | Yes | Yes | Yes | No | No | No | No | No | No | No |
| **`lead.read`** | Yes | Branch | Assigned | Branch | Branch | Branch | No | No | Yes | No |
| **`lead.update`** | Yes | Branch | Assigned | No | No | No | No | No | No | No |
| **`lead.assign`** | Yes | Branch | No | No | No | No | No | No | No | No |
| **`lead.won`** | Yes | Branch | Assigned | No | No | No | No | No | No | No |
| **`lead.lost`** | Yes | Branch | Assigned | No | No | No | No | No | No | No |
| **`lead.reveal_pii`**| Yes | Branch | Assigned | No | No | No | No | No | No | No |
| **`lead.export`** | Yes | Yes | No | No | No | No | No | No | No | No |
| **`followup.create`**| Yes | Branch | Assigned | No | No | No | No | No | No | No |
| **`followup.update`**| Yes | Branch | Assigned | No | No | No | No | No | No | No |
| **`campaign.read`**  | Yes | Yes | Yes | No | No | No | No | No | Yes | No |
| **`campaign.manage`**| Yes | No | No | No | No | No | No | No | No | No |
| **`config.crm`** | Yes | No | No | No | No | No | No | No | No | No |

---

### 2.2 Menu-Level Permissions

Controls visibility of sidebar navigation elements in the Admin Portal.

| Permission Code | Super Admin | Branch Admin | Counselor | Receptionist | Registrar | Accountant | Trainer | Student | Executive | Web Ingestion API |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`menu.crm.inquiries`**| Yes | Yes | Yes | Yes | No | No | No | No | Yes | No |
| **`menu.crm.leads`** | Yes | Yes | Yes | Yes | Yes | Yes | No | No | Yes | No |
| **`menu.crm.campaigns`**| Yes | No | No | No | No | No | No | No | Yes | No |
| **`menu.crm.settings`** | Yes | No | No | No | No | No | No | No | No | No |

---

### 2.3 Report-Level Permissions

Governs execution of data aggregation endpoints and analytics display widgets.

| Permission Code | Super Admin | Branch Admin | Counselor | Receptionist | Registrar | Accountant | Trainer | Student | Executive | Web Ingestion API |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`report.crm.conversion`**| Yes | Branch | Assigned | No | Yes | No | No | No | Yes | No |
| **`report.crm.funnel`** | Yes | Branch | No | No | No | No | No | No | Yes | No |
| **`report.crm.counselor`**| Yes | Branch | No | No | No | No | No | No | Yes | No |
| **`report.crm.consolidated`**| Yes | No | No | No | No | No | No | No | Yes | No |

---

## 3. Enforcement Policy

1. **Server-Side API Guarding**: Every API route handler serving CRM resources must execute authorization checks before checking query filters. The code checks authorization by scanning the session token's permission array for the required code (e.g., `req.user.permissions.includes("lead.update")`).
2. **Database Query Filtering**: Where scoped access applies (e.g. `Branch` or `Assigned`), the query parser dynamically injects filters into the Prisma command block:
   * For **Branch Scope**: `where: { branchId: { in: user.authorizedBranchIds } }`
   * For **Assigned Scope**: `where: { AND: [ { branchId: { in: user.authorizedBranchIds } }, { counselorId: user.id } ] }`
   * For **Branch-Unassigned Scope**: `where: { AND: [ { branchId: { in: user.authorizedBranchIds } }, { counselorId: null } ] }`
3. **Menu Element Conditional Rendering**: Client-side layouts verify permissions during navigation rendering. Unprivileged components are excluded from the virtual DOM (they are not rendered and are not simply hidden via CSS style toggles).
4. **Export Auditing**: Triggering the action `lead.export` writes an entry to the `audit_logs` table containing target parameters, rows affected, requesting user, and IP address.
