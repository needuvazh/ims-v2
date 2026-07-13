## Why

The current profile page is aesthetically plain and lacks core self-service capabilities. Users cannot customize their profile image, monitor their active sessions, or view their login history. Providing these features improves security awareness and enhances user experience.

## What Changes

1. **Profile Photo Management**: Add an interactive profile photo upload widget with drag-and-drop/file-picker support, hover overlays, and backend integration using Vercel Blob storage.
2. **Visual Enhancements**: Redesign the profile page with a premium, responsive two-column layout: visual identity card (avatar, details, badges) on the left, editable form fields on the right, and read-only administrative fields grouped separately.
3. **Sidebar Avatar**: Dynamically fetch and display the user's uploaded avatar in the main AppShell sidebar.
4. **Active Sessions Audit**: Display a list of all active sessions for the logged-in user, highlight the current session, and allow revoking any other sessions.
5. **Login History Audit**: Display the latest 5 login attempts (status, IP address, device, timestamp) with a "View More" modal dialog listing up to 50 records.

## Capabilities

### New Capabilities
- `user-profile-photo`: Uploading, viewing, and deleting profile images for portal users.
- `user-security-audit`: Monitoring active sessions, revoking sessions, and listing login history for self-auditing.

### Modified Capabilities
- `iam-user-management`: Expose photo and audit logs to the user profile view.

## Impact

- **Owning Context**: Identity & Access Management (IAM).
- **APIs & Routes**:
  - `POST /api/v1/users/[id]/profile-photo` (upload image)
  - `GET /api/v1/users/[id]/profile-photo/view` (stream image)
- **Database**:
  - Modifies `Person` table (`photoUrl`).
  - Queries `UserSession` and `LoginHistory`.
  - Appends to `AuditLog` for photo changes and revoked sessions.
- **Portals**:
  - Admin Portal (`admin-portal`) layout and profile pages.
