## ADDED Requirements

### Requirement: Person Resolution via National ID
The system SHALL resolve a coordinator's identity by Civil Number/National ID when registering a contact. If a Person already exists with the same National ID, the system MUST reuse that record and link it to the B2B CorporateAccount, rather than creating a duplicate Person record.

#### Scenario: Registering a contact with an existing National ID
- **WHEN** the user registers a coordinator with National ID "NID-778899", name "Fatma Al-Riyami", email "fatma@alsaud.om", and phone "+968 9333 4444"
- **THEN** the system SHALL check if a Person exists with "NID-778899", reuse that Person ID, link the existing Person as a CorporateContact for the account, and update their mobile/email fields.

### Requirement: Single Primary Contact Invariant
Each corporate account SHALL have at most one primary contact marked at any given time. If a contact is set as primary, any other contact in the same corporate account that was previously marked as primary MUST be automatically unmarked.

#### Scenario: Switching the primary B2B contact
- **WHEN** a new contact "Sara Al-Hadi" is marked as primary (`isPrimary=true`) under an account that already has "Mazin Al-Oufi" set as primary
- **THEN** the system SHALL set "Sara Al-Hadi" as primary, set "Mazin Al-Oufi" as non-primary, and run these updates inside a single database transaction block.

### Requirement: Point of Contacts Directory Projections
The point of contacts tab view inside B2B Cockpit SHALL render designations, departments, mobile, email, primary flag, and portal access permissions.

#### Scenario: Viewing contacts checklist in cockpit tab
- **WHEN** an authorized administrator clicks the "Contacts Directory" tab under the B2B Corporate cockpit
- **THEN** the system SHALL load and list all active corporate contacts, highlighting primary status and offering triggers to edit or deactivate.
