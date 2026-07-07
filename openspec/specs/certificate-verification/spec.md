# certificate-verification Specification

## Purpose
TBD - created by archiving change certificate-management. Update Purpose after archive.
## Requirements
### Requirement: Public Verification
The system SHALL provide an unauthenticated verification route that resolves a certificate using its opaque verification code or QR link. The verification response MUST be privacy-minimized and rate-limited.

#### Scenario: Verify active certificate successfully
- **WHEN** A verifier queries a valid issued certificate's code
- **THEN** The system returns `VALID` along with the certificate number, student display name, course name, language, and issued date. No student IDs or financial details are exposed.

#### Scenario: Query invalid code
- **WHEN** A verifier queries a nonexistent or malformed verification code
- **THEN** The system returns a generic `NOT_FOUND` response without revealing system metadata.

---

### Requirement: Record Verification Activity
The system SHALL record an append-only verification log for each matched query, capturing the certificate ID, verification status, timestamp, and client IP (subject to privacy policy).

#### Scenario: Log successful verification
- **WHEN** A certificate is successfully verified by code
- **THEN** A CertificateVerification log is inserted linking to the certificate, capturing the timestamp and outcome status.

