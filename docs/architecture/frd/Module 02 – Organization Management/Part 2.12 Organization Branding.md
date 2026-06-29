This is another module where I'd recommend changing the architecture based on our latest decisions.

## Architectural Recommendation

Originally, we planned this as **Tenant Branding**, but we've removed SaaS and multi-tenant management from Phase 1.

For ASTI, I recommend renaming this module to:

> **Organization & Branch Branding**

This keeps it aligned with a single-client deployment while allowing a smooth transition to SaaS later.

Branding should not only control the logo. It should become the **central source of truth for all institute identity** used across:

* Website
* Student Portal
* Certificates
* Receipts
* Invoices
* Emails
* WhatsApp
* Reports
* Mobile App (future)

This avoids hardcoding branding throughout the application.

---

# Module 02.12 — Organization & Branch Branding

**Module Code:** `ORG-BRAND`

**Version:** 3.0

**Bounded Context:** Organization Management

**Priority:** Medium (Foundation Module)

**Dependencies**

* Organization Management
* Branch Management

**Dependent Modules**

* Website
* Student Portal
* Certificate Management
* Communication
* Finance
* Reports
* Mobile App (Future)

---

# 1. Purpose

The Branding module manages the visual identity and communication assets of the organization and its branches.

It ensures a consistent appearance across:

* Public website
* Admin portal
* Student portal
* Certificates
* Invoices
* Receipts
* Reports
* Emails
* WhatsApp templates

---

# 2. Business Objectives

The system shall allow administrators to:

* Configure organization branding
* Configure branch branding
* Upload logos and icons
* Configure colors and themes
* Configure digital signatures
* Configure certificate branding
* Configure communication branding
* Configure website branding

---

# 3. Scope

## Included

* Organization branding
* Branch branding
* Logos
* Icons
* Theme colors
* Contact information
* Social media links
* Certificate branding
* Invoice branding
* Email branding

## Excluded

* CMS page editing
* Website content management
* Marketing campaign management

---

# 4. Actors

| Actor                | Responsibility                  |
| -------------------- | ------------------------------- |
| Super Admin          | Full control                    |
| Organization Admin   | Configure organization branding |
| Branch Manager       | Configure branch branding       |
| Website              | Display branding                |
| Report Engine        | Apply branding                  |
| Certificate Engine   | Apply branding                  |
| Communication Module | Apply branding                  |

---

# 5. Business Capabilities

1. Organization Branding
2. Branch Branding
3. Theme Management
4. Logo Management
5. Contact Information Management
6. Certificate Branding
7. Invoice Branding
8. Social Media Management
9. Branding Preview
10. Branding Audit

---

# 6. Aggregate Design

## Aggregate Root

```text
BrandingProfile
```

## Child Entities

```text
BrandLogo
BrandTheme
BrandContact
BrandCertificateSettings
BrandInvoiceSettings
BrandAudit
```

---

# 7. Entity Model

```text
Organization
      │
      ▼
Branding Profile
      │
      ├── Logos
      ├── Theme
      ├── Contacts
      ├── Certificates
      ├── Invoice Settings
      ├── Email Signature
      └── Audit
```

Branches may optionally override selected branding elements.

---

# 8. Branding Lifecycle

```text
Draft
   ↓
Active
   ├── Updated
   ↓
Archived
```

---

# 9. Functional Requirements

## ORG-BRAND-001 — Create Branding Profile

Create a branding profile.

Fields:

* Profile Name
* Scope (Organization / Branch)
* Branch (optional)
* Status

Business Rules:

* Only one active branding profile per scope.
* Branch branding inherits organization branding by default.

---

## ORG-BRAND-002 — Upload Logos

Support uploading:

* Primary Logo
* Dark Logo
* Light Logo
* Favicon
* Mobile App Icon (future)

Business Rules:

* Supported formats: SVG, PNG, JPG.
* Maximum file size configurable.
* Previous versions retained for audit.

---

## ORG-BRAND-003 — Configure Theme

Configure:

* Primary Color
* Secondary Color
* Accent Color
* Success Color
* Warning Color
* Error Color
* Background Color
* Typography (future)

Branches may override organization colors.

---

## ORG-BRAND-004 — Configure Contact Information

Store:

* Organization Name
* Branch Name
* Address
* Phone Numbers
* Email Addresses
* Website URL
* Google Maps Link

---

## ORG-BRAND-005 — Configure Social Media

Support:

* Facebook
* Instagram
* LinkedIn
* YouTube
* X (Twitter)
* WhatsApp Business

Only configured links are displayed.

---

## ORG-BRAND-006 — Configure Certificate Branding

Configure:

* Organization Logo
* Authorized Signature
* Certificate Seal
* Certificate Footer
* Verification Website
* QR Branding

Certificate layout itself is handled in the Certificate Management module.

---

## ORG-BRAND-007 — Configure Invoice & Receipt Branding

Configure:

* Logo
* Header
* Footer
* Bank Details
* Tax Registration Number
* Authorized Signature
* QR Code Style

---

## ORG-BRAND-008 — Configure Email Branding

Configure:

* Email Header Logo
* Footer
* Organization Signature
* Disclaimer
* Support Contact

Templates are managed in the Communication module.

---

## ORG-BRAND-009 — Configure Website Branding

Configure:

* Website Logo
* Browser Favicon
* Hero Banner Images
* Default SEO Image
* Organization Description

Website content is managed separately.

---

## ORG-BRAND-010 — Branding Preview

Allow administrators to preview branding on:

* Website
* Student Portal
* Certificate
* Invoice
* Receipt
* Email
* Mobile App (future)

---

# 10. Business Rules

