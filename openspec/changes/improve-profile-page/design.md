## Context

The profile page (`/account/profile`) is a core user-facing administrative screen in the IMS Admin Portal. Currently, it only allows editing the full name and phone number. Self-service features such as updating a profile image, auditing active login sessions, revoking unauthorized sessions, and monitoring recent login history are missing.

## Goals / Non-Goals

**Goals:**
- **Profile Photo Upload**: Add a drag-and-drop/clickable photo upload component using Vercel Blob private storage.
- **Dynamic Sidebar Avatar**: Sync the sidebar profile avatar in the `AppShell` with the user's latest uploaded image.
- **Active Sessions Monitor**: Display all active sessions with details (browser, OS, IP, active timestamp) and allow revoking any session other than the current one.
- **Login History Log**: Display the 5 most recent login attempts, with an expandable modal showing up to 50 login history records.
- **Premium UX/UI**: Ensure visual identity cards, badges, and layout align with IMS HSL design tokens.

**Non-Goals:**
- **Revoking All Sessions**: Batch-revoking all other sessions in a single action is out of scope for this task.
- **Profile Image Cropping**: Interactive frontend crop/edit filters are excluded; standard aspect-ratio styling will handle formatting.
- **SaaS Tenant Separation**: This feature remains single-client focused for ASTI.

## Decisions

### 1. API Architecture for Users Profile Image
To isolate file storage details from domain packages, we will create dedicated API route handlers inside the admin portal delivery layer:
- `POST /api/v1/users/[id]/profile-photo`
- `GET /api/v1/users/[id]/profile-photo/view`

**Security Boundary**: 
The API routes will authenticate using `withAuth(request)`. A user can only perform actions on their own ID unless they possess the administrative `iam.user.update` or `iam.user.read` permissions.

### 2. Server-Side Data Fetching for Session and Login Audits
Active sessions and login history will be queried directly in the async Server Component `page.tsx` using `prisma`. This avoids exposing public query endpoints, eliminates client-side waterfall fetches on load, and restricts data retrieval to the user's own session ID:
```typescript
const activeSessions = await prisma.userSession.findMany({
  where: { userId: session.userId, status: 'Active', expiresAt: { gt: new Date() } },
  orderBy: { lastAccessAt: 'desc' }
});
```

### 3. Server Action for Session Revocation
A Server Action `terminateSessionAction(sessionId)` will handle revocation. It validates that the session belongs to the actor before setting the status to `Revoked` in the database, writing an audit log, and calling `revalidatePath('/account/profile')` to refresh the UI.

## Risks / Trade-offs

- **Vercel Blob Storage Private Access**: Using `access: 'private'` requires routing all image requests through a GET handler that signs the requests. This incurs a tiny performance cost on image load but prevents unauthorized access to profile images.
- **Metadata Parsing**: User session browser and OS attributes are parsed from the raw user agent string saved during authentication. If the user agent is missing, a fallback display (e.g. "Unknown Device") will be used.
