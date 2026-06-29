## 1. Portal Foundation

- [x] 1.1 Add the IAM admin portal route shell and navigation entry points under the protected admin app
- [x] 1.2 Move the legacy `/identity` routes to the clearer `/iam` route family and route users into the complete IAM console entry flow
- [x] 1.3 Create shared IAM screen chrome for breadcrumbs, an active branch switcher/dropdown, permission-gated actions, and consistent page headers
- [x] 1.4 Add shared empty, loading, and unauthorized state components for IAM screens

## 2. Users Screen Family

- [x] 2.1 Expand the users list screen to use the current IAM statuses, branch-scoped filters, and approved labels
- [x] 2.2 Add user detail and edit screens that show person, branch, role, and status information
- [x] 2.3 Add user lifecycle action controls for activate, suspend, archive, unlock, admin password reset, and resend activation flows
- [x] 2.4 Add user role and branch assignment screens or panels that reflect the backend assignments, including the ability to set a default branch
- [x] 2.5 Add user create form with mandatory role and branch assignment to handle the `PendingActivation` flow

## 3. Roles and Permissions Screens

- [x] 3.1 Expand Roles details to show assigned users and support archiving
- [x] 3.2 Add Role create and edit forms (name, description, active/archived status, effective dates)
- [x] 3.3 Add role permission management UI for assigning and removing permissions
- [x] 3.4 Update the permission catalog screen to support the IAM module, feature, type, and status filters
- [x] 3.5 Add permission create, edit, and archive forms to manage the complete permission lifecycle

## 4. Sessions and Security Screens

- [ ] 4.1 Add a session management screen for listing active sessions and terminating one or all sessions for a user
- [ ] 4.2 Add a security policy screen for viewing and editing IAM security policy values
- [ ] 4.3 Add a login history screen for browsing authentication attempts and lockout-related activity

## 5. Audit, Reports, and Dashboards

- [x] 5.1 Add an audit trail screen with branch-scoped filtering and detail inspection
- [x] 5.2 Add IAM report screens for user directory, user access, login history, failed logins, locked accounts, password resets, roles, permission matrix, branch access, privileged users, security events, permission changes, sessions, and audit trail exports
- [ ] 5.3 Add report export job status and download affordances
- [x] 5.4 Add IAM dashboard KPI screens for security, administration, and compliance views, ensuring KPIs link to filtered reports and audit screens

## 6. Tests, Accessibility, and Verification

- [ ] 6.1 Add UI tests for the portal shell, navigation visibility, and branch context display
- [ ] 6.2 Add UI tests for users, roles, permissions, sessions, and security policy screens
- [ ] 6.3 Add UI tests for audit, reports, dashboard, empty states, and validation failures
- [ ] 6.4 Verify keyboard navigation, focus order, and responsive behavior for the new IAM screens
- [ ] 6.5 Run the affected portal typecheck, lint, and build checks
- [ ] 6.6 Update `docs/project-status.md` or the relevant implementation status note if the IAM UI phase materially changes completion tracking

## 7. Public Auth Screens

- [x] 7.1 Add an unauthenticated "Activate Account" screen to handle email token activation
- [x] 7.2 Add a "Mandatory Password Change" screen to handle 90-day password expiry enforcement
- [ ] 7.3 Update the login screen to support a "Remember me" checkbox and gracefully display concurrent session limit (`IAM-AUTH-008`) errors
- [x] 7.4 Ensure public screens properly redirect to the portal upon successful completion
- [ ] 7.5 Add an authenticated "Change Password" screen to the portal user profile/settings area
