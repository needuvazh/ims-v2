# Part 6 – Permission Matrix

## Module 15 – Corporate Sales & Quotation

---

# 1. Permission Matrix & Role Mapping

ASTI enforces role-based access control (RBAC) server-side. The following matrix details which role is granted which specific `corporateSales.*` permissions.

### Roles Defined:
- **Central Administrator (Admin)**: Full global authority over all modules and branches.
- **Branch Manager (BM)**: Operates with branch-scoped authority over their assigned branch location (e.g. Muscat).
- **Sales Manager (SM)**: Leads the sales team, reviews costing sheets, creates revisions, and coordinates handoffs.
- **Sales Executive (SE)**: Logs visits, updates prospect stages, and manages scheduled follow-up alerts.
- **CTM Admin (CTM)**: Read-only access to sales orders for handoff planning.

---

## 1.1 Permissions Reference Table

| Permission Key | Description | Type | Admin | BM | SM | SE | CTM | Scope Enforced |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `corporateSales.lead.read` | View B2B sales leads & details | Action/Menu | Yes | Yes | Yes | Yes | Yes | Branch Scope (`branchId`) |
| `corporateSales.lead.create` | Create B2B sales lead records | Action | Yes | Yes | Yes | Yes | No | Branch Scope (`branchId`) |
| `corporateSales.lead.update` | Edit B2B sales lead parameters | Action | Yes | Yes | Yes | Yes | No | Branch Scope / Assigned Owner |
| `corporateSales.lead.assign` | Change sales owner assignment | Action | Yes | Yes | Yes | No | No | Branch Scope |
| `corporateSales.visit.create` | Log marketing visit details | Action | Yes | Yes | Yes | Yes | No | Branch Scope / Assigned Lead |
| `corporateSales.visit.update` | Modify logged visit notes | Action | Yes | Yes | Yes | Yes | No | Branch Scope / Creator Only |
| `corporateSales.followUp.create` | Schedule follow-up tasks | Action | Yes | Yes | Yes | Yes | No | Branch Scope |
| `corporateSales.followUp.update` | Complete / reschedule task | Action | Yes | Yes | Yes | Yes | No | Branch Scope / Creator Only |
| `corporateSales.quotation.read` | View quotations list & previews | Action/Menu | Yes | Yes | Yes | Yes | Yes | Branch Scope (`branchId`) |
| `corporateSales.quotation.create` | Generate quotation draft | Action | Yes | Yes | Yes | No | No | Branch Scope |
| `corporateSales.quotation.update` | Modify line items of draft quotes | Action | Yes | Yes | Yes | No | No | Branch Scope |
| `corporateSales.quotation.submit` | Submit quote for validation | Action | Yes | Yes | Yes | No | No | Branch Scope |
| `corporateSales.quotation.approve` | Approve low-margin / high-value quote | Action | Yes | Yes | No | No | No | Branch Scope |
| `corporateSales.quotation.reject` | Return quote for revisions | Action | Yes | Yes | No | No | No | Branch Scope |
| `corporateSales.quotation.revise` | Create quote revision snapshot | Action | Yes | Yes | Yes | No | No | Branch Scope |
| `corporateSales.quotation.send` | Dispatch quotation to B2B client | Action | Yes | Yes | Yes | No | No | Branch Scope |
| `corporateSales.costing.read` | View costing profitability metrics | Action | Yes | Yes | Yes | No | No | Branch Scope |
| `corporateSales.costing.update` | Modify costing direct/indirect values | Action | Yes | Yes | Yes | No | No | Branch Scope |
| `corporateSales.salesOrder.create` | Auto-generate Sales Order | Action | Yes | Yes | Yes | No | No | Branch Scope |
| `corporateSales.salesOrder.confirm` | Upload LPO & confirm order | Action | Yes | Yes | Yes | No | No | Branch Scope |
| `corporateSales.training.handoff` | Verify downstream delivery project | Action/Menu | Yes | Yes | Yes | No | Yes | Branch Scope |
| `corporateSales.report.read` | View branch sales analytics | Report | Yes | Yes | Yes | No | No | Branch Scope |
| `corporateSales.report.consolidated`| View multi-branch performance | Report | Yes | No | No | No | No | Global (All Branches) |
| `corporateSales.export` | Export CSV/PDF customer data | Action | Yes | Yes | No | No | No | Branch Scope |
| `corporateSales.audit.read` | Read quotation and lead logs | Action | Yes | Yes | Yes | No | No | Branch Scope |

---

# 2. Branch Access Scoping Logic

All read and write permissions (except consolidated reports restricted to Central Admin) are strictly bounded by `branchId` filters:

1. **Self/Assigned Scoping**:
   - A Sales Executive (`SE`) can only modify leads where they are designated as the `salesOwnerId`. 
   - A Sales Executive can only view visits or complete follow-up tasks they logged, unless they are granted branch-wide read access.
2. **Branch Scoping**:
   - When a user performs `GET /api/admin/corporate-sales/leads`, the server extracts the user's authorized branch list from the IAM context.
   - The Prisma query is compiled with `isDeleted: false` and `branchId IN [UserAuthorizedBranches]`.
3. **Write Path Scope Enforcement**:
   - When creating a lead or logging a visit, the input `branchId` is validated. If the user attempts to insert a record for a branch ID not mapped to their IAM profile, the API throws `403 Forbidden` (`ERR_CSQ_UNAUTHORIZED_BRANCH`).

---

# 3. Approvals and Overrides Scoping

The system protects gross profit margins dynamically:
- If a quotation costing margin evaluates below 25.00%, `corporateSales.quotation.submit` triggers a status transition to `SubmittedForApproval`.
- Sales Managers (`SM`) have access to costing sheets but **lack** `corporateSales.quotation.approve`. They cannot bypass the margin limit.
- Only users with `corporateSales.quotation.approve` (Branch Managers and Central Admins) can sign off on low-margin deals.
- The approval remarks must be inputted, which triggers an audit log storing the approved margin percentage and remarks.
- Once approved, the status is set to `Approved`, granting the Sales Manager access to invoke `POST /quotations/[id]/send`.
