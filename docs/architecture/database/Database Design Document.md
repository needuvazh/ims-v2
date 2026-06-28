# Database Design Document

## Institute Management System (IMS)

**Version:** 1.0
**Database:** PostgreSQL
**ORM Target:** Prisma
**Architecture:** DDD Modular Monolith
**Scope:** Single-client IMS
**Excluded:** Tenant setup, SaaS subscription, CMS, import/migration APIs

---

# 1. Purpose

This document defines the physical database design for IMS.

It covers:

* Tables
* Columns
* Primary keys
* Foreign keys
* Indexes
* Constraints
* Enums
* Audit fields
* Soft delete strategy
* Domain ownership

---

# 2. Database Design Principles

The database shall follow these principles:

```text
PostgreSQL as source of truth
UUID primary keys
Domain-owned tables
Foreign key integrity
Soft delete for business records
Append-only audit logs
Immutable financial receipts
Immutable issued certificates
Snapshot financial values at enrollment time
Branch-scoped operational data
```

---

# 3. Common Column Standards

Most business tables shall include:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
created_by UUID NULL,
updated_at TIMESTAMPTZ NULL,
updated_by UUID NULL,
deleted_at TIMESTAMPTZ NULL,
deleted_by UUID NULL,
is_deleted BOOLEAN NOT NULL DEFAULT false
```

Master/configuration tables shall include:

```sql
effective_start_date DATE NULL,
effective_end_date DATE NULL,
status VARCHAR(50) NOT NULL
```

---

# 4. Core Enums

## User Status

```sql
CREATE TYPE user_status AS ENUM (
  'Draft',
  'Active',
  'Inactive',
  'Locked'
);
```

## Generic Status

```sql
CREATE TYPE record_status AS ENUM (
  'Draft',
  'Active',
  'Inactive',
  'Archived'
);
```

## Student Status

```sql
CREATE TYPE student_status AS ENUM (
  'Inquiry',
  'Applied',
  'Admitted',
  'Active',
  'Completed',
  'Dropped',
  'Transferred',
  'Suspended',
  'Alumni'
);
```

## Lead Type

```sql
CREATE TYPE lead_type AS ENUM (
  'Student',
  'Corporate'
);
```

## Lead Status

```sql
CREATE TYPE lead_status AS ENUM (
  'Active',
  'Won',
  'Lost',
  'Converted',
  'Reopened'
);
```

## Enrollment Status

```sql
CREATE TYPE enrollment_status AS ENUM (
  'Draft',
  'Confirmed',
  'Active',
  'Completed',
  'Dropped',
  'Cancelled',
  'Suspended'
);
```

## Course Duration Type

```sql
CREATE TYPE course_duration_type AS ENUM (
  'FixedDuration',
  'Hours',
  'Sessions'
);
```

## Attendance Status

```sql
CREATE TYPE attendance_status AS ENUM (
  'Present',
  'Absent',
  'Late',
  'Excused'
);
```

## Payment Mode

```sql
CREATE TYPE payment_mode AS ENUM (
  'Cash',
  'BankTransfer',
  'Card',
  'Cheque',
  'OnlineTransfer'
);
```

## Certificate Status

```sql
CREATE TYPE certificate_status AS ENUM (
  'Generated',
  'PendingApproval',
  'Approved',
  'Rejected',
  'Issued',
  'Reissued',
  'Revoked'
);
```

---

# 5. Identity & Access Tables

## 5.1 users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  password_hash TEXT NOT NULL,
  user_type VARCHAR(50) NOT NULL,
  status user_status NOT NULL DEFAULT 'Active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT uq_users_email UNIQUE (email)
);
```

### Indexes

```sql
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_email ON users(email);
```

---

## 5.2 roles

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code VARCHAR(100) NOT NULL,
  role_name VARCHAR(150) NOT NULL,
  description TEXT,
  status record_status NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT uq_roles_code UNIQUE (role_code),
  CONSTRAINT uq_roles_name UNIQUE (role_name)
);
```

---

## 5.3 permissions

```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code VARCHAR(100) NOT NULL,
  feature_code VARCHAR(100) NOT NULL,
  action_code VARCHAR(100) NOT NULL,
  permission_code VARCHAR(150) NOT NULL,
  description TEXT,
  status record_status NOT NULL DEFAULT 'Active',
  CONSTRAINT uq_permissions_code UNIQUE (permission_code)
);
```

---

## 5.4 role_permissions

```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id),
  permission_id UUID NOT NULL REFERENCES permissions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id)
);
```

---

## 5.5 user_roles

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  role_id UUID NOT NULL REFERENCES roles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT uq_user_role UNIQUE (user_id, role_id)
);
```

