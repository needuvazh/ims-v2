# Client Master Data Collection Workbook
## Institute Management System (IMS) v2.0 - Onboarding & Seeding Guide

This document defines the structured data templates required to set up the system database for a training institute.

To ensure a smooth onboarding process, please copy these tables into spreadsheet formats (e.g., Microsoft Excel or Google Sheets), populate them with your institute's details, and return them to the engineering team.

---

## 📅 General Guidelines for Data Entry

1. **Unique Identifiers (Codes):** 
   - Fields ending in `Code` (e.g., `Branch Code`, `Course Code`, `Trainer Code`) are unique, case-sensitive identifiers used by the system.
   - Use uppercase alphanumeric characters, numbers, and hyphens only (e.g., `MCT-HQ`, `IT-PY-101`, `TR-104`). Do **not** use spaces or special characters.
2. **Date Format:** Use the standard ISO format: `YYYY-MM-DD` (e.g., `2026-06-22`).
3. **Phone Numbers:** Always include the country code (e.g., `+968` for Oman, `+966` for Saudi Arabia, `+91` for India) followed by the number.
4. **Boolean Fields (Yes/No):** Write `TRUE` for yes, and `FALSE` for no.
5. **Money / Prices:** Specify all currency figures without formatting symbols (e.g., write `150.000` instead of `OMR 150/-`). Omani Rial values should ideally go up to 3 decimal places.

---

## 🏢 Section 1: Organization & Branch Setup

This section configures your overall institute structure, physical/online branches, and classrooms.

### 1.1 Institute Profile (General Settings)
*Provide a single row containing the legal headquarters registration details.*

