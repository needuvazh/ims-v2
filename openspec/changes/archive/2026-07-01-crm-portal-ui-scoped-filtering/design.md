## Context

Currently, the admin portal has a basic stub for lead list queries (`apps/admin-portal/app/(protected)/leads/page.tsx`) that queries all leads directly from database via Prisma, bypassing RBAC, active branch scoping, and counselor scopes. There are no UI screens or modals for capture, edit, or follow-ups.

This design outlines the client-side screens, form validation, and server-side authorization mapping required to make these pages production-ready and fully secure according to Al Saud Training Institute (ASTI) compliance rules.

## Goals / Non-Goals

**Goals:**
* Enforce route-level and query-level branch scoping and counselor isolation on the server before rendering the UI.
* Leverage shared components (`DataTableFilter`, `Table`, `Badge`, `Button`, `Pagination`, `Dialog`) to create a responsive, high-performance UI list view for both Leads and Inquiries.
* Build the Create and Edit forms using `react-hook-form` and `zodResolver` (sharing schemas from `@ims/crm-leads`).
* Map server-side validation/database failures (uniqueness indexes and domain exceptions) back to specific inputs in the client-side form.
* Support duplicate check warnings that can be bypassed explicitly by authorized users via checkbox confirmation.

**Non-Goals:**
* Automated counselor routing rules, campaign analytics dashboards, SMS/WhatsApp delivery, and email marketing.

## Decisions

### Decision 1: Hybrid Server Actions + React Hook Form
We will use React Hook Form for client-side state management and form registration, but submit forms by executing Next.js Server Actions inside the client `onSubmit` handler.
*   *Alternative Considered (Option A - Progressive Server Actions):* Mirroring IAM user form (`useActionState` + native `<form>` + manual onBlur blur checks).
*   *Rationale:* Option B (RHF) is the explicit standard in `AGENTS.md` and removes substantial boilerplate code (no manual `FormData` mapping, no manual blur hooks). Since it's a protected administrative portal, the lack of progressive enhancement for JS-disabled clients is not a concern.

### Decision 2: Structured Action Error Mapping (`buildCrmActionFailure`)
We will write a helper function `buildCrmActionFailure` in the portal app's library to translate raw Zod issues, Prisma request errors (such as unique indexes on email/phone), and crm-leads Domain errors into field-level validation payloads.
*   *Rationale:* Directly aligns with the IAM module's `buildIdentityActionFailure` pattern. This guarantees consistent, user-friendly field highlights under the form fields on validation errors.

### Decision 3: Acknowledge & Bypass Duplicate Lead Warning
If a matching active lead or inquiry is found by phone/email, the Server Action will block execution and return a `DUPLICATE_LEAD_DETECTED` status code. The client form catches this code, stops the loading state, and renders a warning banner with a bypass checkbox ("Ignore duplicate warning and proceed"). Re-submitting with the checkbox checked sets the `ignoreDuplicate: true` parameter, bypassing the check.
*   *Rationale:* This supports the FRD requirements of warning users about duplicates while still allowing them to override the block if authorized.

### Decision 4: Omitting `Converted` Stage from Manual Selection
We will omit or disable the `Converted` option from dropdown selects for manual stage changes. 
*   *Rationale:* Under ASTI DDD rules, a lead's transition to the `Converted` stage is terminal and must only happen via the `convertLeadAction` (which triggers the `LeadConversionOrchestrator` to create the downstream Admission record). This preserves strict transaction boundaries and prevents manual bypasses.

### Decision 5: Extend Person Model with Email
We will extend the `Person` model inside `schema.prisma` to include an `email` field (matching the ER Model v3.0 specs). This solves type safety issues during Person profile resolution when ingestion or promotion operations search by both phone and email.

### Decision 6: Expose list queries through Application Services
We will define and expose `findAll` query methods on the Application Services (`LeadService` and `InquiryApplicationService`) to act as the single entry point for all CRM reads, ensuring branch scoping is consistently applied.

