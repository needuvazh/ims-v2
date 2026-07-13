## 1. Create Form Component

- [x] 1.1 Create `apps/admin-portal/app/(protected)/corporate-sales/leads/[id]/_components/activity-forms.tsx` client component.
- [x] 1.2 Implement the "Log Marketing Visit" dialog modal form with client validation rules checking for future date boundaries.
- [x] 1.3 Implement the "Schedule Follow-up" dialog modal form with date/type selection.


## 2. Integrate in Details Page

- [x] 2.1 Edit `apps/admin-portal/app/(protected)/corporate-sales/leads/[id]/page.tsx` to render the button controls and modal forms.
- [x] 2.2 Hook the forms up to invoke `logVisitAction` and `createFollowUpAction` server actions.
- [x] 2.3 Add revalidation `router.refresh()` to update details and logs automatically.


## 3. Verify & Compile

- [x] 3.1 Run `pnpm typecheck` to verify layout typescript compilation.
- [x] 3.2 Verify the form submission and revalidation flow manually on the local admin portal.

