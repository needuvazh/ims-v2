## ADDED Requirements

### Requirement: document-upload-intent

The system SHALL validate the intended document owner, document type, and branch scope, and verify that the file metadata complies with upload policies before issuing an upload intent token.

#### Scenario: Valid Upload Intent Handshake

- **WHEN** the authenticated user has `document.create` permission, and the target owner is active, and the user's branch scope intersects with the owner's branch scope, and the file name/size are valid.
- **THEN** the system generates a collision-safe Vercel Blob pathname and returns a short-lived upload token to the client.

#### Scenario: Reject Upload Intent for Cross-Branch Owner

- **WHEN** the authenticated user attempts to request an upload intent for an owner whose branch scope falls outside the user's effective IAM branches.
- **THEN** the request is rejected with `403 DOC_BRANCH_SCOPE_DENIED` and no upload token is generated.

---

### Requirement: document-registration

The system SHALL register the completed Blob upload, persist the `fileKey` and `fileName` metadata, and initialize the verification status to Pending.

#### Scenario: Register Successful Upload

- **WHEN** Vercel Blob reports successful binary storage, and the registration request matches a valid upload intent, and the database commit succeeds.
- **THEN** a `Document` record is created in the database with `status = Active`, a `DocumentOwner` mapping is created, a `DocumentVerification` row is initialized with `outcome = Pending`, and an audit event is emitted.

---

### Requirement: verification-decision

The system SHALL support atomic verification decisions (Approve or Reject) on pending documents, write an append-only decision history row, and update verifier summary fields.

#### Scenario: Approve Pending Verification

- **WHEN** the authenticated user has `document.verify.approve`, and the document status is `Active` and latest verification outcome is `Pending`, and the user is in the document branch scope.
- **THEN** the latest `DocumentVerification` record is updated or created with `outcome = Verified`, the verifier summary fields are populated, the document remains `status = Active`, and a transactional audit record is saved.

#### Scenario: Reject Pending Verification with Mandatory Remarks

- **WHEN** the authenticated user has `document.verify.reject`, and the latest verification outcome is `Pending`, and the user submits a rejection with non-empty remarks.
- **THEN** a `DocumentVerification` record is written with `outcome = Rejected`, the remarks are saved, and the document remains `status = Active`.

---

### Requirement: branch-isolation

The system SHALL enforce server-side branch scoping on every query, direct-ID lookup, metadata mutation, and secure file access request.

#### Scenario: Access Denied for Direct-ID Bypass

- **WHEN** a user guesses a valid document UUID but is not assigned to the document's `branchId` (or child/consolidated scopes).
- **THEN** the request is denied with a `404 DOC_NOT_FOUND` response, hiding the existence of the document.

---

### Requirement: document-expiry-evaluation

The system SHALL run a background scheduler to transition documents whose calendar expiry date has passed.

#### Scenario: Scheduled Expiry Transition

- **WHEN** the scheduled job runs, and the current Oman calendar date is greater than the document's `expiryDate`.
- **THEN** the document status transitions to `status = Expired` and a `DocumentExpired` event is recorded.