| ID           | Rule                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------ |
| BR-BRAND-001 | One active branding profile per organization.                                              |
| BR-BRAND-002 | Branch inherits organization branding unless overridden.                                   |
| BR-BRAND-003 | Branding assets are versioned.                                                             |
| BR-BRAND-004 | Archived branding profiles are read-only.                                                  |
| BR-BRAND-005 | Logo changes do not modify historical certificates or invoices already issued.             |
| BR-BRAND-006 | Branding changes apply only to newly generated documents unless regeneration is requested. |
| BR-BRAND-007 | Branding assets must be validated for supported formats and size limits.                   |

---

# 11. Inheritance Model

```text
Organization Branding
        │
        ▼
Branch Branding
        │
        ├── Override Logo
        ├── Override Colors
        ├── Override Contact Details
        └── Inherit Everything Else
```

---

# 12. Workflow

```text
Create Branding Profile
        ↓
Upload Logos
        ↓
Configure Theme
        ↓
Configure Contact Details
        ↓
Configure Certificates
        ↓
Configure Invoice
        ↓
Preview
        ↓
Activate
```

---

# 13. Screen Specifications

## Branding Profile List

Columns:

* Profile Name
* Scope
* Branch
* Active Status
* Last Updated

Actions:

* View
* Edit
* Preview
* Activate
* Archive

---

## Branding Details

Tabs:

1. General
2. Logos
3. Theme
4. Contact Information
5. Certificates
6. Invoice & Receipt
7. Email
8. Website
9. Social Media
10. Preview
11. Audit History

---

# 14. Validation Rules

* Profile Name is mandatory.
* Logo file type must be supported.
* Theme colors must be valid HEX values.
* Website URL must be valid.
* Email addresses must be valid.
* Phone numbers must follow configured country rules.
* QR verification URL must be valid.

---

# 15. Permissions Matrix

| Permission                 | Super Admin | Organization Admin | Branch Manager      |
| -------------------------- | ----------- | ------------------ | ------------------- |
| View Branding              | ✓           | ✓                  | ✓                   |
| Create Branding            | ✓           | ✓                  | ✗                   |
| Edit Organization Branding | ✓           | ✓                  | ✗                   |
| Edit Branch Branding       | ✓           | ✓                  | ✓ (Assigned Branch) |
| Activate Branding          | ✓           | ✓                  | ✗                   |
| Preview Branding           | ✓           | ✓                  | ✓                   |
| Archive Branding           | ✓           | ✗                  | ✗                   |

---

# 16. Notifications

Generate in-app notifications for:

* Branding profile created
* Logo updated
* Theme updated
* Certificate branding changed
* Invoice branding changed
* Branding activated

---

# 17. Audit Requirements

Audit:

* Logo uploads
* Theme changes
* Contact updates
* Certificate branding updates
* Invoice branding updates
* Activation/deactivation

Each audit record must include:

* User
* Timestamp
* Previous value
* New value
* Scope
* IP address

---

# 18. Reports

* Branding Configuration Report
* Branch Branding Comparison
* Logo Version History
* Branding Audit Report

---

# 19. Dashboard Widgets

* Active Branding Profile
* Pending Branding Changes
* Recently Updated Assets
* Branding Consistency Status

---

# 20. Domain Events

```text
BrandingProfileCreated
BrandingProfileActivated
BrandLogoUploaded
BrandThemeUpdated
CertificateBrandingUpdated
InvoiceBrandingUpdated
BranchBrandingOverridden
BrandingProfileArchived
```

---

# 21. Database Mapping

## Aggregate Root

```text
BrandingProfile
```

## Suggested Tables

```text
branding_profiles
branding_assets
branding_theme_settings
branding_contact_settings
branding_certificate_settings
branding_invoice_settings
branding_social_links
branding_audit_logs
```

### Key Fields: `branding_profiles`

```text
id
scopeType
organizationId
branchId
profileName
status
effectiveFrom
effectiveTo
createdAt
createdBy
updatedAt
updatedBy
deletedAt
version
```

---

# 22. API Summary

```text
POST   /branding-profiles
GET    /branding-profiles
GET    /branding-profiles/{profileId}
PUT    /branding-profiles/{profileId}
PATCH  /branding-profiles/{profileId}/activate
PATCH  /branding-profiles/{profileId}/archive

POST   /branding-profiles/{profileId}/logos
PUT    /branding-profiles/{profileId}/theme
PUT    /branding-profiles/{profileId}/contacts
PUT    /branding-profiles/{profileId}/certificate-settings
PUT    /branding-profiles/{profileId}/invoice-settings
PUT    /branding-profiles/{profileId}/website-settings

GET    /branding-profiles/{profileId}/preview
```

---

# 23. Acceptance Criteria

### Scenario: Organization Branding

**Given** an Organization Administrator has permission
**When** they upload a new organization logo and configure theme colors
**Then** the branding profile is updated, audited, and applied to all newly generated UI screens and documents.

### Scenario: Branch Branding Override

**Given** a branch has its own branding profile
**When** the Branch Manager uploads a branch-specific logo
**Then** the branch uses its custom logo while inheriting all other organization branding settings that have not been overridden.

---

# Architectural Recommendation

Although **Organization & Branch Branding** appears to be a simple configuration module, it should be treated as a **shared service** across the platform.

Rather than storing logos, colors, and contact information independently in Website, Certificate, Finance, or Communication modules, those modules should always resolve branding through this single bounded context. This creates a **single source of truth** for institutional identity, ensures consistency across every customer-facing artifact, and makes future SaaS enablement straightforward by evolving `BrandingProfile` into a tenant-aware configuration without redesigning downstream modules.