---

## 5.6 user_data_scopes

```sql
CREATE TABLE user_data_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  scope_type VARCHAR(50) NOT NULL,
  branch_id UUID NULL,
  department_id UUID NULL,
  assigned_only BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
```

---

# 6. Organization Tables

## 6.1 institutes

```sql
CREATE TABLE institutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_code VARCHAR(50) NOT NULL,
  institute_name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(100),
  tax_number VARCHAR(100),
  primary_email VARCHAR(255),
  primary_phone VARCHAR(30),
  website VARCHAR(255),
  address TEXT,
  country VARCHAR(100),
  status record_status NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  CONSTRAINT uq_institute_code UNIQUE (institute_code)
);
```

---

## 6.2 branches

```sql
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES institutes(id),
  branch_code VARCHAR(50) NOT NULL,
  branch_name VARCHAR(200) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  phone VARCHAR(30),
  email VARCHAR(255),
  branch_manager_id UUID REFERENCES users(id),
  status record_status NOT NULL DEFAULT 'Active',
  effective_start_date DATE,
  effective_end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT uq_branch_code UNIQUE (branch_code)
);
```

### Indexes

```sql
CREATE INDEX idx_branches_status ON branches(status);
CREATE INDEX idx_branches_city ON branches(city);
```

---

## 6.3 departments

```sql
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  department_code VARCHAR(50) NOT NULL,
  department_name VARCHAR(200) NOT NULL,
  department_head_id UUID REFERENCES users(id),
  description TEXT,
  status record_status NOT NULL DEFAULT 'Active',
  effective_start_date DATE,
  effective_end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT uq_department_code_branch UNIQUE (branch_id, department_code)
);
```

---

## 6.4 classrooms

```sql
CREATE TABLE classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  classroom_name VARCHAR(150) NOT NULL,
  capacity INT NOT NULL,
  location VARCHAR(255),
  status record_status NOT NULL DEFAULT 'Active',
  effective_start_date DATE,
  effective_end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT chk_classroom_capacity CHECK (capacity > 0),
  CONSTRAINT uq_classroom_branch_name UNIQUE (branch_id, classroom_name)
);
```

---

# 7. Student Tables

## 7.1 students

```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_number VARCHAR(100) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100),
  gender VARCHAR(50),
  date_of_birth DATE,
  nationality VARCHAR(100),
  photo_file_id UUID,
  mobile_number VARCHAR(30) NOT NULL,
  alternate_number VARCHAR(30),
  email VARCHAR(255),
  preferred_contact_method VARCHAR(50),
  address JSONB,
  status student_status NOT NULL DEFAULT 'Admitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT uq_students_number UNIQUE (student_number)
);
```

### Indexes

```sql
CREATE INDEX idx_students_mobile ON students(mobile_number);
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_name ON students(first_name, last_name);
```

---

## 7.2 student_identity_fields

```sql
CREATE TABLE student_identity_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_code VARCHAR(100) NOT NULL,
  field_name VARCHAR(150) NOT NULL,
  field_type VARCHAR(50) NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_unique BOOLEAN NOT NULL DEFAULT false,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 1,
  status record_status NOT NULL DEFAULT 'Active',
  CONSTRAINT uq_student_identity_field_code UNIQUE (field_code)
);
```

---

## 7.3 student_identity_values

```sql
CREATE TABLE student_identity_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  field_id UUID NOT NULL REFERENCES student_identity_fields(id),
  field_value VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  CONSTRAINT uq_student_identity_field UNIQUE (student_id, field_id)
);
```

### Indexes

```sql
CREATE INDEX idx_student_identity_value ON student_identity_values(field_value);
```

---

## 7.4 student_emergency_contacts

```sql
CREATE TABLE student_emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  contact_name VARCHAR(200) NOT NULL,
  relationship VARCHAR(100),
  phone_number VARCHAR(30) NOT NULL,
  email VARCHAR(255),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT false
);
```

---

# 8. CRM Tables

## 8.1 lead_sources

```sql
CREATE TABLE lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name VARCHAR(100) NOT NULL,
  description TEXT,
  status record_status NOT NULL DEFAULT 'Active',
  CONSTRAINT uq_lead_source_name UNIQUE (source_name)
);
```

---

## 8.2 lead_stages

```sql
CREATE TABLE lead_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_name VARCHAR(100) NOT NULL,
  display_order INT NOT NULL,
  is_won_stage BOOLEAN NOT NULL DEFAULT false,
  is_lost_stage BOOLEAN NOT NULL DEFAULT false,
  status record_status NOT NULL DEFAULT 'Active',
  CONSTRAINT uq_lead_stage_name UNIQUE (stage_name)
);
```

