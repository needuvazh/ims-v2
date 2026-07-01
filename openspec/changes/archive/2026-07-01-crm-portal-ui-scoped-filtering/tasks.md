## 1. Domain & Application Query Logic

- [x] 1.1 Add `email String? @unique` to the `Person` model in `packages/database/prisma/schema.prisma` and run Prisma migrate to support email-based identity resolution (complete).
- [x] 1.2 Fix typescript typecheck issues in `@ims/crm-leads`:
  - Import and use `randomUUID` from `crypto` in all parameterized `createUuid(randomUUID())` calls (in `followup-service.ts` and `lead-service.ts`).
  - Extend the `IInquiryRepository.create` data parameter signature in `domain/repositories.ts` to include `counselorId?: string | null`.
- [x] 1.3 Expose `findAll` query methods in `LeadService` and `InquiryApplicationService` application classes to act as the query handlers called by the API routes, applying appropriate branch scope validation checks.
- [x] 1.4 Modify `LeadRepository.updateLead` to sync `email` updates and write/update `dateOfBirth` directly on the target `Person` record in the database, avoiding profile drift.
- [x] 1.5 Update `CreateLeadSchema`, `updateLeadSchema`, and validation rules to support the collection of `dateOfBirth` (optional on creation/edit, but validated as mandatory when converting or marking lead Won).
- [x] 1.6 Implement 30-day active lead duplicate validation within `LeadService.createLead` (and `updateLead`), throwing `ERR_CRM_DUPLICATE_LEAD_DETECTED` if an active lead collision occurs in the branch and bypass is not set.
- [x] 1.7 Write unit tests for query filters verifying branch isolation, counselor-scoped assignments, and duplicate check validation logic.

## 2. Server Action & Error Mapping Delivery

- [x] 2.1 Implement `buildCrmActionFailure` helper in `apps/admin-portal/app/(protected)/leads/form-errors.ts` to map Zod validation issues, Prisma `P2002` index clashes (by parsing `error.meta?.target` and writing to `fieldErrors`), and domain policy errors to UI fields.
- [x] 2.2 Define the `createLeadAction` Server Action inside `apps/admin-portal/app/(protected)/leads/actions.ts` utilizing `assertPermission('lead.create')` and `assertBranchScope`.
- [x] 2.3 Add duplicate check validation rules inside the server action by checking for active duplicates, returning `DUPLICATE_LEAD_DETECTED` status if a match is found and not overridden.
- [x] 2.4 Update the `convertLeadAction` Server Action to take `documentLinks` and pass them to the orchestrator: `orchestrator.convertLeadToAdmission(leadId, documentLinks, session.userId)`.
- [x] 2.5 Add `updateLeadAction` Server Action to handle updates (asserting `lead.update`), auditing, and outbox event dispatching.
- [x] 2.6 Seed the granular CRM permissions (`lead.create`, `lead.update`, `lead.delete`, `lead.assign`, `lead.lost`, `lead.reveal_pii`, `lead.qualify`, `followup.create`, `followup.update`, `crm.leads.read.all`) and map them to Counselor and Branch Manager roles in `packages/database/prisma/seed.ts`.

## 3. List Views & Scoped Filtering UI

- [x] 3.1 Setup Next.js page structure for Leads list (`/leads`) and Inquiries list inside the admin portal's App Router.
- [x] 3.2 Implement server-side check in `leads/page.tsx` retrieving the session, asserting permissions, and computing the active `branchId` and counselor scoping bounds (`counselorId = session.userId`).
- [x] 3.3 Embed `@ims/shared-ui` layout and list components: `PageHeader`, `Breadcrumbs`, `Table`, `TableHeader`, `TableBody`, `TableCell`, `TableRow`, `Badge`, and `Pagination`.
- [x] 3.4 Integrate `DataTableFilter` in the list screens to handle search queries (`q`) and dropdown filters (Stage, Source) based on Next.js searchParams.
- [x] 3.5 Setup skeletons using `TableLoadingState` and clear dynamic empty views using `EmptyState`.
- [x] 3.6 Implement a Dialog modal in `leads/page.tsx` that opens upon clicking "Convert to Student", requiring the user to input at least one identity document URL (such as national ID scan) before executing `convertLeadAction`.
- [x] 3.7 Add branch scoping verification inside `apps/admin-portal/app/api/v1/crm/inquiries/[id]/qualify/route.ts` by fetching the inquiry and asserting that `inquiry.branchId` is within the user's branch scope, preventing cross-branch qualifications.
- [x] 3.8 Update error handling in the lead detailed, update, lost, and conversion route handlers to throw `ERR_CRM_ASSIGNED_LEAD_SCOPE_VIOLATION` instead of branch scope violations on counselor assignment mismatch, and map this in `crmErrorResponse` to return a 403 status.
- [x] 3.9 Update API route handlers and server actions to assert granular action permissions rather than broad permissions (e.g. check `lead.convert` for conversion instead of `lead.won`).

## 4. Creation & Editing Forms

- [x] 4.1 Create the `LeadForm` client component inside `apps/admin-portal/app/(protected)/leads/_components/lead-form.tsx` using `react-hook-form` and `zodResolver`.
- [x] 4.2 Register input and custom popover select components with ref forwarding and verify Radix Select dispatches change events to RHF correctly.
- [x] 4.3 Build the duplicate warning UI banner inside the form that toggles a bypass checkbox ("Ignore duplicate warning and proceed") if `DUPLICATE_LEAD_DETECTED` is caught.
- [x] 4.4 Add conditional validation logic making `lostReasonCode` mandatory when `stage === 'Lost'`.
- [x] 4.5 Disable manual transitions to the `Converted` stage inside the form stage select dropdown.

## 5. Verification & Testing

- [x] 5.1 Write unit tests for Zod validation refinements ensuring required fields trigger errors.
- [x] 5.2 Add integration tests verifying branch scope checks and counselor restrictions are enforced server-side.
- [x] 5.3 Write Playwright E2E tests covering validations, warning alerts, bypasses, conversion dialogs, and creations.
- [x] 5.4 Run verification checks using typecheck, lint, and vitest suites.

## 6. Detail View, Timeline & Audit Logs

- [x] 6.1 Implement `LeadNote` database table for immutable timeline notes, and `LeadStageHistory` table for tracking stage changes, executing Prisma migrations dev schema changes.
- [x] 6.2 Create `addLeadNoteAction` Server Action inside `actions.ts` to append notes to a lead and revalidate paths.
- [x] 6.3 Create `updateLeadStageAction` Server Action inside `actions.ts` to save stage changes into the dedicated `LeadStageHistory` table.
- [x] 6.4 Implement an interactive inline Pipeline Status updater card in `lead-details-client.tsx` with dropdown selectors and validation for Lost stage notes.
- [x] 6.5 Render stage transitions chronologically in a vertical stepper/timeline chart, displaying only the last 2 events by default and hiding previous ones under an expand toggle.
- [x] 6.6 Present performer details, dates, and actions in an audit grid table using URL-parameter-based server-side pagination, excluding Note additions from the log table.
