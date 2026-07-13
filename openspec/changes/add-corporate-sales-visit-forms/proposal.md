## Why

To allow sales representatives and counselors to interactively log marketing visits and schedule follow-up actions directly from the admin portal, we need to add the input form dialogs/modals on the lead detail page. Currently, the server actions exist but are not linked to any input components in the UI.

## What Changes

- Add interactive modal dialogs for "Log Marketing Visit" and "Schedule Follow-up" on the Lead Detail page.
- Wire these modals to call Next.js Server Actions `logVisitAction` and `createFollowUpAction`.
- Ensure real-time refetching / route revalidation so that the lists update immediately upon form submission.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None (the requirements in the spec are not changing; this is purely a frontend implementation alignment).
 
## Impact

- **UI Components**: `apps/admin-portal/app/(protected)/corporate-sales/leads/[id]/page.tsx`
- **Dependency**: Uses server actions in `actions.ts`.