---

## 8.3 leads

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_number VARCHAR(100) NOT NULL,
  branch_id UUID NOT NULL REFERENCES branches(id),
  lead_type lead_type NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(255),
  lead_source_id UUID REFERENCES lead_sources(id),
  lead_stage_id UUID REFERENCES lead_stages(id),
  interested_course_id UUID,
  campaign_id UUID,
  assigned_counselor_id UUID REFERENCES users(id),
  priority VARCHAR(50),
  remarks TEXT,
  status lead_status NOT NULL DEFAULT 'Active',
  converted_entity_type VARCHAR(100),
  converted_entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT uq_lead_number UNIQUE (lead_number)
);
```

### Indexes

```sql
CREATE INDEX idx_leads_branch ON leads(branch_id);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_stage ON leads(lead_stage_id);
CREATE INDEX idx_leads_counselor ON leads(assigned_counselor_id);
```

---

## 8.4 lead_follow_ups

```sql
CREATE TABLE lead_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id),
  follow_up_date DATE NOT NULL,
  follow_up_time TIME,
  follow_up_type VARCHAR(50) NOT NULL,
  notes TEXT,
  outcome VARCHAR(100),
  next_action TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID
);
```

---

## 8.5 campaigns

```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name VARCHAR(200) NOT NULL,
  campaign_type VARCHAR(100) NOT NULL,
  start_date DATE,
  end_date DATE,
  budget NUMERIC(12,3),
  currency VARCHAR(10),
  description TEXT,
  status record_status NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID
);
```

---

# 9. Course & Batch Tables

## 9.1 courses

```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id),
  course_code VARCHAR(100) NOT NULL,
  course_name VARCHAR(255) NOT NULL,
  description TEXT,
  course_type VARCHAR(100) NOT NULL,
  duration_type course_duration_type NOT NULL,
  duration_value NUMERIC(10,2) NOT NULL,
  allow_direct_enrollment BOOLEAN NOT NULL DEFAULT true,
  allow_waiting_list BOOLEAN NOT NULL DEFAULT true,
  allow_walkin_completion BOOLEAN NOT NULL DEFAULT false,
  allow_corporate_enrollment BOOLEAN NOT NULL DEFAULT true,
  status record_status NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT uq_course_code UNIQUE (course_code),
  CONSTRAINT chk_course_duration CHECK (duration_value > 0)
);
```

---

## 9.2 course_pricing

```sql
CREATE TABLE course_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  customer_type VARCHAR(50) NOT NULL,
  batch_type VARCHAR(50),
  currency VARCHAR(10) NOT NULL,
  base_amount NUMERIC(12,3) NOT NULL,
  tax_applicable BOOLEAN NOT NULL DEFAULT false,
  tax_percentage NUMERIC(5,2),
  status record_status NOT NULL DEFAULT 'Active',
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT chk_course_price_amount CHECK (base_amount >= 0)
);
```

---

## 9.3 course_completion_rules

```sql
CREATE TABLE course_completion_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id),
  completion_type VARCHAR(100) NOT NULL,
  minimum_attendance_percentage NUMERIC(5,2),
  exam_required BOOLEAN NOT NULL DEFAULT false,
  manual_approval_required BOOLEAN NOT NULL DEFAULT false,
  fee_clearance_required BOOLEAN NOT NULL DEFAULT false,
  certificate_eligible BOOLEAN NOT NULL DEFAULT true,
  status record_status NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
