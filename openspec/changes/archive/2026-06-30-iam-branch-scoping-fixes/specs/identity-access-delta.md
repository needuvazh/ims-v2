## ADDED Requirements

### Requirement: Branch Scoping on Directory Operations
The system SHALL restrict directory-level read, write, and lifecycle operations on users based on the active session's branch scope.

#### Scenario: Listing users is branch-scoped
- **WHEN** an operator with branch-scoped access queries the user directory
- **THEN** only users who have active assignments to that branch (or its descendants, if hierarchy traversal is enabled) SHALL be returned

#### Scenario: Accessing user details directly is branch-scoped
- **WHEN** an operator with branch-scoped access requests a specific user's details or edit page
- **THEN** the system SHALL reject the request with a `forbidden` DomainError if the target user does not belong to the operator's active branch scope list

#### Scenario: Restricting target branch assignments on create/update
- **WHEN** an operator attempts to assign a user to one or more branches during creation or profile update
- **THEN** the system SHALL reject the assignment and throw a `forbidden` DomainError if any target branch is not actively managed/owned by the operator

#### Scenario: Branch scoping on lifecycle actions
- **WHEN** an operator invokes a user lifecycle action (activate, suspend, archive, unlock, password reset, resend activation email)
- **THEN** the system SHALL reject the action with a `forbidden` DomainError if the target user does not belong to the operator's active branch scope list

#### Scenario: Session termination is branch-scoped
- **WHEN** an operator with branch-scoped access lists or terminates user sessions
- **THEN** the system SHALL reject the action with a `forbidden` DomainError if the target user does not belong to the operator's active branch scope list

### Requirement: Hierarchical Branch Scoping
The system SHALL resolve the allowed branch list recursively down the organization structure when child branch inclusion is active.

#### Scenario: Parent branch access resolves children
- **WHEN** a user is assigned to Branch A with `includeChildBranches` set to true, and Branch A is parent to Branch B and Branch C
- **THEN** the user's allowed branch ID list SHALL include `[A, B, C]`

#### Scenario: Child branch access does not resolve ancestors
- **WHEN** a user is assigned to Branch C (which is child to Branch A)
- **THEN** the user's allowed branch ID list SHALL NOT include Branch A
