## ADDED Requirements

### Requirement: Conditional Financial Scoping in CRM
The Payments & Invoices tab within the handoff console MUST enforce strict permission-based conditional rendering.

#### Scenario: Counselor with Invoice Read Permission
- **WHEN** A counselor with `finance.invoice.read` permission views the handoff console.
- **THEN** The console MUST render a "Payments & Invoices" tab showing details of outstanding dues, invoice numbers, statuses, and links to invoices.

#### Scenario: Counselor without Invoice Read Permission
- **WHEN** A counselor without `finance.invoice.read` permission views the handoff console.
- **THEN** The console MUST NOT render a detailed invoices list or payment amounts, but MUST instead display a simple text representation of the payment validation status (e.g., `Payment Status: Pass` or `Payment Status: Pending`) derived from the enrollment's course completion record.