```

---

## 9.4 batches

```sql
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  batch_code VARCHAR(100) NOT NULL,
  batch_name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  capacity INT NOT NULL,
  waiting_list_enabled BOOLEAN NOT NULL DEFAULT true,
  allow_overbooking BOOLEAN NOT NULL DEFAULT false,
  enrollment_open_date DATE,
  enrollment_close_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT uq_batch_code UNIQUE (batch_code),
  CONSTRAINT chk_batch_capacity CHECK (capacity > 0),
  CONSTRAINT chk_batch_dates CHECK (end_date >= start_date)
);
```

---

# 10. Admission & Enrollment Tables

## 10.1 admissions

```sql
CREATE TABLE admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_number VARCHAR(100) NOT NULL,
  lead_id UUID REFERENCES leads(id),
  student_id UUID NOT NULL REFERENCES students(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  preferred_batch_id UUID REFERENCES batches(id),
  admission_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Draft',
  remarks TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  CONSTRAINT uq_admission_number UNIQUE (admission_number)
);
```

---

## 10.2 enrollments

```sql
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_number VARCHAR(100) NOT NULL,
  admission_id UUID REFERENCES admissions(id),
  student_id UUID NOT NULL REFERENCES students(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  batch_id UUID NOT NULL REFERENCES batches(id),
  enrollment_type VARCHAR(50) NOT NULL,
  enrollment_date DATE NOT NULL,
  status enrollment_status NOT NULL DEFAULT 'Draft',
  completion_status VARCHAR(50),
  certificate_status VARCHAR(50),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT uq_enrollment_number UNIQUE (enrollment_number)
);
```

### Indexes

```sql
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_batch ON enrollments(batch_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
```

---

## 10.3 waiting_list

```sql
CREATE TABLE waiting_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  lead_id UUID REFERENCES leads(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  batch_id UUID NOT NULL REFERENCES batches(id),
  priority VARCHAR(50) NOT NULL DEFAULT 'Normal',
  status VARCHAR(50) NOT NULL DEFAULT 'Waiting',
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
```

---

# 11. Trainer Tables

## 11.1 trainers

```sql
CREATE TABLE trainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_code VARCHAR(100) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100),
  gender VARCHAR(50),
  date_of_birth DATE,
  nationality VARCHAR(100),
  mobile_number VARCHAR(30) NOT NULL,
  email VARCHAR(255),
  trainer_type VARCHAR(50) NOT NULL,
  primary_specialization VARCHAR(150) NOT NULL,
  years_of_experience NUMERIC(5,2),
  joining_date DATE,
  status record_status NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT uq_trainer_code UNIQUE (trainer_code)
);
```

---

## 11.2 trainer_branches

```sql
CREATE TABLE trainer_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  CONSTRAINT uq_trainer_branch UNIQUE (trainer_id, branch_id)
);
```

---

## 11.3 trainer_availability

```sql
CREATE TABLE trainer_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id),
  day_of_week VARCHAR(20) NOT NULL,
  available_from TIME NOT NULL,
  available_to TIME NOT NULL,
  status record_status NOT NULL DEFAULT 'Active',
  CONSTRAINT chk_trainer_availability_time CHECK (available_to > available_from)
);
```

---

## 11.4 trainer_course_authorizations

```sql
CREATE TABLE trainer_course_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  valid_from DATE NOT NULL,
  valid_to DATE,
  remarks TEXT,
  status record_status NOT NULL DEFAULT 'Active',
  CONSTRAINT uq_trainer_course_auth UNIQUE (trainer_id, course_id)
);
```

---

# 12. Scheduling Tables

## 12.1 schedules

```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_number VARCHAR(100) NOT NULL,
  batch_id UUID NOT NULL REFERENCES batches(id),
  schedule_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  recurrence_days TEXT[],
  primary_trainer_id UUID NOT NULL REFERENCES trainers(id),
  classroom_id UUID REFERENCES classrooms(id),
  lab_id UUID NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Draft',
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  CONSTRAINT uq_schedule_number UNIQUE (schedule_number),
  CONSTRAINT chk_schedule_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_schedule_time CHECK (end_time > start_time)
);
```

---

## 12.2 sessions

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id),
  batch_id UUID NOT NULL REFERENCES batches(id),
  trainer_id UUID NOT NULL REFERENCES trainers(id),
  classroom_id UUID REFERENCES classrooms(id),
  session_number INT NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Scheduled',
  cancellation_reason TEXT,
  reschedule_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  CONSTRAINT chk_session_time CHECK (end_time > start_time)
);
```

### Indexes

```sql
CREATE INDEX idx_sessions_batch ON sessions(batch_id);
CREATE INDEX idx_sessions_trainer_date ON sessions(trainer_id, session_date);
CREATE INDEX idx_sessions_classroom_date ON sessions(classroom_id, session_date);
```

---

# 13. Attendance Tables

## 13.1 attendance_sessions

```sql
CREATE TABLE attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  status VARCHAR(50) NOT NULL DEFAULT 'Open',
  locked_at TIMESTAMPTZ,
  locked_by UUID,
  reopened_at TIMESTAMPTZ,
  reopened_by UUID,
  reopen_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT uq_attendance_session_session UNIQUE (session_id)
);
```

---

## 13.2 attendance_records

```sql
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_session_id UUID NOT NULL REFERENCES attendance_sessions(id),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id),
  student_id UUID NOT NULL REFERENCES students(id),
  status attendance_status NOT NULL,
  remarks TEXT,
  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  marked_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  CONSTRAINT uq_attendance_record UNIQUE (attendance_session_id, enrollment_id)
);
```

---

# 14. Finance Tables

