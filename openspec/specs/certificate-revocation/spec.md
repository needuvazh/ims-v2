# certificate-revocation Specification

## Purpose
TBD - created by archiving change certificate-management. Update Purpose after archive.
## Requirements
### Requirement: Revoke Certificate
The system SHALL support the revocation of an issued certificate. Revocation requires a mandatory reason, transitions the status to "Revoked", records the revoking user, timestamp, and reason on the Certificate record, and sends a transaction audit log.

#### Scenario: Revoke certificate successfully
- **WHEN** An authorized manager revokes an issued certificate with a reason "Student failed post-audit verification"
- **THEN** The certificate status changes to "Revoked", `revokedAt` is set, `revokedBy` records the manager ID, `revocationReason` stores the reason text, and the action is audited.

---

### Requirement: Verify Revoked Certificate
The public verification endpoint MUST identify revoked certificates and prevent them from verifying as valid.

#### Scenario: Verify revoked certificate
- **WHEN** A verifier queries a certificate that has been revoked
- **THEN** The verification status returned is `REVOKED` and the certificate details indicate it is no longer valid.