| Field Name | Type / Constraint | Description | Example Value |
| :--- | :--- | :--- | :--- |
| **Institute Code** | String (Max 50), Required, Unique | Short prefix identifier for the overall institute | `AST-HQ` |
| **Institute Name** | String (Max 255), Required | Full registered legal name of the organization | `Al-Saud Training Institute` |
| **Registration Number** | String (Max 100), Optional | Commercial Registration (CR) number | `CR-104928A` |
| **Tax Number (VAT #)** | String (Max 100), Optional | VAT or Tax identification number | `OM1000020492` |
| **Primary Email** | Email, Required | General contact email of the head office | `info@al-saud.edu.om` |
| **Primary Phone** | Phone String, Required | Main contact phone number | `+968-24-123456` |
| **Website** | URL String, Optional | Official website | `https://al-saud.edu.om` |
| **Headquarters Address** | Text, Required | Physical headquarter address | `Building 4A, Street 203, Al Khuwair` |
| **Country** | String (Max 100), Required | Main operating country | `Oman` |

### 1.2 Branches
*Branches partition your data. Students, finances, schedules, and staff can be scoped to specific branches.*

| Branch Code (Unique) | Branch Name | Physical Address | City | Country | Phone | Email | Branch Manager Email | Status (Active/Inactive) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `AST-MUSCAT` | Muscat Main Campus | Al Khuwair, Muscat | Muscat | Oman | `+968-24-123456` | `muscat@al-saud.edu.om` | `manager.muscat@ims.com` | `Active` |
| `AST-SALALAH` | Salalah Hub | 23rd July St, Salalah | Salalah | Oman | `+968-23-999888` | `salalah@al-saud.edu.om` | `manager.salalah@ims.com` | `Active` |

### 1.3 Classrooms
*Physical or virtual rooms available for batch scheduling. This is used to prevent double-booking.*

| Branch Code | Classroom Name (Unique per Branch) | Max Capacity (Students) | Physical Location / Notes | Status (Active/Inactive) |
| :--- | :--- | :--- | :--- | :--- |
| `AST-MUSCAT` | `Lab 1 - Python` | `24` | `First Floor, Wing A (Equipped with high-spec PCs)` | `Active` |
| `AST-MUSCAT` | `Room 302` | `30` | `Third Floor, Main Wing` | `Active` |
| `AST-SALALAH` | `Seminar Hall` | `60` | `Ground Floor` | `Active` |

---

## 📚 Section 2: Academic Catalog & pricing

This section defines what you teach, how it's categorized, the pricing structures, and completion rules.

### 2.1 Departments
*Divisions that own courses (e.g., Information Technology, Language Center, Corporate Academics).*

| Branch Code | Department Code (Unique per Branch) | Department Name | Head of Department Email | Description / Notes | Status (Active/Inactive) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `AST-MUSCAT` | `IT-ACAD` | IT Academics Department | `head.it@al-saud.edu.om` | All software and technology courses | `Active` |
| `AST-MUSCAT` | `LANG-CEN` | Language Center | `head.lang@al-saud.edu.om` | English proficiency & IELTS coaching | `Active` |

### 2.2 Course Definitions
*The template configurations for programs.*

| Department Code | Course Code (Unique) | Course Name | Course Type | Duration Type (`FixedDuration` / `Hours` / `Sessions`) | Duration Value | Allow Walk-In Completion? (TRUE/FALSE) | Allow Waiting List? (TRUE/FALSE) | Status (Draft/Active/Inactive) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `IT-ACAD` | `PY-101` | Python Programming Fundamentals | Technical | `Hours` | `40` | `FALSE` | `TRUE` | `Active` |
| `IT-ACAD` | `EX-WALK` | IT Literacy Speed Exam | Exam Only | `Sessions` | `1` | `TRUE` | `FALSE` | `Active` |
| `LANG-CEN` | `IELTS-PREP`| IELTS Exam Preparation Course | Language | `FixedDuration` | `3` (Months) | `FALSE` | `TRUE` | `Active` |

> **Note on Walk-In Completion:** Setting `Allow Walk-In Completion` to `TRUE` permits a student to enroll, pay, mark attendance, take the exam, and receive a certificate all on the same day.

### 2.3 Course Pricing & Fee Plans
*This configures how much a course costs and how fees are collected.*

| Course Code | Branch Code | Plan Name | Total Fee Amount | Currency | Tax Applicable? (TRUE/FALSE) | Tax % (e.g., 5.00) | Customer Type (`Individual` / `Corporate`) | Batch Type (`Weekday` / `Weekend`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `PY-101` | `AST-MUSCAT` | Python Foundation Standard | `150.000` | `OMR` | `TRUE` | `5.00` | `Individual` | `Weekday` |
| `PY-101` | `AST-MUSCAT` | Python Weekend Executive | `180.000` | `OMR` | `TRUE` | `5.00` | `Individual` | `Weekend` |
| `IELTS-PREP`| `AST-MUSCAT` | IELTS Standard Prep | `220.000` | `OMR` | `FALSE` | `0.00` | `Individual` | `Weekday` |

### 2.4 Course Completion Rules
*Defines what criteria a student must satisfy to finish a course and be eligible for a certificate.*

| Course Code | Completion Type | Minimum Attendance % | Exam Required? (TRUE/FALSE) | Manual Approval Required? (TRUE/FALSE) | Fee Clearance Required? (TRUE/FALSE) | Certificate Eligible? (TRUE/FALSE) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `PY-101` | `ExamAndAttendance` | `80.00` | `TRUE` | `TRUE` | `TRUE` | `TRUE` |
| `EX-WALK` | `ExamOnly` | `0.00` | `TRUE` | `FALSE` | `TRUE` | `TRUE` |
| `IELTS-PREP`| `AttendanceOnly` | `90.00` | `FALSE` | `TRUE` | `FALSE` | `TRUE` |

---

## 👥 Section 3: Staff & Faculty Profiles

Use these templates to gather details about your administrative users and trainers.

### 3.1 Staff and Trainer Master
*This sheet creates logins for your operations team, accountants, counselors, managers, and teaching faculty.*

| Staff/Trainer Code | Full Name | Email Address | Mobile Number | Role Code | Branch Scope | Trainer Type (`FullTime`/`PartTime`/`Contractor`) | Joining Date | Specialization / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `AST-ST-001` | Salem Al-Harthi | `salem@al-saud.edu.om` | `+968-91234567` | `BRANCH_MANAGER` | `AST-MUSCAT` | `FullTime` | `2025-01-15` | Branch operations and financial approvals. |
| `AST-ST-002` | Amna Al-Balushi | `amna@al-saud.edu.om` | `+968-92345678` | `COUNSELOR` | `AST-MUSCAT` | `FullTime` | `2025-02-01` | Lead intake, CRM updates, admissions. |
| `AST-TR-101` | Dr. John Doe | `john.doe@ims.com` | `+968-93456789` | `TRAINER` | `AST-MUSCAT` | `Contractor` | `2026-03-01` | Python & data structures expert. |

> **System Roles List (Role Code):**
> Use the standard seed roles below:
> - `SUPER_ADMIN` (Global Master Access)
> - `OWNER` (Executive approvals)
> - `BRANCH_MANAGER` (Full branch-scoped authority)
> - `COUNSELOR` (Manages Leads, CRM, Admissions)
> - `TRAINER` (Manages Attendance, Grades, Schedules)
> - `ACCOUNTANT` (Receives payments, cancels invoices, manages billing)
> - `ACADEMIC_COORDINATOR` (Manages Course catalog & batch setups)
> - `MANAGEMENT` (Global Read-Only analytics)

### 3.2 Trainer Course Authorizations
*Specifies which trainers are certified to teach which courses. The system will restrict scheduling if a trainer is assigned to a course they are not authorized to teach.*

| Trainer Code | Course Code | Valid From Date | Valid To Date (Optional) | Remarks / Qualifications |
| :--- | :--- | :--- | :--- | :--- |
| `AST-TR-101` | `PY-101` | `2026-03-01` | *Leave empty* | Certified Python developer / Instructor |

---

## 📈 Section 4: CRM Configuration

Customize the intake settings for your leads and inquiries pipeline.

### 4.1 Custom Lead Sources
*Where do your inquiries typically originate? (Examples below)*

| Source Name | Description / Notes | Status (Active/Inactive) |
| :--- | :--- | :--- |
| `Instagram` | Direct messages or ad clicks from Instagram | `Active` |
| `Facebook Ad` | Inquiries coming from target Facebook campaigns | `Active` |
| `Walk-in` | Inquiries from walk-ins at the reception desk | `Active` |
| `Corporate Reference` | Leads referred by partnering businesses | `Active` |
| `Newspaper Ad` | Print media ads in local directories | `Active` |

### 4.2 Lead Stages
*Default stages are pre-configured: `Active`, `Won`, `Lost`, `Converted`, `Reopened`. If you want to define specific steps before conversion, list them here:*

| Stage Name | Display Order | Is Converted/Won? | Is Closed/Lost? | Description |
| :--- | :--- | :--- | :--- | :--- |
| `New Inquiry` | `1` | `FALSE` | `FALSE` | Newly entered into system |
| `Contact Attempted`| `2` | `FALSE` | `FALSE` | Counselor has called back, waiting on response |
| `Counseling Fixed` | `3` | `FALSE` | `FALSE` | Detailed session booked |
| `Registered (Won)` | `4` | `TRUE` | `FALSE` | Converted into student admission |
| `Junk (Lost)` | `5` | `FALSE` | `TRUE` | Non-working number, spam, or not interested |

---

## 📑 Section 5: Document Intake Rules

Define what physical or digital documents are required for verification and compliance.

### 5.1 Required Verification Documents
*The system will prompt staff to upload these documents for students or staff.*

| Document Type Code | Document Name | Category | Applicable Entity (`Student` / `Trainer` / `CorporateCustomer`) | Is Required? (TRUE/FALSE) | Requires Staff Verification? (TRUE/FALSE) | Track Expiry? (TRUE/FALSE) | Allowed Formats (e.g. pdf, png) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `OMAN_ID` | Omani Civil ID / Residence Card | `Identity` | `Student` | `TRUE` | `TRUE` | `TRUE` | `pdf, jpg, png` |
| `PASSPORT` | Valid Passport Page | `Identity` | `Student` | `FALSE` | `TRUE` | `TRUE` | `pdf` |
| `HIGHSCHOOL_CERT` | High School Certificate | `Academic` | `Student` | `FALSE` | `FALSE` | `FALSE` | `pdf, png` |
| `TRAINER_CV` | Instructor CV / Portfolio | `Academic` | `Trainer` | `TRUE` | `TRUE` | `FALSE` | `pdf` |

---

## 🏢 Section 6: Corporate Accounts

*Fill this out if your institute handles training contracts for corporate groups, ministries, or companies.*

### 6.1 Corporate Customers
| Customer Code (Unique) | Company Name | Trade License Number | Tax Registration Number | website | Phone | Email | Industry | Address |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `PDO-OMAN` | Petroleum Development Oman | `LIC-99388B` | `VAT-884920` | `https://www.pdo.co.om` | `+968-24-678900` | `training@pdo.co.om` | `Oil & Gas` | `Mina Al Fahal, Muscat` |

---

## 📜 Section 7: Certificate Templates

*Configure visual layouts for student graduation certificates.*

### 7.1 Certificate Templates Setup
| Template Code (Unique) | Template Name | Certificate Type (`Attendance`/`Completion`) | Language (`English`/`Arabic`/`Bilingual`) | Connected Course Code |
| :--- | :--- | :--- | :--- | :--- |
| `CERT-PY-BI` | Python Bilingual Completion Certificate | `Completion` | `Bilingual` | `PY-101` |
| `CERT-IELTS-EN` | IELTS Prep Course Attendance Letter | `Attendance` | `English` | `IELTS-PREP` |

---
*End of Master Data Collection Guide.*