## 14.1 fee_plans

```sql
CREATE TABLE fee_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  plan_name VARCHAR(200) NOT NULL,
  total_amount NUMERIC(12,3) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  tax_applicable BOOLEAN NOT NULL DEFAULT false,
  tax_percentage NUMERIC(5,2),
  status record_status NOT NULL DEFAULT 'Active',
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT chk_fee_plan_amount CHECK (total_amount >= 0)
);
```

---

## 14.2 fee_accounts

```sql
CREATE TABLE fee_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id),
  fee_plan_id UUID REFERENCES fee_plans(id),
  total_fee_amount NUMERIC(12,3) NOT NULL,
  discount_amount NUMERIC(12,3) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,3) NOT NULL DEFAULT 0,
  net_payable_amount NUMERIC(12,3) NOT NULL,
  paid_amount NUMERIC(12,3) NOT NULL DEFAULT 0,
  due_amount NUMERIC(12,3) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PendingPayment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  CONSTRAINT uq_fee_account_enrollment UNIQUE (enrollment_id)
);
```

---

## 14.3 payments

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number VARCHAR(100) NOT NULL,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id),
  fee_account_id UUID NOT NULL REFERENCES fee_accounts(id),
  payment_date DATE NOT NULL,
  payment_mode payment_mode NOT NULL,
  amount NUMERIC(12,3) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  reference_number VARCHAR(150),
  status VARCHAR(50) NOT NULL DEFAULT 'Posted',
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT uq_payment_number UNIQUE (payment_number),
  CONSTRAINT chk_payment_amount CHECK (amount > 0)
);
```

---

## 14.4 receipts

```sql
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number VARCHAR(100) NOT NULL,
  payment_id UUID NOT NULL REFERENCES payments(id),
  receipt_type VARCHAR(100) NOT NULL,
  receipt_date DATE NOT NULL,
  amount NUMERIC(12,3) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  pdf_file_id UUID,
  status VARCHAR(50) NOT NULL DEFAULT 'Issued',
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT uq_receipt_number UNIQUE (receipt_number)
);
```

---

## 14.5 refunds

```sql
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_number VARCHAR(100) NOT NULL,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id),
  payment_id UUID NOT NULL REFERENCES payments(id),
  refund_type VARCHAR(50) NOT NULL,
  refund_amount NUMERIC(12,3) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Requested',
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT uq_refund_number UNIQUE (refund_number),
  CONSTRAINT chk_refund_amount CHECK (refund_amount > 0)
);
```

---

# 15. Corporate Training Tables

## 15.1 corporate_customers

```sql
CREATE TABLE corporate_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code VARCHAR(100) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  trade_license_number VARCHAR(100),
  industry VARCHAR(100),
  website VARCHAR(255),
  phone VARCHAR(30),
  email VARCHAR(255),
  address TEXT,
  country VARCHAR(100),
  city VARCHAR(100),
  tax_registration_number VARCHAR(100),
  preferred_currency VARCHAR(10),
  status record_status NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  CONSTRAINT uq_corporate_customer_code UNIQUE (customer_code)
);
```

---

## 15.2 corporate_contacts

```sql
CREATE TABLE corporate_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_customer_id UUID NOT NULL REFERENCES corporate_customers(id),
  full_name VARCHAR(200) NOT NULL,
  designation VARCHAR(150),
  department VARCHAR(150),
  email VARCHAR(255),
  phone VARCHAR(30),
  mobile VARCHAR(30),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  status record_status NOT NULL DEFAULT 'Active'
);
```

---

## 15.3 corporate_contracts

```sql
CREATE TABLE corporate_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_customer_id UUID NOT NULL REFERENCES corporate_customers(id),
  contract_number VARCHAR(100) NOT NULL,
  contract_value NUMERIC(12,3) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  billing_model VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  renewal_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT uq_contract_number UNIQUE (contract_number)
);
```

---

## 15.4 corporate_programs

```sql
CREATE TABLE corporate_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_customer_id UUID NOT NULL REFERENCES corporate_customers(id),
  contract_id UUID NOT NULL REFERENCES corporate_contracts(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  program_name VARCHAR(255) NOT NULL,
  delivery_location_type VARCHAR(50),
  delivery_location TEXT,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'Planned'
);
```

---

## 15.5 corporate_participants

```sql
CREATE TABLE corporate_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_customer_id UUID NOT NULL REFERENCES corporate_customers(id),
  corporate_program_id UUID REFERENCES corporate_programs(id),
  student_id UUID REFERENCES students(id),
  employee_code VARCHAR(100),
  employee_name VARCHAR(200) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(30),
  designation VARCHAR(150),
  department VARCHAR(150),
  status record_status NOT NULL DEFAULT 'Active'
);
```

---

# 16. Exam & Completion Tables

## 16.1 exams

```sql
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id),
  batch_id UUID REFERENCES batches(id),
  exam_code VARCHAR(100) NOT NULL,
  exam_name VARCHAR(255) NOT NULL,
  exam_date DATE NOT NULL,
  maximum_marks NUMERIC(8,2) NOT NULL,
  passing_marks NUMERIC(8,2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT uq_exam_code UNIQUE (exam_code),
  CONSTRAINT chk_exam_marks CHECK (maximum_marks > 0 AND passing_marks <= maximum_marks)
);
```

---

## 16.2 exam_results

```sql
CREATE TABLE exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id),
  student_id UUID NOT NULL REFERENCES students(id),
  marks_obtained NUMERIC(8,2) NOT NULL,
  grade VARCHAR(20),
  result_status VARCHAR(50) NOT NULL,
  published_at TIMESTAMPTZ,
  published_by UUID,
  remarks TEXT,
  CONSTRAINT uq_exam_result UNIQUE (exam_id, enrollment_id)
);
```

---

## 16.3 completions

```sql
CREATE TABLE completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id),
  attendance_eligible BOOLEAN NOT NULL DEFAULT false,
  exam_eligible BOOLEAN NOT NULL DEFAULT false,
  fee_cleared BOOLEAN NOT NULL DEFAULT false,
  overall_eligible BOOLEAN NOT NULL DEFAULT false,
  completion_status VARCHAR(50) NOT NULL DEFAULT 'NotStarted',
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  CONSTRAINT uq_completion_enrollment UNIQUE (enrollment_id)
);
```

---

# 17. Certificate Tables

## 17.1 certificate_templates

```sql
CREATE TABLE certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code VARCHAR(100) NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  certificate_type VARCHAR(100) NOT NULL,
  language VARCHAR(50) NOT NULL,
  course_id UUID REFERENCES courses(id),
  template_file_id UUID,
  placeholder_config JSONB,
  status record_status NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT uq_certificate_template_code UNIQUE (template_code)
);
```

---

## 17.2 certificates

```sql
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number VARCHAR(100) NOT NULL,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id),
  student_id UUID NOT NULL REFERENCES students(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  template_id UUID REFERENCES certificate_templates(id),
  certificate_type VARCHAR(100) NOT NULL,
  language VARCHAR(50) NOT NULL,
  status certificate_status NOT NULL DEFAULT 'Generated',
  issue_date DATE,
  verification_token VARCHAR(255) NOT NULL,
  verification_url TEXT,
  pdf_file_id UUID,
  original_certificate_id UUID REFERENCES certificates(id),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT uq_certificate_number UNIQUE (certificate_number),
  CONSTRAINT uq_certificate_token UNIQUE (verification_token)
);
```

---

# 18. Document Tables

## 18.1 files

```sql
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  storage_key TEXT NOT NULL,
  checksum VARCHAR(255),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID,
  CONSTRAINT uq_file_storage_key UNIQUE (storage_key)
);
```

---

## 18.2 document_types

```sql
CREATE TABLE document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type_code VARCHAR(100) NOT NULL,
  document_type_name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  verification_required BOOLEAN NOT NULL DEFAULT false,
  expiry_tracking_enabled BOOLEAN NOT NULL DEFAULT false,
  allowed_file_types TEXT[],
  max_file_size_mb INT,
  display_order INT,
  status record_status NOT NULL DEFAULT 'Active',
  CONSTRAINT uq_document_type_entity_code UNIQUE (entity_type, document_type_code)
);
```

---

## 18.3 documents

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  document_type_id UUID NOT NULL REFERENCES document_types(id),
  file_id UUID NOT NULL REFERENCES files(id),
  document_number VARCHAR(255),
  issue_date DATE,
  expiry_date DATE,
  document_status VARCHAR(50) NOT NULL DEFAULT 'Uploaded',
  verification_status VARCHAR(50) NOT NULL DEFAULT 'PendingVerification',
  remarks TEXT,
  active_version_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID
);
```

