## Context

We have the database models (`CorporateMarketingVisit`, `CorporateSalesFollowUp`) and application services/server actions (`logVisitAction`, `createFollowUpAction`) already built. However, the lead details page (`app/(protected)/corporate-sales/leads/[id]/page.tsx`) only renders static lists of history logs and does not provide any buttons or modals to create these entries from the UI.

## Goals / Non-Goals

**Goals:**
- Implement "Log Marketing Visit" modal dialog form with fields: meeting date, company name snapshot, contact person, contact number, email snapshot, discussion notes, courses discussed, expected candidates, expected training date, and visit outcome.
- Implement "Schedule Follow-up" modal dialog form with fields: follow-up date, type (Call/Email/Meeting), notes, outcome, status (Scheduled/Completed).
- Revalidate and update the page data automatically upon submission.

**Non-Goals:**
- No new database schema changes.
- No modifications to the backend application services.

## Decisions

- **Client Form Modals**: Create a client component `ActivityForms` that holds the modal states (`isVisitOpen`, `isFollowUpOpen`) and forms, separating interactive state from the server component page file.
- **NextJS Revalidation**: Trigger `router.refresh()` inside form submission handlers to re-render the server component lists dynamically after mutation.
- **Styling**: Standard TailwindCSS form inputs matching ASTI UI aesthetics.

## Risks / Trade-offs

- **Past Date Validations**: Client side date pickers should disable past dates to align with backend validations (`ERR_CSQ_VISIT_PAST_DATE` and `ERR_CSQ_FOLLOWUP_PAST_DATE`).
