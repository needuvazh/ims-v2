## Why

Currently, the admin portal lacks user interface screens and forms to capture, qualification-track, and search leads and inquiries. Additionally, counselor-level and branch-level data isolation filters must be enforced server-side (rather than just hidden in the UI) to comply with ASTI's security specifications.

## What Changes

This change implements the frontend portal pages, filtering controls, form dialogs, and necessary domain queries/modifications for the CRM module. Specifically:
- **Core Screen Views:** Next.js App Router protected routes for Leads Management (`/leads`) and Inquiries Management.
- **Dynamic Scoped Fetching:** Server-side verification of user permissions and branch scoping context to filter query results dynamically (restricting Counselors to their assigned records by default, unless overridden by permission `crm.leads.read.all`). Exposes query `findAll` methods on the Application Services.
- **Database Schema & Type Safety:** Adds `email String? @unique` to the `Person` model in `schema.prisma`, parameters `createUuid` with generated random UUIDs, and types `counselorId` on repository creations. Collects and syncs `dateOfBirth` on leads to the `Person` model to satisfy conversion prerequisites. Also adds dedicated tables `LeadNote` (for timeline logs) and `LeadStageHistory` (for tracking stage updates).
- **React Hook Form Integration:** Forms to create/edit leads and inquiries using `@ims/crm-leads` validation schemas (Zod) integrated via `zodResolver`, capturing name, email, phone, and date of birth details.
- **Acknowledgeable Duplicate Warning UI:** React banners that prompt users to acknowledge and bypass duplicate checks if phone or email matches are found.
- **Terminal Stage Protection & Document Collection:** Restricts manual transition to the `Converted` stage (which must only happen via Admission orchestrator actions requiring identity document link submission collected via a UI modal dialog) and requires `lostReasonCode` when marking a lead as `Lost`.
- **Security Boundary Enhancements:** Adds branch scope validation inside inquiry qualification route handler, asserts granular action permissions (e.g., `lead.create`, `lead.update`, `lead.lost`, `lead.assign`), and throws specific `ERR_CRM_ASSIGNED_LEAD_SCOPE_VIOLATION` codes when counselor assignment bounds are breached.
- **Validation Mapping:** Integrates Prisma unique constraint target-field parsing inside the error mapper to highlight duplicate inputs in the form.
- **Timeline Notes & Inline Stage Changes:** Option to write multiple immutable timeline notes in a paginated grid list. Direct inline stage toggling with validation rules, saving transitions into the dedicated `LeadStageHistory` table.
- **Vertical Timeline Stepper:** Chronological stepper chart depicting stage transitions, showing the last 2 changes by default under an expand/collapse toggle.
- **Paginated Audit Logs:** Presents performer details, dates, and actions in an audit grid table using URL-parameter-based server-side pagination. Note additions are excluded from general audit log clutter.

## Capabilities

### New Capabilities
- `crm-portal-ui-scoped-filtering`: Frontend interface for Inquiry and Lead lists, dynamic search and filtering bar, creation/edit modals, client-side React Hook Form validation, custom select inputs, counselor-scoped data filtering, type-safe Person-level email queries, branch-scoped qualification checks, and conversion-level document collection modals.

### Modified Capabilities
*(None)*

## Impact

* **Bounded Context:** Main owner is **Lead, Enquiry & CRM Management** (frontend portal screens, query services, and API route wrappers).
* **Dependencies:** Relies on `@ims/shared-ui` for layout, table, input, popover select, modal, and badge components; depends on `@ims/crm-leads` for schemas, repositories, and services; depends on `@ims/shared-auth` and `auth-guard` for session and permission assertion.
* **Server Action & Validation:** Implements backend Server Actions for lead/inquiry operations, with error mapper `buildCrmActionFailure` resolving unique constraints and domain issues to field-level validation messages.
* **Data Scopes:** Integrates with user session `dataScopes` to dynamically restrict lists based on `branchId` and `assignedOnly` flags.
* **Audit Impact:** Actions (creation, updates, stage transitions, qualifications, and conversions) will log structured entries to the database via `AuditLogRepository` and trigger outbox domain events.