---

## 18.4 document_versions

```sql
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id),
  file_id UUID NOT NULL REFERENCES files(id),
  version_number INT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID,
  CONSTRAINT uq_document_version UNIQUE (document_id, version_number)
);
```

---

# 19. Communication Tables

## 19.1 communication_templates

```sql
CREATE TABLE communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code VARCHAR(100) NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  channel VARCHAR(50) NOT NULL,
  message_type VARCHAR(100) NOT NULL,
  language VARCHAR(50) NOT NULL,
  subject TEXT,
  template_content TEXT NOT NULL,
  allowed_placeholders TEXT[],
  version INT NOT NULL DEFAULT 1,
  status record_status NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT uq_comm_template_code UNIQUE (template_code)
);
```

---

## 19.2 communication_logs

```sql
CREATE TABLE communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(50) NOT NULL,
  recipient_type VARCHAR(100) NOT NULL,
  recipient_id UUID,
  recipient_address VARCHAR(255),
  reference_type VARCHAR(100),
  reference_id UUID,
  rendered_subject TEXT,
  rendered_content TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Queued',
  provider_message_id VARCHAR(255),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
```

---

## 19.3 notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES users(id),
  category VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  reference_type VARCHAR(100),
  reference_id UUID,
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

# 20. Reporting & Audit Tables

