# ASTI IMS Solution Design Specification (SDS)

# Module 01 – Identity & Access Management (IAM)

# Part 3

## Screen Specification

## Navigation Structure

## UI Components

## Field Specifications

## Validation Rules

## UX Guidelines

**Version:** 3.0

---

# 1. Module Navigation

## 1.1 Navigation Hierarchy

```text
Identity & Access Management
│
├── Dashboard
│
├── User Management
│      ├── Users
│      ├── Create User
│      ├── User Details
│      ├── User Activity
│      ├── Login History
│      └── Active Sessions
│
├── Role Management
│      ├── Roles
│      ├── Create Role
│      ├── Role Permissions
│      └── Role Users
│
├── Permission Management
│      ├── Permissions
│      ├── Permission Groups
│      └── Resource Actions
│
├── Branch Access
│      ├── Branch Assignment
│      ├── Branch Hierarchy
│      └── Data Scope
│
├── Security
│      ├── Password Policy
│      ├── Session Policy
│      ├── Login Policy
│      ├── Account Lock Policy
│      └── Device Policy
│
├── Audit
│      ├── Login History
│      ├── Audit Trail
│      ├── Failed Logins
│      └── Security Events
│
└── System Configuration
       ├── Authentication
       ├── JWT Configuration
       ├── Email Templates
       └── Notification Rules
```

---

# 2. Screen Inventory

| Screen ID | Screen Name       | Type     |
| --------- | ----------------- | -------- |
| IAM-001   | Login             | Public   |
| IAM-002   | Forgot Password   | Public   |
| IAM-003   | Reset Password    | Public   |
| IAM-004   | Dashboard         | Private  |
| IAM-005   | User List         | CRUD     |
| IAM-006   | Create User       | Form     |
| IAM-007   | User Details      | Details  |
| IAM-008   | Edit User         | Form     |
| IAM-009   | User Timeline     | Details  |
| IAM-010   | Login History     | Report   |
| IAM-011   | Active Sessions   | Report   |
| IAM-012   | Roles             | CRUD     |
| IAM-013   | Create Role       | Form     |
| IAM-014   | Role Details      | Details  |
| IAM-015   | Permissions       | CRUD     |
| IAM-016   | Branch Assignment | CRUD     |
| IAM-017   | Password Policy   | Settings |
| IAM-018   | Session Policy    | Settings |
| IAM-019   | Security Events   | Report   |
| IAM-020   | Audit Logs        | Report   |

---

# 3. Screen Specification

---

# IAM-001 Login Screen

## Purpose

Authenticate users into ASTI IMS.

---

## Actors

* Internal User
* Student (Future)
* Corporate User (Future)

---

## Layout

```text
+----------------------------------------------------+
|                    ASTI LOGO                        |
|                                                    |
|               Welcome Back                         |
|                                                    |
| Email Address                                      |
| [______________________________]                   |
|                                                    |
| Password                                           |
| [______________________________]                   |
|                                                    |
| ☑ Remember Me                                      |
|                                                    |
| [ Login ]                                          |
|                                                    |
| Forgot Password?                                   |
|                                                    |
+----------------------------------------------------+
```

---

## Fields

| Field       | Type     | Required |
| ----------- | -------- | -------- |
| Email       | Email    | Yes      |
| Password    | Password | Yes      |
| Remember Me | Checkbox | No       |

---

## Buttons

* Login
* Forgot Password

---

## Validation

Email

```text
Required

Valid email format
```

Password

```text
Required
Minimum 12 chars
```

---

## Success

Redirect:

```text
Dashboard
```

---

## Failure

Show inline error.

Never expose:

```text
Email exists

Password wrong
```

Always show

```text
Invalid credentials.
```

---

# IAM-002 User List

## Purpose

Search and manage users.

---

## Toolbar

```text
New User

Import

Export

Refresh

Bulk Actions
```

---

## Filters

```text
Name

Email

Role

Department

Branch

Status

Last Login

Locked

Created Date
```

---

## Grid Columns

| Column          |
| --------------- |
| User ID         |
| Name            |
| Email           |
| Mobile          |
| Branch          |
| Department      |
| Roles           |
| Status          |
| Last Login      |
| Active Sessions |
| Actions         |

---

## Row Actions

```text
View

Edit

Reset Password

Lock

Unlock

Suspend

Activate

Assign Role

Assign Branch

Login History

Sessions

Archive
```

---

## Bulk Actions

```text
Activate

Suspend

Reset Password

Export

Archive
```

---

# IAM-003 Create User

---

## Purpose

Create a new internal user.

---

## Sections

### Personal Information

```text
First Name

Last Name

Email

Mobile

Employee Code

Photo
```

---

### Organization

```text
Branch

Department

Designation

Reporting Manager
```

---

### Access

```text
Roles

Default Branch

Additional Branches

Language

Time Zone
```

---

### Security

```text
Force Password Change

Require MFA (Future)

Account Expiry

Password Never Expires

Can Login
```

---

### Notifications

