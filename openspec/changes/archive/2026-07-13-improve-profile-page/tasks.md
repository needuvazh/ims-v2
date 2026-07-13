## 1. Backend API Routes

- [x] 1.1 Create route file `apps/admin-portal/app/api/v1/users/[id]/profile-photo/route.ts` with multipart validation, Vercel Blob PUT execution, Person table update, and AuditLog creation.
- [x] 1.2 Create route file `apps/admin-portal/app/api/v1/users/[id]/profile-photo/view/route.ts` to fetch private Vercel Blob objects and stream them back to the browser with caching.

## 2. Server Actions & Data Wiring

- [x] 2.1 Add `terminateSessionAction(sessionId)` Server Action in `apps/admin-portal/app/(protected)/account/profile/actions.ts` to securely revoke a specific user session and trigger page revalidation.
- [x] 2.2 Update Server Component `apps/admin-portal/app/(protected)/account/profile/page.tsx` to fetch `photoUrl`, active sessions, and the latest 50 login history records directly from Prisma.
- [x] 2.3 Pass user profile attributes (including ID and photo URL), active sessions, login history, and the current session token hash to the client components.

## 3. Frontend UI Redesign

- [x] 3.1 Modify `apps/admin-portal/app/(protected)/account/profile/profile-form.tsx` to accept the new `user` attributes and the server-side audit logs.
- [x] 3.2 Implement a modern, premium Visual Identity Card on the left/top containing the interactive avatar, hover cameras overlays, role badges, and status badges.
- [x] 3.3 Retain the form state after profile saves by replacing the early success page unmount with a dynamic `sonner` success toast notification.
- [x] 3.4 Create an Active Sessions section displaying user devices, browser types, and IP addresses with individual "Revoke Session" controls (disabled for the current session).
- [x] 3.5 Create a Login History list displaying the 5 most recent login attempts with descriptive HSL status badges.
- [x] 3.6 Create a scrollable "View More" Modal Dialog using the Radix `<Dialog>` components to display the full list of up to 50 login history records.

## 4. App Shell Integration

- [x] 4.1 Update `apps/admin-portal/app/(protected)/layout.tsx` to query user details (full name and photo URL) on the server.
- [x] 4.2 Render the user avatar dynamically using the `<Avatar>` component and feed it to the `AppShell`'s `userAvatar` prop.

## 5. Verification & Tests

- [x] 5.1 Update tests in `apps/admin-portal/app/(protected)/account/profile/profile-form.test.tsx` to mock `id` and `photoUrl` props.
- [x] 5.2 Verify codebase compilation and type checking by running `pnpm run typecheck` or workspace equivalent.