## 20.1 report_export_jobs

```sql
CREATE TABLE report_export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_code VARCHAR(100) NOT NULL,
  format VARCHAR(50) NOT NULL,
  filters JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'Queued',
  file_id UUID REFERENCES files(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  requested_by UUID,
  completed_at TIMESTAMPTZ,
  failed_reason TEXT
);
```

---

## 20.2 audit_logs

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL DEFAULT gen_random_uuid(),
  module_code VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  action VARCHAR(150) NOT NULL,
  severity VARCHAR(50) NOT NULL DEFAULT 'Info',
  performed_by UUID,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address VARCHAR(100),
  user_agent TEXT,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  remarks TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'Success'
);
```

### Indexes

```sql
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(performed_by);
CREATE INDEX idx_audit_time ON audit_logs(performed_at);
CREATE INDEX idx_audit_module ON audit_logs(module_code);
```

---

# 21. Integration Tables

## 21.1 integration_providers

```sql
CREATE TABLE integration_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type VARCHAR(100) NOT NULL,
  provider_name VARCHAR(200) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB,
  secret_ref TEXT,
  status record_status NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID
);
```

---

## 21.2 integration_logs

```sql
CREATE TABLE integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES integration_providers(id),
  provider_type VARCHAR(100) NOT NULL,
  reference_type VARCHAR(100),
  reference_id UUID,
  request_payload JSONB,
  response_payload JSONB,
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

# 22. Configuration Tables

## 22.1 numbering_formats

```sql
CREATE TABLE numbering_formats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(100) NOT NULL,
  format_pattern VARCHAR(255) NOT NULL,
  sequence_padding INT NOT NULL DEFAULT 5,
  reset_frequency VARCHAR(50) NOT NULL DEFAULT 'Yearly',
  current_sequence BIGINT NOT NULL DEFAULT 0,
  status record_status NOT NULL DEFAULT 'Active',
  CONSTRAINT uq_numbering_entity UNIQUE (entity_type)
);
```

---

## 22.2 lookup_values

```sql
CREATE TABLE lookup_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100) NOT NULL,
  code VARCHAR(100) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  display_order INT,
  status record_status NOT NULL DEFAULT 'Active',
  CONSTRAINT uq_lookup_category_code UNIQUE (category, code)
);
```

---

## 22.3 currencies

```sql
CREATE TABLE currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code VARCHAR(10) NOT NULL,
  currency_name VARCHAR(100) NOT NULL,
  symbol VARCHAR(20),
  decimal_places INT NOT NULL DEFAULT 2,
  is_default BOOLEAN NOT NULL DEFAULT false,
  status record_status NOT NULL DEFAULT 'Active',
  CONSTRAINT uq_currency_code UNIQUE (currency_code)
);
```

---

## 22.4 tax_rules

```sql
CREATE TABLE tax_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_name VARCHAR(100) NOT NULL,
  tax_percentage NUMERIC(5,2) NOT NULL,
  country VARCHAR(100),
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  status record_status NOT NULL DEFAULT 'Active'
);
```

---

# 23. Critical Constraints

The database must enforce:

```text
Unique student number
Unique enrollment number
Unique receipt number
Unique certificate number
Unique lead number
Unique batch code
Unique course code
Unique trainer code
Unique corporate customer code
Unique contract number
```

Financial records must preserve historical values.

Issued receipts and issued certificates must never be edited directly.

---

# 24. Critical Index Strategy

Recommended indexes:

```text
Foreign key columns
Business number columns
Status columns
Date columns used in reports
Branch scope columns
Student, enrollment, batch lookup columns
Audit entity and performed_at columns
```

---

# 25. Soft Delete Strategy

Soft delete applies to:

```text
Students
Leads
Courses
Batches
Trainers
Corporate Customers
Documents
Configuration records where applicable
```

Soft delete does not apply to:

```text
Payments
Receipts
Refunds
Certificates
Audit Logs
Communication Logs
Integration Logs
```

These must remain historically traceable.

---

# 26. Database Ownership by Domain

| Domain        | Tables                                                       |
| ------------- | ------------------------------------------------------------ |
| IAM           | users, roles, permissions, user_roles, role_permissions      |
| Organization  | institutes, branches, departments, classrooms                |
| CRM           | leads, lead_sources, lead_stages, lead_follow_ups, campaigns |
| Student       | students, student_identity_fields, student_identity_values   |
| Enrollment    | admissions, enrollments, waiting_list                        |
| Course        | courses, course_pricing, course_completion_rules, batches    |
| Trainer       | trainers, trainer_branches, trainer_availability             |
| Scheduling    | schedules, sessions                                          |
| Attendance    | attendance_sessions, attendance_records                      |
| Finance       | fee_plans, fee_accounts, payments, receipts, refunds         |
| Corporate     | corporate_customers, corporate_contacts, corporate_contracts |
| Completion    | exams, exam_results, completions                             |
| Certificate   | certificate_templates, certificates                          |
| Document      | files, document_types, documents, document_versions          |
| Communication | communication_templates, communication_logs, notifications   |
| Audit         | audit_logs                                                   |
| Integration   | integration_providers, integration_logs                      |
| Configuration | numbering_formats, lookup_values, currencies, tax_rules      |

---

# 27. Review Alignment Database Addendum

## 27.1 Localized Text Storage

Display-oriented bilingual fields may use PostgreSQL `jsonb` through Prisma `Json` with this shape:

```json
{
  "en": "Advanced Mechanical Diagnostics",
  "ar": "التشخيص الميكانيكي المتقدم"
}
```

Use translation tables instead when localized values require full-text search, uniqueness, sorting, or reporting dimensions.

Candidate localized fields include:

| Domain | Fields |
| --- | --- |
| Course | title, shortDescription, longDescription |
| CertificateTemplate | templateName, bodyText, signatoryTitle |
| CommunicationTemplate | subject, body |
| Organization | public branch display name where required |

## 27.2 Corporate Credit Tables

Corporate Training shall own corporate account and contract tables. Finance may maintain read models or snapshots for unpaid balance and committed uninvoiced exposure.

Required persistence concepts:

| Table/concept | Owner | Notes |
| --- | --- | --- |
| corporate_accounts | Corporate Training | Legal identity, status, credit limit, branch scope |
| corporate_contracts | Corporate Training | Effective-dated contract terms and pricing references |
| corporate_programs | Corporate Training | Training program/cohort commitment |
| corporate_participants | Corporate Training | Sponsored employees; optional Student link |
| corporate_credit_exposure_snapshots | Finance or Reporting | Read-side unpaid/committed exposure for fast validation |

## 27.3 Document Expiry and Compliance Tables

Document Management shall store `expiry_date`, `verification_status`, `verified_by`, `verified_at`, and rejection reason where applicable. Audit & Compliance shall own compliance issues and approval logs.

Required persistence concepts:

| Table/concept | Owner | Notes |
| --- | --- | --- |
| document_types | Document Management | Includes owner type, expiry required flag, criticality |
| documents | Document Management | Includes owner type, owner ID, expiry date, verification status |
| document_verifications | Document Management | Verification history and reviewer evidence |
| compliance_issues | Audit & Compliance | Branch-scoped issue state and resolution |

## 27.4 Biometric Sync Tables

Biometric integration data shall be separated from Attendance records.

Required persistence concepts:

| Table/concept | Owner | Notes |
| --- | --- | --- |
| biometric_gateways | Integration | Branch gateway registration and health |
| biometric_terminals | Integration | Terminal identity and branch assignment |
| biometric_sync_events | Integration | Idempotent raw event intake keyed by terminal/gateway event ID |
| attendance_records | Attendance | Domain attendance record after validation and mapping |

## 27.5 Tally Sync Tables

Finance writes transactional outbox events. The Tally adapter stores delivery and reconciliation state separately.

Required persistence concepts:

| Table/concept | Owner | Notes |
| --- | --- | --- |
| outbox_events | Platform/Database | Transactional events from Finance and other contexts |
| tally_sync_attempts | Integration | Retry count, status, errors, external voucher/reference |
| integration_logs | Integration | Provider payload metadata and operational diagnostics |

Direct foreign-key coupling from Finance business tables to Tally provider tables should be avoided. Store external references in sync attempt records.