```text
Send Welcome Email

Send Temporary Password

Notify Manager
```

---

## Footer

```text
Save

Save & New

Cancel
```

---

# IAM-004 User Details

Tabs

```text
Overview

Roles

Permissions

Branches

Sessions

Login History

Audit

Documents (Future)
```

---

# IAM-005 Role Management

---

Grid

```text
Role Code

Role Name

Users

Permissions

Created By

Status
```

---

Actions

```text
Create

Duplicate

Archive

Compare Roles

Export
```

---

# IAM-006 Role Details

Sections

```text
General

Permissions

Menus

Reports

Dashboards

API Access

Assigned Users
```

---

# IAM-007 Permission Management

Permission Tree

```text
Students

Read

Create

Update

Delete

-------------------

Courses

Read

Publish

Archive

-------------------

Finance

Invoices

Refunds

Payments

Reports
```

Tree supports

```text
Expand

Collapse

Search

Select All

Clear
```

---

# IAM-008 Branch Assignment

Layout

```text
Available Branches

↓

Selected Branches
```

Options

```text
Default Branch

View Child Branches

View Consolidated Data

Read Only
```

---

# IAM-009 Password Policy

Fields

```text
Minimum Length

Maximum Length

Uppercase

Lowercase

Numbers

Special Characters

History Count

Expiry Days

Lock Attempts

Lock Duration
```

---

# IAM-010 Login History

Columns

```text
Date

User

Browser

Device

OS

IP

Location

Result

Failure Reason
```

---

# IAM-011 Active Sessions

Columns

```text
Session ID

User

Browser

Device

IP

Started

Last Activity

Status
```

Actions

```text
Terminate

Terminate All
```

---

# IAM-012 Audit Log

Filters

```text
User

Action

Entity

Date

Branch

Module

IP
```

Grid

```text
Date

User

Action

Old Value

New Value

Entity

IP
```

---

# 4. UI Component Library

## Buttons

Primary

```text
Save
```

Secondary

```text
Cancel
```

Danger

```text
Delete
```

Warning

```text
Suspend
```

Success

```text
Activate
```

---

## Input Components

```text
Textbox

Email

Password

Phone

Autocomplete

Tree Select

Date

DateTime

Switch

Checkbox

Radio

Dropdown

Multi Select

Tag Input

Avatar Upload
```

---

## Data Components

```text
Data Grid

Card

Tabs

Timeline

Accordion

Tree

Modal

Drawer

Stepper

Breadcrumb

Pagination
```

---

# 5. Field Specification Standards

Example

## Email

| Property   | Value |
| ---------- | ----- |
| Type       | Email |
| Required   | Yes   |
| Unique     | Yes   |
| Max Length | 255   |
| Searchable | Yes   |
| Sortable   | Yes   |
| Exportable | Yes   |
| Filterable | Yes   |

---

## Mobile

```text
Required

Unique

Country Code

E.164 format
```

---

## Role

```text
Multi Select

Searchable

Active Roles Only
```

---

# 6. Validation Standards

## Required Fields

Show

```text
*
```

---

## Inline Validation

Example

```text
Email already exists.
```

---

## Form Validation

Validate

Before Save

On Blur

On Submit

---

## Cross-field Validation

Example

```text
Password

Confirm Password

Must Match
```

---

# 7. Empty States

User List

```text
No users found.

Create your first user.
```

Role List

```text
No roles available.
```

---

# 8. Loading States

Buttons

```text
Saving...
```

Grid

Skeleton loading

Forms

Progress indicator

---

# 9. Error Handling

Example

```text
Network unavailable.

Please try again.
```

Permission

```text
You do not have permission.
```

Server

```text
Unexpected error occurred.
```

---

# 10. Accessibility Standards

The UI should conform to **WCAG 2.2 AA** wherever practical.

Requirements include:

* Full keyboard navigation.
* Visible focus indicators.
* Screen reader support (ARIA labels for interactive elements).
* Minimum 4.5:1 text contrast ratio.
* Error messages associated with form controls.
* Logical tab order.
* Responsive layouts for desktop, tablet, and mobile.

---

# 11. UX Guidelines

## General Principles

* Minimize clicks for common administrative tasks.
* Keep forms segmented into logical sections.
* Preserve user input on validation failures.
* Use optimistic UI updates where appropriate for non-critical operations.
* Provide confirmation dialogs only for destructive actions.

## Navigation

* Breadcrumbs on all administration pages.
* Persistent left navigation.
* Global search for users, roles, and permissions.
* Recently viewed items for administrators.

## Data Grids

* Column sorting.
* Multi-column filtering.
* Saved filter presets.
* Export to Excel/CSV.
* Configurable column visibility.
* Pagination with server-side search.

---

## Deliverables of Part 3

The IAM specification now includes:

* Complete navigation hierarchy
* Screen inventory (20 screens)
* Detailed screen specifications
* Form layouts and sections
* Grid definitions
* Field standards
* UI component catalogue
* Validation standards
* Error handling
* Accessibility requirements
* UX guidelines
