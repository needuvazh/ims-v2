## ADDED Requirements

### Requirement: Submit Reissue Request
The system SHALL support submitting a reissue request for an existing issued certificate. The request MUST capture the original certificate ID, the requesting operator's ID, and a mandatory reason (10 to 1000 characters). The initial status of the request MUST be "PendingReview".

#### Scenario: Submit valid reissue request
- **WHEN** An operator requests a reissue with a reason "Corrected spelling of student name"
- **THEN** A CertificateReissueRequest is persisted in "PendingReview" status, and no replacement certificate is created.

#### Scenario: Reject request when another request is open
- **WHEN** A reissue request is already in a non-terminal status ("PendingReview" or "Approved") for the same certificate
- **THEN** A new request is blocked with error code "REISSUE_REQUEST_ALREADY_OPEN".

---

### Requirement: Review Reissue Request
The system SHALL allow authorized managers to approve or reject a pending reissue request. Rejections MUST require remarks. Approvals MUST record the approver's user ID and timestamp.

#### Scenario: Approve reissue request
- **WHEN** An authorized manager approves a pending reissue request
- **THEN** The request status becomes "Approved", and the decision is audited.

---

### Requirement: Generate Replacement Certificate
The system SHALL generate a new replacement certificate only when linked to an approved reissue request. The replacement certificate MUST have a new unique number and verification code. The original certificate status MUST transition to "Replaced" / "Superseded", and `newCertificateId` MUST link the two.

#### Scenario: Generate replacement successfully
- **WHEN** An operator requests replacement generation for an approved reissue request
- **THEN** A new replacement Certificate is created in "Issued" status, its ID is set in the reissue request's `newCertificateId`, the original certificate status changes to "Replaced", and the lineage is traceable.