### Decision 7: Collect identity document links during conversion
We will modify the conversion action UI flow. Instead of a direct button, a dialog modal will collect identity document URLs (`documentLinks`) from the counselor. The Server Action `convertLeadAction` will pass these links to the `LeadConversionOrchestrator` to satisfy ASTI verification preconditions.

### Decision 8: Synchronize DOB and Email changes to Person Model
To satisfy the lead conversion preconditions, we will collect `dateOfBirth` in the `LeadForm` client-side component (validated as optional during creation but mandatory when marking a lead as Won) and write it to the linked `Person` record in the database. Furthermore, when `Lead.email` is created or modified, we will propagate this change to the associated `Person.email` record, resolving the profile drift discrepancy.

### Decision 9: Seed Expansion for Granular RBAC Permissions
Rather than consolidating checks into a broad permission code, we will expand `seed.ts` to register granular permissions (`lead.create`, `lead.update`, `lead.delete`, `lead.assign`, `lead.lost`, `lead.reveal_pii`, `lead.qualify`, `followup.create`, `followup.update`) and map them to Counselor and Branch Manager roles. This preserves the security architecture guidelines of ASTI for action-level RBAC.

### Decision 10: Field-specific Unique Constraint Failure Mapping
We will update `buildCrmActionFailure` to parse unique key targets from Prisma database violations (code `P2002` targeting fields like `email` or `mobile`). This allows mapping duplicate exceptions to specific UI input fields inside react-hook-form.

### Decision 11: Active Duplicate Lead Checks on Creation
We will implement 30-day active lead duplicate validation within `LeadService.createLead` (by checking for existing non-terminal leads in the same branch with the same phone/email). This ensures that manual lead creation warns counselors about active duplicates and permits authorized bypass actions via the UI, matching the inquiry capture duplicate flow.

## Risks / Trade-offs

* **[Risk] Scoping bypass via search parameters:** Counselors could try to tamper with URL queries to view other counselors' data.
  - *Mitigation:* The Server Component retrieves the session context first. If counselor-scoping is active, the server completely overrides any client-supplied counselor ID filters and forces `counselorId = session.userId`.
* **[Risk] Radix Select compatibility with React Hook Form:** Custom select popovers may fail to notify React Hook Form when values are updated.
  - *Mitigation:* The `@ims/shared-ui` `Select` component uses ref forwarding and dispatches a native `change` event on a hidden `<select>` element under the hood, ensuring RHF captures value changes.

### Decision 12: Dedicated LeadNote Database Table for Notes
We will use a dedicated `LeadNote` table mapped to `Lead` and `User` in `schema.prisma` rather than polluting followups or using a single text field. Notes are immutable once created and are loaded in a client-side paginated table (5 per page).

### Decision 13: Collapsible Chronological vertical timeline chart
We will display stage transition logs (queried from `LeadStageHistory`) chronologically in a vertical stepper/timeline. By default, it slices and displays only the last 2 events, hiding earlier ones under a `"Show all (+X more)"` toggle to prevent layout overload on active records.

### Decision 14: Direct Inline Stage Updater
We will render a `"Change Stage"` form inline within the Pipeline Status card, allowing users to update the stage directly. Changing the stage to `Lost` prompts validation for lost reason codes and description notes (validated to be at least 15 characters).

### Decision 15: Server-Side Paginated Audit Logs Table
We will present audit logs inside an Audit History Log table at the bottom of the details page. Pagination is computed server-side in `page.tsx` by reading URL query parameter `?auditPage=X`. Performed UUIDs are mapped to usernames on the server.

### Decision 16: Suppressing ADD_NOTE Audit Log Entries
To keep the audit log clean from redundant notes context, we will write Note additions directly to the `LeadNote` table only, omitting `ADD_NOTE` events from the general `AuditLog` table. Stage changes and manual updates continue to be audited.

