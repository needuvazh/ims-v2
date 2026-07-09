import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

const prisma = new PrismaClient();

const systemPermissions = [
  // Organization Management
  {
    moduleCode: 'organization',
    featureCode: 'institute',
    actionCode: 'manage',
    permissionCode: 'organization.manage',
    permissionType: 'Action' as const,
    description: 'Manage institutes and branches.',
  },
  {
    moduleCode: 'organization',
    featureCode: 'branch',
    actionCode: 'manage',
    permissionCode: 'organization.branch.manage',
    permissionType: 'Action' as const,
    description: 'Create and update branches.',
  },
  {
    moduleCode: 'organization',
    featureCode: 'department',
    actionCode: 'manage',
    permissionCode: 'organization.department.manage',
    permissionType: 'Action' as const,
    description: 'Manage departments.',
  },
  {
    moduleCode: 'organization',
    featureCode: 'classroom',
    actionCode: 'manage',
    permissionCode: 'organization.classroom.manage',
    permissionType: 'Action' as const,
    description: 'Manage classrooms.',
  },

  // Identity & Access (RBAC)
  {
    moduleCode: 'iam',
    featureCode: 'user',
    actionCode: 'read',
    permissionCode: 'iam.user.read',
    permissionType: 'Action' as const,
    description: 'View users.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'user',
    actionCode: 'create',
    permissionCode: 'iam.user.create',
    permissionType: 'Action' as const,
    description: 'Create users.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'user',
    actionCode: 'update',
    permissionCode: 'iam.user.update',
    permissionType: 'Action' as const,
    description: 'Update users.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'user',
    actionCode: 'archive',
    permissionCode: 'iam.user.archive',
    permissionType: 'Action' as const,
    description: 'Archive users.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'user',
    actionCode: 'activate',
    permissionCode: 'iam.user.activate',
    permissionType: 'Action' as const,
    description: 'Activate users.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'user',
    actionCode: 'suspend',
    permissionCode: 'iam.user.suspend',
    permissionType: 'Action' as const,
    description: 'Suspend users.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'user',
    actionCode: 'unlock',
    permissionCode: 'iam.user.unlock',
    permissionType: 'Action' as const,
    description: 'Unlock users.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'user',
    actionCode: 'reset-password',
    permissionCode: 'iam.user.reset-password',
    permissionType: 'Action' as const,
    description: 'Reset user passwords.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'user',
    actionCode: 'export',
    permissionCode: 'iam.user.export',
    permissionType: 'Action' as const,
    description: 'Export users.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'user',
    actionCode: 'import',
    permissionCode: 'iam.user.import',
    permissionType: 'Action' as const,
    description: 'Import users.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'user',
    actionCode: 'assign-role',
    permissionCode: 'iam.user.assign-role',
    permissionType: 'Action' as const,
    description: 'Assign roles to users.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'user',
    actionCode: 'assign-branch',
    permissionCode: 'iam.user.assign-branch',
    permissionType: 'Action' as const,
    description: 'Assign branches to users.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'user',
    actionCode: 'view-login-history',
    permissionCode: 'iam.user.view-login-history',
    permissionType: 'Action' as const,
    description: 'View user login history.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'user',
    actionCode: 'view-sessions',
    permissionCode: 'iam.user.view-sessions',
    permissionType: 'Action' as const,
    description: 'View user sessions.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'role',
    actionCode: 'read',
    permissionCode: 'iam.role.read',
    permissionType: 'Action' as const,
    description: 'View roles.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'role',
    actionCode: 'create',
    permissionCode: 'iam.role.create',
    permissionType: 'Action' as const,
    description: 'Create roles.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'role',
    actionCode: 'update',
    permissionCode: 'iam.role.update',
    permissionType: 'Action' as const,
    description: 'Update roles.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'role',
    actionCode: 'archive',
    permissionCode: 'iam.role.archive',
    permissionType: 'Action' as const,
    description: 'Archive roles.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'role',
    actionCode: 'assign',
    permissionCode: 'iam.role.assign',
    permissionType: 'Action' as const,
    description: 'Assign roles.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'permission',
    actionCode: 'read',
    permissionCode: 'iam.permission.read',
    permissionType: 'Action' as const,
    description: 'View permissions.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'permission',
    actionCode: 'create',
    permissionCode: 'iam.permission.create',
    permissionType: 'Action' as const,
    description: 'Create permissions.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'permission',
    actionCode: 'update',
    permissionCode: 'iam.permission.update',
    permissionType: 'Action' as const,
    description: 'Update permissions.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'permission',
    actionCode: 'archive',
    permissionCode: 'iam.permission.archive',
    permissionType: 'Action' as const,
    description: 'Archive permissions.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'role',
    actionCode: 'assign-permission',
    permissionCode: 'iam.role.permission.assign',
    permissionType: 'Action' as const,
    description: 'Assign permissions to roles.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'session',
    actionCode: 'read',
    permissionCode: 'iam.session.read',
    permissionType: 'Action' as const,
    description: 'Read sessions.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'session',
    actionCode: 'terminate',
    permissionCode: 'iam.session.terminate',
    permissionType: 'Action' as const,
    description: 'Terminate sessions.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'security-policy',
    actionCode: 'read',
    permissionCode: 'iam.security-policy.read',
    permissionType: 'Action' as const,
    description: 'Read security policy.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'security-policy',
    actionCode: 'update',
    permissionCode: 'iam.security-policy.update',
    permissionType: 'Action' as const,
    description: 'Update security policy.',
  },
  {
    moduleCode: 'iam',
    featureCode: 'audit',
    actionCode: 'read',
    permissionCode: 'iam.audit.read',
    permissionType: 'Action' as const,
    description: 'View audit logs.',
  },
  // CRM / Leads Management
  {
    moduleCode: 'crm',
    featureCode: 'leads',
    actionCode: 'read',
    permissionCode: 'lead.read',
    permissionType: 'Action' as const,
    description: 'View leads.',
  },
  {
    moduleCode: 'crm',
    featureCode: 'leads',
    actionCode: 'write',
    permissionCode: 'lead.write',
    permissionType: 'Action' as const,
    description: 'Create and update leads.',
  },
  {
    moduleCode: 'crm',
    featureCode: 'leads',
    actionCode: 'create',
    permissionCode: 'lead.create',
    permissionType: 'Action' as const,
    description: 'Create leads.',
  },
  {
    moduleCode: 'crm',
    featureCode: 'leads',
    actionCode: 'update',
    permissionCode: 'lead.update',
    permissionType: 'Action' as const,
    description: 'Update leads.',
  },
  {
    moduleCode: 'crm',
    featureCode: 'leads',
    actionCode: 'delete',
    permissionCode: 'lead.delete',
    permissionType: 'Action' as const,
    description: 'Delete leads.',
  },
  {
    moduleCode: 'crm',
    featureCode: 'leads',
    actionCode: 'assign',
    permissionCode: 'lead.assign',
    permissionType: 'Action' as const,
    description: 'Assign leads.',
  },
  {
    moduleCode: 'crm',
    featureCode: 'leads',
    actionCode: 'lost',
    permissionCode: 'lead.lost',
    permissionType: 'Action' as const,
    description: 'Mark leads lost.',
  },
  {
    moduleCode: 'crm',
    featureCode: 'leads',
    actionCode: 'reveal_pii',
    permissionCode: 'lead.reveal_pii',
    permissionType: 'Action' as const,
    description: 'Reveal lead PII.',
  },
  {
    moduleCode: 'crm',
    featureCode: 'leads',
    actionCode: 'qualify',
    permissionCode: 'lead.qualify',
    permissionType: 'Action' as const,
    description: 'Qualify inquiries.',
  },
  {
    moduleCode: 'crm',
    featureCode: 'leads',
    actionCode: 'convert',
    permissionCode: 'lead.convert',
    permissionType: 'Action' as const,
    description: 'Convert leads to admissions.',
  },
  {
    moduleCode: 'crm',
    featureCode: 'leads',
    actionCode: 'read.all',
    permissionCode: 'crm.leads.read.all',
    permissionType: 'Action' as const,
    description: 'View all leads bypassing counselor scoping.',
  },
  {
    moduleCode: 'crm',
    featureCode: 'followup',
    actionCode: 'create',
    permissionCode: 'followup.create',
    permissionType: 'Action' as const,
    description: 'Create lead follow-ups.',
  },
  {
    moduleCode: 'crm',
    featureCode: 'followup',
    actionCode: 'update',
    permissionCode: 'followup.update',
    permissionType: 'Action' as const,
    description: 'Update lead follow-ups.',
  },

  // Admissions & Enrollments
  {
    moduleCode: 'enrollment',
    featureCode: 'student',
    actionCode: 'read',
    permissionCode: 'student.read',
    permissionType: 'Action' as const,
    description: 'View student details.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'student',
    actionCode: 'reveal_pii',
    permissionCode: 'student.reveal_pii',
    permissionType: 'Action' as const,
    description: 'Reveal masked student contact PII with audit.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'student',
    actionCode: 'write',
    permissionCode: 'student.write',
    permissionType: 'Action' as const,
    description: 'Register or edit student profiles.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'student',
    actionCode: 'create',
    permissionCode: 'student.create',
    permissionType: 'Action' as const,
    description: 'Create student profiles.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'student',
    actionCode: 'update',
    permissionCode: 'student.update',
    permissionType: 'Action' as const,
    description: 'Update student profiles.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'student',
    actionCode: 'status.change',
    permissionCode: 'student.status.change',
    permissionType: 'Action' as const,
    description: 'Change student lifecycle status.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'student',
    actionCode: 'archive',
    permissionCode: 'student.archive',
    permissionType: 'Action' as const,
    description: 'Archive student profiles.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'student',
    actionCode: 'restore',
    permissionCode: 'student.restore',
    permissionType: 'Action' as const,
    description: 'Restore archived student profiles.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'student',
    actionCode: 'idcard.manage',
    permissionCode: 'student.idcard.manage',
    permissionType: 'Action' as const,
    description: 'Issue and manage student ID cards.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'student',
    actionCode: 'duplicate.read',
    permissionCode: 'student.duplicate.read',
    permissionType: 'Action' as const,
    description: 'View duplicate review cases.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'student',
    actionCode: 'duplicate.resolve',
    permissionCode: 'student.duplicate.resolve',
    permissionType: 'Action' as const,
    description: 'Resolve duplicate review cases.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'student',
    actionCode: 'merge',
    permissionCode: 'student.merge',
    permissionType: 'Action' as const,
    description: 'Merge duplicate student profiles.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'student',
    actionCode: 'export',
    permissionCode: 'student.export',
    permissionType: 'Action' as const,
    description: 'Export student data.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'student',
    actionCode: 'audit.read',
    permissionCode: 'student.audit.read',
    permissionType: 'Action' as const,
    description: 'Read student audit trails.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'student',
    actionCode: 'identity.unmasked.read',
    permissionCode: 'student.identity.unmasked.read',
    permissionType: 'Action' as const,
    description: 'View unmasked student identity fields.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'student',
    actionCode: 'portal.self.read',
    permissionCode: 'student.portal.self.read',
    permissionType: 'Action' as const,
    description: 'Student portal self-view.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'student',
    actionCode: 'trainer.roster.read',
    permissionCode: 'student.trainer.roster.read',
    permissionType: 'Action' as const,
    description: 'Trainer roster quick view.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'student',
    actionCode: 'related.admission.read',
    permissionCode: 'student.related.admission.read',
    permissionType: 'Action' as const,
    description: 'Read linked admission summary.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'student',
    actionCode: 'related.enrollment.read',
    permissionCode: 'student.related.enrollment.read',
    permissionType: 'Action' as const,
    description: 'Read linked enrollment summary.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'student',
    actionCode: 'related.document.read',
    permissionCode: 'student.related.document.read',
    permissionType: 'Action' as const,
    description: 'Read linked document summary.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'enroll',
    actionCode: 'read',
    permissionCode: 'enrollment.read',
    permissionType: 'Action' as const,
    description: 'View enrollments list and details.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'enroll',
    actionCode: 'write',
    permissionCode: 'enrollment.create',
    permissionType: 'Action' as const,
    description: 'Create enrollments in courses/batches.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'enroll',
    actionCode: 'submit',
    permissionCode: 'enrollment.submit',
    permissionType: 'Action' as const,
    description: 'Submit enrollments for approval.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'enroll',
    actionCode: 'approve',
    permissionCode: 'enrollment.approve',
    permissionType: 'Action' as const,
    description: 'Approve submitted enrollments.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'enroll',
    actionCode: 'cancel',
    permissionCode: 'enrollment.cancel',
    permissionType: 'Action' as const,
    description: 'Cancel or reject enrollments.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'enroll',
    actionCode: 'drop',
    permissionCode: 'enrollment.drop',
    permissionType: 'Action' as const,
    description: 'Drop active/confirmed student enrollments.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'enroll',
    actionCode: 'walk-in-payment',
    permissionCode: 'enrollment.walk-in-payment',
    permissionType: 'Action' as const,
    description: 'Record payment for walk-in enrollments.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'admission',
    actionCode: 'read',
    permissionCode: 'admission.read',
    permissionType: 'Action' as const,
    description: 'View admission detail.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'admission',
    actionCode: 'create',
    permissionCode: 'admission.create',
    permissionType: 'Action' as const,
    description: 'Create and cancel admissions.',
  },
  {
    moduleCode: 'enrollment',
    featureCode: 'admission',
    actionCode: 'approve',
    permissionCode: 'admission.approve',
    permissionType: 'Action' as const,
    description: 'Approve or reject admissions.',
  },

  // Finance & Fee Management
  {
    moduleCode: 'finance',
    featureCode: 'payment',
    actionCode: 'write',
    permissionCode: 'payment.create',
    permissionType: 'Action' as const,
    description: 'Record payments and issue receipts.',
  },
  {
    moduleCode: 'finance',
    featureCode: 'refund',
    actionCode: 'request',
    permissionCode: 'refund.request',
    permissionType: 'Action' as const,
    description: 'Initiate a refund request.',
  },
  {
    moduleCode: 'finance',
    featureCode: 'refund',
    actionCode: 'approve',
    permissionCode: 'refund.approve',
    permissionType: 'Action' as const,
    description: 'Approve refund applications.',
  },
  {
    moduleCode: 'finance',
    featureCode: 'menu',
    actionCode: 'view',
    permissionCode: 'finance.menu.view',
    permissionType: 'Menu' as const,
    description: 'View Finance & Billings menu.',
  },
  {
    moduleCode: 'finance',
    featureCode: 'invoice',
    actionCode: 'read',
    permissionCode: 'finance.invoice.read',
    permissionType: 'Action' as const,
    description: 'View invoices list and details.',
  },
  {
    moduleCode: 'finance',
    featureCode: 'invoice',
    actionCode: 'create',
    permissionCode: 'finance.invoice.create',
    permissionType: 'Action' as const,
    description: 'Create new invoices.',
  },
  {
    moduleCode: 'finance',
    featureCode: 'payment',
    actionCode: 'read',
    permissionCode: 'finance.payment.read',
    permissionType: 'Action' as const,
    description: 'View payments list and details.',
  },
  {
    moduleCode: 'finance',
    featureCode: 'payment',
    actionCode: 'create',
    permissionCode: 'finance.payment.create',
    permissionType: 'Action' as const,
    description: 'Record new payments.',
  },
  {
    moduleCode: 'finance',
    featureCode: 'refund',
    actionCode: 'read',
    permissionCode: 'finance.refund.read',
    permissionType: 'Action' as const,
    description: 'View refunds list and details.',
  },

  // Course & Scheduling
  {
    moduleCode: 'courses',
    featureCode: 'syllabus',
    actionCode: 'manage',
    permissionCode: 'course.manage',
    permissionType: 'Action' as const,
    description: 'Manage courses, syllabus and pricing.',
  },
  {
    moduleCode: 'courses',
    featureCode: 'catalog',
    actionCode: 'view',
    permissionCode: 'course.catalog.view',
    permissionType: 'Action' as const,
    description: 'View course catalog.',
  },
  {
    moduleCode: 'courses',
    featureCode: 'catalog',
    actionCode: 'create',
    permissionCode: 'course.catalog.create',
    permissionType: 'Action' as const,
    description: 'Create course catalog entries.',
  },
  {
    moduleCode: 'courses',
    featureCode: 'catalog',
    actionCode: 'update',
    permissionCode: 'course.catalog.update',
    permissionType: 'Action' as const,
    description: 'Update course catalog entries.',
  },
  {
    moduleCode: 'courses',
    featureCode: 'catalog',
    actionCode: 'publish',
    permissionCode: 'course.catalog.publish',
    permissionType: 'Action' as const,
    description: 'Publish courses in catalog.',
  },
  {
    moduleCode: 'courses',
    featureCode: 'catalog',
    actionCode: 'archive',
    permissionCode: 'course.catalog.archive',
    permissionType: 'Action' as const,
    description: 'Archive courses in catalog.',
  },
  {
    moduleCode: 'courses',
    featureCode: 'batches',
    actionCode: 'view',
    permissionCode: 'batch.delivery.view',
    permissionType: 'Action' as const,
    description: 'View and manage course delivery batches.',
  },
  {
    moduleCode: 'courses',
    featureCode: 'batches',
    actionCode: 'assign',
    permissionCode: 'batch.delivery.assign',
    permissionType: 'Action' as const,
    description: 'Assign faculty/trainers to batches.',
  },
  {
    moduleCode: 'courses',
    featureCode: 'batches',
    actionCode: 'create',
    permissionCode: 'batch.delivery.create',
    permissionType: 'Action' as const,
    description: 'Create course delivery batches.',
  },
  {
    moduleCode: 'courses',
    featureCode: 'batches',
    actionCode: 'update',
    permissionCode: 'batch.delivery.update',
    permissionType: 'Action' as const,
    description: 'Update course delivery batches.',
  },
  {
    moduleCode: 'courses',
    featureCode: 'batches',
    actionCode: 'transition',
    permissionCode: 'batch.delivery.transition',
    permissionType: 'Action' as const,
    description: 'Transition course delivery batches status.',
  },
  {
    moduleCode: 'courses',
    featureCode: 'batches',
    actionCode: 'waitlist',
    permissionCode: 'waitinglist.manage',
    permissionType: 'Action' as const,
    description: 'Manage batch waitlists.',
  },
  {
    moduleCode: 'scheduling',
    featureCode: 'calendar',
    actionCode: 'read',
    permissionCode: 'scheduling.calendar.read',
    permissionType: 'Action' as const,
    description: 'View calendar rules and overrides.',
  },
  {
    moduleCode: 'scheduling',
    featureCode: 'calendar',
    actionCode: 'create',
    permissionCode: 'scheduling.calendar.create',
    permissionType: 'Action' as const,
    description: 'Create institute calendars.',
  },
  {
    moduleCode: 'scheduling',
    featureCode: 'calendar',
    actionCode: 'update',
    permissionCode: 'scheduling.calendar.update',
    permissionType: 'Action' as const,
    description: 'Update institute calendars.',
  },
  {
    moduleCode: 'scheduling',
    featureCode: 'venue-block',
    actionCode: 'read',
    permissionCode: 'scheduling.venueBlock.read',
    permissionType: 'Action' as const,
    description: 'View venue blocks.',
  },
  {
    moduleCode: 'scheduling',
    featureCode: 'venue-block',
    actionCode: 'create',
    permissionCode: 'scheduling.venueBlock.create',
    permissionType: 'Action' as const,
    description: 'Create venue blocks.',
  },
  {
    moduleCode: 'scheduling',
    featureCode: 'venue-block',
    actionCode: 'update',
    permissionCode: 'scheduling.venueBlock.update',
    permissionType: 'Action' as const,
    description: 'Update venue blocks.',
  },
  {
    moduleCode: 'scheduling',
    featureCode: 'conflict',
    actionCode: 'read',
    permissionCode: 'scheduling.conflict.read',
    permissionType: 'Action' as const,
    description: 'View scheduling conflicts.',
  },
  {
    moduleCode: 'scheduling',
    featureCode: 'holiday',
    actionCode: 'create',
    permissionCode: 'scheduling.holiday.create',
    permissionType: 'Action' as const,
    description: 'Create holidays.',
  },
  {
    moduleCode: 'scheduling',
    featureCode: 'sessions',
    actionCode: 'manage',
    permissionCode: 'schedule.manage',
    permissionType: 'Action' as const,
    description: 'Create and update schedules.',
  },

  // Attendance & Completion
  {
    moduleCode: 'attendance',
    featureCode: 'menu',
    actionCode: 'view',
    permissionCode: 'attendance.menu.view',
    permissionType: 'Menu' as const,
    description: 'View the attendance module menu.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'dashboard',
    actionCode: 'view',
    permissionCode: 'attendance.dashboard.view',
    permissionType: 'Menu' as const,
    description: 'View the attendance dashboard.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'sessions',
    actionCode: 'menu.view',
    permissionCode: 'attendance.sessions.menu.view',
    permissionType: 'Menu' as const,
    description: 'View attendance sessions menu.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'records',
    actionCode: 'menu.view',
    permissionCode: 'attendance.records.menu.view',
    permissionType: 'Menu' as const,
    description: 'View attendance records menu.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'corrections',
    actionCode: 'menu.view',
    permissionCode: 'attendance.corrections.menu.view',
    permissionType: 'Menu' as const,
    description: 'View attendance corrections menu.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'reports',
    actionCode: 'menu.view',
    permissionCode: 'attendance.reports.menu.view',
    permissionType: 'Menu' as const,
    description: 'View attendance reports menu.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'sessions',
    actionCode: 'read',
    permissionCode: 'attendance.session.read',
    permissionType: 'Action' as const,
    description: 'Read attendance sessions.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'sessions',
    actionCode: 'open',
    permissionCode: 'attendance.session.open',
    permissionType: 'Action' as const,
    description: 'Open attendance sessions.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'sessions',
    actionCode: 'submit',
    permissionCode: 'attendance.session.submit',
    permissionType: 'Action' as const,
    description: 'Submit attendance sessions.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'sessions',
    actionCode: 'lock',
    permissionCode: 'attendance.session.lock',
    permissionType: 'Action' as const,
    description: 'Lock attendance sessions.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'sessions',
    actionCode: 'reopen',
    permissionCode: 'attendance.session.reopen',
    permissionType: 'Action' as const,
    description: 'Reopen attendance sessions.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'records',
    actionCode: 'read',
    permissionCode: 'attendance.record.read',
    permissionType: 'Action' as const,
    description: 'Read attendance records.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'records',
    actionCode: 'write',
    permissionCode: 'attendance.record.mark',
    permissionType: 'Action' as const,
    description: 'Mark student attendance.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'records',
    actionCode: 'update',
    permissionCode: 'attendance.record.update',
    permissionType: 'Action' as const,
    description: 'Update attendance records.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'records',
    actionCode: 'bulkMark',
    permissionCode: 'attendance.record.bulkMark',
    permissionType: 'Action' as const,
    description: 'Bulk mark attendance records.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'records',
    actionCode: 'import',
    permissionCode: 'attendance.record.import',
    permissionType: 'Action' as const,
    description: 'Import attendance records.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'records',
    actionCode: 'export',
    permissionCode: 'attendance.record.export',
    permissionType: 'Action' as const,
    description: 'Export attendance records.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'corrections',
    actionCode: 'request',
    permissionCode: 'attendance.correction.request',
    permissionType: 'Action' as const,
    description: 'Request an attendance correction.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'corrections',
    actionCode: 'review',
    permissionCode: 'attendance.correction.review',
    permissionType: 'Action' as const,
    description: 'Review attendance corrections.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'corrections',
    actionCode: 'approve',
    permissionCode: 'attendance.correction.approve',
    permissionType: 'Action' as const,
    description: 'Approve attendance corrections.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'corrections',
    actionCode: 'reject',
    permissionCode: 'attendance.correction.reject',
    permissionType: 'Action' as const,
    description: 'Reject attendance corrections.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'audit',
    actionCode: 'read',
    permissionCode: 'attendance.audit.read',
    permissionType: 'Report' as const,
    description: 'Read attendance audit trail.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'reports',
    actionCode: 'daily.view',
    permissionCode: 'attendance.report.daily.view',
    permissionType: 'Report' as const,
    description: 'View daily attendance reports.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'reports',
    actionCode: 'batch.view',
    permissionCode: 'attendance.report.batch.view',
    permissionType: 'Report' as const,
    description: 'View batch attendance reports.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'reports',
    actionCode: 'student.view',
    permissionCode: 'attendance.report.student.view',
    permissionType: 'Report' as const,
    description: 'View student attendance reports.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'reports',
    actionCode: 'trainer.view',
    permissionCode: 'attendance.report.trainer.view',
    permissionType: 'Report' as const,
    description: 'View trainer attendance reports.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'reports',
    actionCode: 'lowAttendance.view',
    permissionCode: 'attendance.report.lowAttendance.view',
    permissionType: 'Report' as const,
    description: 'View low attendance reports.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'reports',
    actionCode: 'correctionAging.view',
    permissionCode: 'attendance.report.correctionAging.view',
    permissionType: 'Report' as const,
    description: 'View correction aging reports.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'reports',
    actionCode: 'export',
    permissionCode: 'attendance.report.export',
    permissionType: 'Report' as const,
    description: 'Export attendance reports.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'dashboard',
    actionCode: 'branch.view',
    permissionCode: 'attendance.dashboard.branch.view',
    permissionType: 'Report' as const,
    description: 'View branch attendance dashboard.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'dashboard',
    actionCode: 'consolidated.view',
    permissionCode: 'attendance.dashboard.consolidated.view',
    permissionType: 'Report' as const,
    description: 'View consolidated attendance dashboard.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'alerts',
    actionCode: 'read',
    permissionCode: 'attendance.alert.read',
    permissionType: 'Action' as const,
    description: 'Read attendance alerts.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'alerts',
    actionCode: 'detect',
    permissionCode: 'attendance.alert.detect',
    permissionType: 'Action' as const,
    description: 'Trigger low attendance detection.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'admin',
    actionCode: 'override',
    permissionCode: 'attendance.admin.override',
    permissionType: 'Action' as const,
    description: 'Use attendance admin override controls.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'reports',
    actionCode: 'consolidated.read',
    permissionCode: 'attendance.consolidated.read',
    permissionType: 'Report' as const,
    description: 'Read consolidated attendance data.',
  },
  {
    moduleCode: 'attendance',
    featureCode: 'records',
    actionCode: 'write',
    permissionCode: 'attendance.record',
    permissionType: 'Action' as const,
    description: 'Mark student attendance.',
  },

  // Faculty / Trainer Management
  {
    moduleCode: 'faculty',
    featureCode: 'menu',
    actionCode: 'view',
    permissionCode: 'menu.faculty',
    permissionType: 'Menu' as const,
    description: 'View the faculty and trainer module menu.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'menu',
    actionCode: 'trainers',
    permissionCode: 'menu.faculty.trainers',
    permissionType: 'Menu' as const,
    description: 'View the trainer registry menu.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'menu',
    actionCode: 'eligible-trainers',
    permissionCode: 'menu.faculty.eligible-trainers',
    permissionType: 'Menu' as const,
    description: 'View eligible trainers menu.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'menu',
    actionCode: 'leaves',
    permissionCode: 'menu.faculty.leaves',
    permissionType: 'Menu' as const,
    description: 'View the leave registry menu.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'menu',
    actionCode: 'reports',
    permissionCode: 'menu.faculty.reports',
    permissionType: 'Menu' as const,
    description: 'View faculty reports menu.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'trainer',
    actionCode: 'read',
    permissionCode: 'trainer.read',
    permissionType: 'Action' as const,
    description: 'Read trainer profiles and assignments.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'trainer',
    actionCode: 'create',
    permissionCode: 'trainer.create',
    permissionType: 'Action' as const,
    description: 'Create trainer profiles.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'trainer',
    actionCode: 'update',
    permissionCode: 'trainer.update',
    permissionType: 'Action' as const,
    description: 'Update trainer profiles.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'trainer',
    actionCode: 'status.manage',
    permissionCode: 'trainer.status.manage',
    permissionType: 'Action' as const,
    description: 'Change trainer status.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'qualification',
    actionCode: 'read',
    permissionCode: 'trainer.qualification.read',
    permissionType: 'Action' as const,
    description: 'Read trainer qualifications.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'qualification',
    actionCode: 'manage',
    permissionCode: 'trainer.qualification.manage',
    permissionType: 'Action' as const,
    description: 'Create and update trainer qualifications.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'availability',
    actionCode: 'read',
    permissionCode: 'trainer.availability.read',
    permissionType: 'Action' as const,
    description: 'Read trainer availability.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'availability',
    actionCode: 'manage',
    permissionCode: 'trainer.availability.manage',
    permissionType: 'Action' as const,
    description: 'Create and update trainer availability.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'authorization',
    actionCode: 'read',
    permissionCode: 'trainer.authorization.read',
    permissionType: 'Action' as const,
    description: 'Read trainer course authorizations.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'authorization',
    actionCode: 'manage',
    permissionCode: 'trainer.authorization.manage',
    permissionType: 'Action' as const,
    description: 'Create and update trainer course authorizations.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'compensation',
    actionCode: 'read',
    permissionCode: 'trainer.compensation.read',
    permissionType: 'Action' as const,
    description: 'Read trainer compensation rates.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'compensation',
    actionCode: 'manage',
    permissionCode: 'trainer.compensation.manage',
    permissionType: 'Action' as const,
    description: 'Create and update trainer compensation rates.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'eligibility',
    actionCode: 'read',
    permissionCode: 'trainer.eligibility.read',
    permissionType: 'Report' as const,
    description: 'Validate eligible trainers for scheduling.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'reports',
    actionCode: 'view',
    permissionCode: 'trainer.report.view',
    permissionType: 'Report' as const,
    description: 'View trainer reports.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'reports',
    actionCode: 'export',
    permissionCode: 'trainer.report.export',
    permissionType: 'Report' as const,
    description: 'Export trainer reports.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'audit',
    actionCode: 'read',
    permissionCode: 'trainer.audit.read',
    permissionType: 'Report' as const,
    description: 'Read trainer audit history.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'leaves',
    actionCode: 'read',
    permissionCode: 'leave.read',
    permissionType: 'Action' as const,
    description: 'View leave registry and details.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'leaves',
    actionCode: 'apply',
    permissionCode: 'leave.apply',
    permissionType: 'Action' as const,
    description: 'Submit leave requests.',
  },
  {
    moduleCode: 'faculty',
    featureCode: 'leaves',
    actionCode: 'approve',
    permissionCode: 'leave.approve',
    permissionType: 'Action' as const,
    description: 'Approve or reject leave requests.',
  },
  {
    moduleCode: 'exams',
    featureCode: 'results',
    actionCode: 'write',
    permissionCode: 'result.record',
    permissionType: 'Action' as const,
    description: 'Enter exam marks and grades.',
  },

  // Exam, Result & Completion Management Permissions (from packages/exam-result-completion)
  // Exam Permissions
  {
    moduleCode: 'exam-completion',
    featureCode: 'exam',
    actionCode: 'view',
    permissionCode: 'exam.view',
    permissionType: 'Action' as const,
    description: 'View exams list and details.',
  },
  {
    moduleCode: 'exam-completion',
    featureCode: 'exam',
    actionCode: 'create',
    permissionCode: 'exam.create',
    permissionType: 'Action' as const,
    description: 'Create new exams.',
  },
  {
    moduleCode: 'exam-completion',
    featureCode: 'exam',
    actionCode: 'update',
    permissionCode: 'exam.update',
    permissionType: 'Action' as const,
    description: 'Update exam details and schedule.',
  },
  {
    moduleCode: 'exam-completion',
    featureCode: 'exam',
    actionCode: 'delete',
    permissionCode: 'exam.delete',
    permissionType: 'Action' as const,
    description: 'Cancel or archive exams.',
  },

  // Result Permissions
  {
    moduleCode: 'exam-completion',
    featureCode: 'result',
    actionCode: 'view',
    permissionCode: 'result.view',
    permissionType: 'Action' as const,
    description: 'View results list and details.',
  },
  {
    moduleCode: 'exam-completion',
    featureCode: 'result',
    actionCode: 'create',
    permissionCode: 'result.create',
    permissionType: 'Action' as const,
    description: 'Record exam results.',
  },
  {
    moduleCode: 'exam-completion',
    featureCode: 'result',
    actionCode: 'finalize',
    permissionCode: 'result.finalize',
    permissionType: 'Action' as const,
    description: 'Finalize recorded results.',
  },
  {
    moduleCode: 'exam-completion',
    featureCode: 'result',
    actionCode: 'correct',
    permissionCode: 'result.correct',
    permissionType: 'Action' as const,
    description: 'Correct finalized results.',
  },
  {
    moduleCode: 'exam-completion',
    featureCode: 'result',
    actionCode: 'export',
    permissionCode: 'result.export',
    permissionType: 'Action' as const,
    description: 'Export results data.',
  },

  // Completion Permissions
  {
    moduleCode: 'exam-completion',
    featureCode: 'completion',
    actionCode: 'view',
    permissionCode: 'completion.view',
    permissionType: 'Action' as const,
    description: 'View completions list and details.',
  },
  {
    moduleCode: 'exam-completion',
    featureCode: 'completion',
    actionCode: 'evaluate',
    permissionCode: 'completion.evaluate',
    permissionType: 'Action' as const,
    description: 'Evaluate course completions.',
  },
  {
    moduleCode: 'exam-completion',
    featureCode: 'completion',
    actionCode: 'reevaluate',
    permissionCode: 'completion.reevaluate',
    permissionType: 'Action' as const,
    description: 'Request reevaluation of approved completions.',
  },
  {
    moduleCode: 'exam-completion',
    featureCode: 'completion',
    actionCode: 'recommend',
    permissionCode: 'completion.recommend',
    permissionType: 'Action' as const,
    description: 'Recommend completions (Trainer role).',
  },
  {
    moduleCode: 'exam-completion',
    featureCode: 'completion',
    actionCode: 'coordinator-review',
    permissionCode: 'completion.coordinator-review',
    permissionType: 'Action' as const,
    description: 'Review completions (Coordinator role).',
  },
  {
    moduleCode: 'exam-completion',
    featureCode: 'completion',
    actionCode: 'final-approve',
    permissionCode: 'completion.final-approve',
    permissionType: 'Action' as const,
    description: 'Final approval of completions (Branch Manager role).',
  },

  // Report Permissions
  {
    moduleCode: 'exam-completion',
    featureCode: 'report',
    actionCode: 'view',
    permissionCode: 'exam-completion.report.view',
    permissionType: 'Action' as const,
    description: 'View exam and completion reports.',
  },
  {
    moduleCode: 'exam-completion',
    featureCode: 'report',
    actionCode: 'export',
    permissionCode: 'exam-completion.report.export',
    permissionType: 'Action' as const,
    description: 'Export exam and completion reports.',
  },

  // Menu Permissions
  {
    moduleCode: 'exam-completion',
    featureCode: 'menu',
    actionCode: 'view',
    permissionCode: 'exam-completion.menu.view',
    permissionType: 'Menu' as const,
    description: 'View Exam & Completion menu.',
  },

  // Certificates
  {
    moduleCode: 'certificate',
    featureCode: 'issue',
    actionCode: 'view',
    permissionCode: 'certificate.view',
    permissionType: 'Action' as const,
    description: 'View certificates registry.',
  },
  {
    moduleCode: 'certificate',
    featureCode: 'issue',
    actionCode: 'create',
    permissionCode: 'certificate.create',
    permissionType: 'Action' as const,
    description: 'Generate certificates.',
  },
  {
    moduleCode: 'certificate',
    featureCode: 'issue',
    actionCode: 'issue',
    permissionCode: 'certificate.issue',
    permissionType: 'Action' as const,
    description: 'Issue generated certificates.',
  },
  {
    moduleCode: 'certificate',
    featureCode: 'issue',
    actionCode: 'reissue',
    permissionCode: 'certificate.reissue',
    permissionType: 'Action' as const,
    description: 'Request, review, and approve certificate reissues.',
  },
  {
    moduleCode: 'certificate',
    featureCode: 'issue',
    actionCode: 'revoke',
    permissionCode: 'certificate.revoke',
    permissionType: 'Action' as const,
    description: 'Revoke issued certificates.',
  },
  {
    moduleCode: 'certificate',
    featureCode: 'public',
    actionCode: 'verify',
    permissionCode: 'certificate.verify',
    permissionType: 'Action' as const,
    description: 'Verify certificates publicly.',
  },

  // Dashboard & Audit
  {
    moduleCode: 'dashboard',
    featureCode: 'summary',
    actionCode: 'view',
    permissionCode: 'dashboard.view',
    permissionType: 'Action' as const,
    description: 'View dashboard metrics.',
  },
  {
    moduleCode: 'dashboard',
    featureCode: 'security',
    actionCode: 'view',
    permissionCode: 'dashboard.security',
    permissionType: 'Action' as const,
    description: 'View security dashboard.',
  },
  {
    moduleCode: 'dashboard',
    featureCode: 'admin',
    actionCode: 'view',
    permissionCode: 'dashboard.admin',
    permissionType: 'Action' as const,
    description: 'View administration dashboard.',
  },
  {
    moduleCode: 'dashboard',
    featureCode: 'ceo',
    actionCode: 'view',
    permissionCode: 'dashboard.ceo',
    permissionType: 'Action' as const,
    description: 'View executive dashboard.',
  },
  {
    moduleCode: 'dashboard',
    featureCode: 'compliance',
    actionCode: 'view',
    permissionCode: 'dashboard.compliance',
    permissionType: 'Action' as const,
    description: 'View compliance dashboard.',
  },
  {
    moduleCode: 'dashboard',
    featureCode: 'branch',
    actionCode: 'view',
    permissionCode: 'dashboard.branch',
    permissionType: 'Action' as const,
    description: 'View branch dashboard.',
  },
  {
    moduleCode: 'dashboard',
    featureCode: 'finance',
    actionCode: 'view',
    permissionCode: 'dashboard.finance',
    permissionType: 'Action' as const,
    description: 'View finance dashboard.',
  },
  {
    moduleCode: 'dashboard',
    featureCode: 'training',
    actionCode: 'view',
    permissionCode: 'dashboard.training',
    permissionType: 'Action' as const,
    description: 'View training dashboard.',
  },
  {
    moduleCode: 'dashboard',
    featureCode: 'crm',
    actionCode: 'view',
    permissionCode: 'dashboard.crm',
    permissionType: 'Action' as const,
    description: 'View CRM dashboard.',
  },
  {
    moduleCode: 'report',
    featureCode: 'iam',
    actionCode: 'user',
    permissionCode: 'report.iam.user',
    permissionType: 'Report' as const,
    description: 'View user directory report.',
  },
  {
    moduleCode: 'report',
    featureCode: 'iam',
    actionCode: 'user-access',
    permissionCode: 'report.iam.user-access',
    permissionType: 'Report' as const,
    description: 'View user access report.',
  },
  {
    moduleCode: 'report',
    featureCode: 'iam',
    actionCode: 'login-history',
    permissionCode: 'report.iam.login-history',
    permissionType: 'Report' as const,
    description: 'View login history report.',
  },
  {
    moduleCode: 'report',
    featureCode: 'iam',
    actionCode: 'security',
    permissionCode: 'report.iam.security',
    permissionType: 'Report' as const,
    description: 'View security report.',
  },
  {
    moduleCode: 'report',
    featureCode: 'iam',
    actionCode: 'role',
    permissionCode: 'report.iam.role',
    permissionType: 'Report' as const,
    description: 'View role report.',
  },
  {
    moduleCode: 'report',
    featureCode: 'iam',
    actionCode: 'permission',
    permissionCode: 'report.iam.permission',
    permissionType: 'Report' as const,
    description: 'View permission report.',
  },
  {
    moduleCode: 'report',
    featureCode: 'iam',
    actionCode: 'branch',
    permissionCode: 'report.iam.branch',
    permissionType: 'Report' as const,
    description: 'View branch access report.',
  },
  {
    moduleCode: 'report',
    featureCode: 'iam',
    actionCode: 'privileged',
    permissionCode: 'report.iam.privileged',
    permissionType: 'Report' as const,
    description: 'View privileged users report.',
  },
  {
    moduleCode: 'report',
    featureCode: 'iam',
    actionCode: 'session',
    permissionCode: 'report.iam.session',
    permissionType: 'Report' as const,
    description: 'View session report.',
  },
  {
    moduleCode: 'report',
    featureCode: 'iam',
    actionCode: 'audit-trail',
    permissionCode: 'report.iam.audit-trail',
    permissionType: 'Report' as const,
    description: 'View audit trail report.',
  },

  // CRM Dashboards & Reports
  {
    moduleCode: 'report',
    featureCode: 'crm-dashboard',
    actionCode: 'view',
    permissionCode: 'REPORTING_VIEW_CRM_DASHBOARD',
    permissionType: 'Action' as const,
    description: 'View CRM dashboard.',
  },
  {
    moduleCode: 'report',
    featureCode: 'counselor-metrics',
    actionCode: 'view',
    permissionCode: 'REPORTING_VIEW_COUNSELOR_METRICS',
    permissionType: 'Action' as const,
    description: 'View counselor performance metrics.',
  },
  {
    moduleCode: 'crm',
    featureCode: 'leads',
    actionCode: 'read.all_branch',
    permissionCode: 'LEAD_VIEW_ALL_IN_BRANCH',
    permissionType: 'Action' as const,
    description: 'View all leads in active branch.',
  },

  // Document Management
  {
    moduleCode: 'documents',
    featureCode: 'document',
    actionCode: 'create',
    permissionCode: 'document.create',
    permissionType: 'Action' as const,
    description: 'Create and upload documents.',
  },
  {
    moduleCode: 'documents',
    featureCode: 'document',
    actionCode: 'view',
    permissionCode: 'document.view',
    permissionType: 'Action' as const,
    description: 'View documents list and details.',
  },
  {
    moduleCode: 'documents',
    featureCode: 'document',
    actionCode: 'verify.submit',
    permissionCode: 'document.verify.submit',
    permissionType: 'Action' as const,
    description: 'Submit documents for verification.',
  },
  {
    moduleCode: 'documents',
    featureCode: 'document',
    actionCode: 'verify.approve',
    permissionCode: 'document.verify.approve',
    permissionType: 'Action' as const,
    description: 'Approve document verification.',
  },
  {
    moduleCode: 'documents',
    featureCode: 'document',
    actionCode: 'verify.reject',
    permissionCode: 'document.verify.reject',
    permissionType: 'Action' as const,
    description: 'Reject document verification.',
  },
  {
    moduleCode: 'documents',
    featureCode: 'document',
    actionCode: 'retire',
    permissionCode: 'document.retire',
    permissionType: 'Action' as const,
    description: 'Retire or soft-delete documents.',
  },
  {
    moduleCode: 'documents',
    featureCode: 'requirement',
    actionCode: 'manage',
    permissionCode: 'document.requirement.manage',
    permissionType: 'Action' as const,
    description:
      'Configure dynamic document requirement rules (Document Master).',
  },
  {
    moduleCode: 'courseCatalog',
    featureCode: 'courses',
    actionCode: 'menu.view',
    permissionCode: 'course.catalog.menu.view',
    permissionType: 'Action' as const,
    description: 'View the Course Catalog menu in the sidebar.',
  },
  {
    moduleCode: 'courseCatalog',
    featureCode: 'courses',
    actionCode: 'dashboard.view',
    permissionCode: 'course.catalog.dashboard.view',
    permissionType: 'Action' as const,
    description: 'View the Courses operational dashboard.',
  },
  {
    moduleCode: 'batchDelivery',
    featureCode: 'batches',
    actionCode: 'menu.view',
    permissionCode: 'batch.delivery.menu.view',
    permissionType: 'Action' as const,
    description: 'View the Training Delivery (Batches) menu in the sidebar.',
  },
  {
    moduleCode: 'batchDelivery',
    featureCode: 'batches',
    actionCode: 'dashboard.view',
    permissionCode: 'batch.delivery.dashboard.view',
    permissionType: 'Action' as const,
    description: 'View the Batches operational dashboard.',
  },
];

async function seed() {
  console.log('🌱 Starting seed...');

  // 1. Clean up existing relations to prevent duplicate key errors in fresh seeds
  console.log('🧹 Cleaning old records...');
  // Finance cleanup
  await prisma.refund.deleteMany({});
  await prisma.receipt.deleteMany({});
  await prisma.paymentAllocation.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.installment.deleteMany({});
  await prisma.installmentPlan.deleteMany({});
  await prisma.receivable.deleteMany({});
  await prisma.invoiceLineItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.corporateCreditRule.deleteMany({});

  await prisma.attendanceCorrection.deleteMany({});
  await prisma.attendanceAlert.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.attendanceSession.deleteMany({});
  await prisma.walkInConfirmation.deleteMany({});
  await prisma.walkInPayment.deleteMany({});
  await prisma.walkInEnrollment.deleteMany({});
  // Exam, Completion & Certificate cleanup
  await prisma.certificateVerification.deleteMany({});
  await prisma.certificateReissueRequest.deleteMany({});
  await prisma.certificate.deleteMany({});
  await prisma.courseCompletion.deleteMany({});
  await prisma.result.deleteMany({});
  await prisma.exam.deleteMany({});

  await prisma.enrollment.deleteMany({});
  await prisma.documentVerification.deleteMany({});
  await prisma.documentOwner.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.studentDuplicateCaseItem.deleteMany({});
  await prisma.studentMergeLog.deleteMany({});
  await prisma.studentStatusHistory.deleteMany({});
  await prisma.studentIdCardHistory.deleteMany({});
  await prisma.studentDuplicateCase.deleteMany({});
  await prisma.studentExportLog.deleteMany({});
  await prisma.admission.deleteMany({});
  await prisma.studentProfile.deleteMany({});
  await prisma.leadStageHistory.deleteMany({});
  await prisma.leadFollowUp.deleteMany({});
  await prisma.leadNote.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.inquiry.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.batchTrainer.deleteMany({});
  await prisma.waitingList.deleteMany({});
  await prisma.batch.deleteMany({});
  await prisma.coursePricing.deleteMany({});
  await prisma.courseCompletionRule.deleteMany({});
  await prisma.courseDiscount.deleteMany({});
  await prisma.trainerCourseAuthorization.deleteMany({});
  await prisma.trainerCompensationRate.deleteMany({});
  await prisma.trainerAvailability.deleteMany({});
  await prisma.trainerQualification.deleteMany({});
  await prisma.trainerProfile.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.courseCategory.deleteMany({});
  await prisma.passwordResetToken.deleteMany({});
  await prisma.loginHistory.deleteMany({});
  await prisma.userSession.deleteMany({});
  await prisma.userBranchAccess.deleteMany({});
  await prisma.userActivationToken.deleteMany({});
  await prisma.passwordHistory.deleteMany({});
  await prisma.securityPolicy.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.person.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.classroom.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.branch.deleteMany({});
  await prisma.institute.deleteMany({});

  // 2. Seed Permissions
  const permRecords = [];
  for (const perm of systemPermissions) {
    const record = await prisma.permission.create({
      data: {
        id: crypto.randomUUID(),
        ...perm,
        status: 'Active',
      },
    });
    permRecords.push(record);
    console.log(`  ✓ Permission created: ${perm.permissionCode}`);
  }

  // 3. Seed Roles
  const rolesToCreate = [
    {
      code: 'SUPER_ADMIN',
      name: 'Super Administrator',
      desc: 'Full unrestricted access to all IMS modules.',
    },
    {
      code: 'OWNER',
      name: 'Owner',
      desc: 'Global owner-level management and financial approvals.',
    },
    {
      code: 'BRANCH_MANAGER',
      name: 'Branch Manager',
      desc: 'Branch-level administrative and financial access.',
    },
    {
      code: 'COUNSELOR',
      name: 'Student Counselor',
      desc: 'Lead management, admissions, and student views.',
    },
    {
      code: 'TRAINER',
      name: 'Trainer',
      desc: 'Mark attendance, recommend completion, and view schedules.',
    },
    {
      code: 'ACCOUNTANT',
      name: 'Accountant',
      desc: 'Manage payments, issue receipts, and request refunds.',
    },
    {
      code: 'STUDENT',
      name: 'Student',
      desc: 'View fees, certificates, and attendance on portal.',
    },
    {
      code: 'ACADEMIC_COORDINATOR',
      name: 'Academic Coordinator',
      desc: 'Manage syllabus, courses, and exam evaluations.',
    },
    {
      code: 'MANAGEMENT',
      name: 'Management',
      desc: 'Global read-only access to audit logs and business analytics.',
    },
    {
      code: 'AUDITOR',
      name: 'Auditor',
      desc: 'Audit-only access to compliance-sensitive records and exports.',
    },
    {
      code: 'READ_ONLY_EXECUTIVE',
      name: 'Read Only Executive',
      desc: 'Executive reporting access without mutation permissions.',
    },
  ];

  const roleMap: Record<string, any> = {};
  for (const r of rolesToCreate) {
    const record = await prisma.role.create({
      data: {
        id: crypto.randomUUID(),
        roleCode: r.code,
        roleName: r.name,
        description: r.desc,
        status: 'Active',
        effectiveStartDate: new Date(),
      },
    });
    roleMap[r.code] = record;
    console.log(`  ✓ Role created: ${r.code}`);
  }

  // 4. Assign Permissions to Roles
  // Super Admin & Owner get all permissions
  for (const perm of permRecords) {
    await prisma.rolePermission.create({
      data: { roleId: roleMap['SUPER_ADMIN'].id, permissionId: perm.id },
    });
    await prisma.rolePermission.create({
      data: { roleId: roleMap['OWNER'].id, permissionId: perm.id },
    });
  }
  console.log(`  ✓ Assigned all permissions to SUPER_ADMIN & OWNER`);

  // Branch Manager gets branch-scoped management permissions
  const managerPermCodes = [
    'organization.branch.manage',
    'organization.department.manage',
    'organization.classroom.manage',
    'iam.user.read',
    'iam.role.read',
    'iam.session.read',
    'iam.security-policy.read',
    'iam.audit.read',
    'report.iam.user',
    'report.iam.login-history',
    'report.iam.security',
    'lead.read',
    'lead.write',
    'lead.create',
    'lead.update',
    'lead.delete',
    'lead.assign',
    'lead.lost',
    'lead.reveal_pii',
    'lead.qualify',
    'lead.convert',
    'crm.leads.read.all',
    'followup.create',
    'followup.update',
    'student.read',
    'student.reveal_pii',
    'student.write',
    'enrollment.create',
    'enrollment.submit',
    'enrollment.read',
    'enrollment.approve',
    'enrollment.cancel',
    'enrollment.drop',
    'enrollment.walk-in-payment',
    'admission.read',
    'admission.create',
    'admission.approve',
    'payment.create',
    'refund.request',
    'refund.approve',
    'course.manage',
    'scheduling.calendar.read',
    'scheduling.calendar.create',
    'scheduling.calendar.update',
    'scheduling.venueBlock.read',
    'scheduling.venueBlock.create',
    'scheduling.venueBlock.update',
    'scheduling.conflict.read',
    'scheduling.holiday.create',
    'schedule.manage',
    'course.catalog.view',
    'course.catalog.create',
    'course.catalog.update',
    'course.catalog.publish',
    'course.catalog.archive',
    'batch.delivery.view',
    'batch.delivery.assign',
    'batch.delivery.create',
    'batch.delivery.update',
    'batch.delivery.transition',
    'waitinglist.manage',
    'attendance.menu.view',
    'attendance.dashboard.view',
    'attendance.sessions.menu.view',
    'attendance.records.menu.view',
    'attendance.corrections.menu.view',
    'attendance.reports.menu.view',
    'attendance.session.read',
    'attendance.session.open',
    'attendance.session.submit',
    'attendance.session.lock',
    'attendance.session.reopen',
    'attendance.record.read',
    'attendance.record.mark',
    'attendance.record.update',
    'attendance.record.bulkMark',
    'attendance.record.import',
    'attendance.record.export',
    'attendance.correction.request',
    'attendance.correction.review',
    'attendance.correction.approve',
    'attendance.correction.reject',
    'attendance.audit.read',
    'attendance.report.daily.view',
    'attendance.report.batch.view',
    'attendance.report.student.view',
    'attendance.report.trainer.view',
    'attendance.report.lowAttendance.view',
    'attendance.report.correctionAging.view',
    'attendance.report.export',
    'attendance.dashboard.branch.view',
    'attendance.dashboard.consolidated.view',
    'attendance.alert.read',
    'attendance.alert.detect',
    'attendance.admin.override',
    'attendance.consolidated.read',
    'menu.faculty',
    'menu.faculty.trainers',
    'menu.faculty.eligible-trainers',
    'menu.faculty.reports',
    'menu.faculty.leaves',
    'leave.read',
    'leave.apply',
    'leave.approve',
    'trainer.read',
    'trainer.create',
    'trainer.update',
    'trainer.status.manage',
    'trainer.qualification.read',
    'trainer.qualification.manage',
    'trainer.availability.read',
    'trainer.availability.manage',
    'trainer.authorization.read',
    'trainer.authorization.manage',
    'trainer.compensation.read',
    'trainer.compensation.manage',
    'trainer.eligibility.read',
    'trainer.report.view',
    'trainer.report.export',
    'trainer.audit.read',
    'result.record',
    'certificate.view',
    'certificate.create',
    'certificate.issue',
    'certificate.reissue',
    'certificate.revoke',
    'exam.view',
    'exam.create',
    'exam.update',
    'exam.delete',
    'result.view',
    'result.create',
    'result.finalize',
    'result.correct',
    'completion.view',
    'completion.evaluate',
    'completion.final-approve',
    'exam-completion.report.view',
    'exam-completion.report.export',
    'exam-completion.menu.view',
    'certificate.verify',
    'dashboard.branch',
    'dashboard.security',
    'dashboard.view',
    'REPORTING_VIEW_CRM_DASHBOARD',
    'REPORTING_VIEW_COUNSELOR_METRICS',
    'LEAD_VIEW_ALL_IN_BRANCH',
    'document.create',
    'document.view',
    'document.verify.submit',
    'document.verify.approve',
    'document.verify.reject',
    'document.retire',
    'document.requirement.manage',
    'course.catalog.menu.view',
    'course.catalog.dashboard.view',
    'batch.delivery.menu.view',
    'batch.delivery.dashboard.view',
  ];
  const managerPerms = permRecords.filter((p) =>
    managerPermCodes.includes(p.permissionCode),
  );
  for (const perm of managerPerms) {
    await prisma.rolePermission.create({
      data: { roleId: roleMap['BRANCH_MANAGER'].id, permissionId: perm.id },
    });
  }
  console.log(`  ✓ Assigned permissions to BRANCH_MANAGER`);

  // Counselor permissions
  const counselorPermCodes = [
    'iam.user.read',
    'lead.read',
    'lead.write',
    'lead.create',
    'lead.update',
    'lead.assign',
    'lead.lost',
    'lead.qualify',
    'lead.convert',
    'followup.create',
    'followup.update',
    'course.catalog.view',
    'batch.delivery.view',
    'student.read',
    'dashboard.crm',
    'report.iam.user',
    'dashboard.view',
    'REPORTING_VIEW_CRM_DASHBOARD',
    'admission.read',
    'admission.create',
    'enrollment.read',
    'document.create',
    'document.view',
    'document.verify.submit',
    'document.retire',
  ];
  const counselorPerms = permRecords.filter((p) =>
    counselorPermCodes.includes(p.permissionCode),
  );
  for (const perm of counselorPerms) {
    await prisma.rolePermission.create({
      data: { roleId: roleMap['COUNSELOR'].id, permissionId: perm.id },
    });
  }
  console.log(`  ✓ Assigned permissions to COUNSELOR`);

  // Academic Coordinator permissions
  const academicCoordinatorPermCodes = [
    'course.manage',
    'course.catalog.view',
    'course.catalog.create',
    'course.catalog.update',
    'course.catalog.publish',
    'course.catalog.archive',
    'batch.delivery.view',
    'batch.delivery.create',
    'batch.delivery.update',
    'batch.delivery.assign',
    'batch.delivery.transition',
    'schedule.manage',
    'scheduling.calendar.read',
    'scheduling.calendar.create',
    'scheduling.calendar.update',
    'scheduling.conflict.read',
    'scheduling.holiday.create',
    'menu.faculty',
    'menu.faculty.trainers',
    'menu.faculty.eligible-trainers',
    'menu.faculty.reports',
    'menu.faculty.leaves',
    'leave.read',
    'leave.apply',
    'leave.approve',
    'trainer.read',
    'trainer.update',
    'trainer.qualification.read',
    'trainer.qualification.manage',
    'trainer.availability.read',
    'trainer.availability.manage',
    'trainer.authorization.read',
    'trainer.authorization.manage',
    'trainer.compensation.read',
    'trainer.report.view',
    'trainer.report.export',
    'trainer.eligibility.read',
    'exam.view',
    'result.view',
    'result.create',
    'result.finalize',
    'completion.view',
    'completion.evaluate',
    'completion.coordinator-review',
    'exam-completion.report.view',
    'exam-completion.menu.view',
    'certificate.view',
    'certificate.reissue',
    'document.view',
    'document.verify.submit',
    'document.verify.approve',
    'document.verify.reject',
    'course.catalog.menu.view',
    'course.catalog.dashboard.view',
    'batch.delivery.menu.view',
    'batch.delivery.dashboard.view',
  ];
  const academicCoordinatorPerms = permRecords.filter((p) =>
    academicCoordinatorPermCodes.includes(p.permissionCode),
  );
  for (const perm of academicCoordinatorPerms) {
    await prisma.rolePermission.create({
      data: {
        roleId: roleMap['ACADEMIC_COORDINATOR'].id,
        permissionId: perm.id,
      },
    });
  }
  console.log(`  ✓ Assigned permissions to ACADEMIC_COORDINATOR`);

  // Trainer permissions
  const trainerPermCodes = [
    'student.read',
    'scheduling.calendar.read',
    'schedule.manage',
    'attendance.menu.view',
    'attendance.dashboard.view',
    'attendance.sessions.menu.view',
    'attendance.records.menu.view',
    'attendance.session.read',
    'attendance.session.open',
    'attendance.session.submit',
    'attendance.record.read',
    'attendance.record.mark',
    'attendance.record.update',
    'attendance.correction.request',
    'attendance.report.daily.view',
    'attendance.report.batch.view',
    'attendance.report.student.view',
    'attendance.report.lowAttendance.view',
    'result.record',
    'dashboard.training',
    'batch.delivery.view',
    'exam.view',
    'result.view',
    'result.create',
    'completion.view',
    'completion.recommend',
    'exam-completion.menu.view',
    'document.create',
    'document.view',
    'document.verify.submit',
    'batch.delivery.menu.view',
    'batch.delivery.dashboard.view',
  ];
  const trainerPerms = permRecords.filter((p) =>
    trainerPermCodes.includes(p.permissionCode),
  );
  for (const perm of trainerPerms) {
    await prisma.rolePermission.create({
      data: { roleId: roleMap['TRAINER'].id, permissionId: perm.id },
    });
  }
  console.log(`  ✓ Assigned permissions to TRAINER`);
  console.log(
    `  ✓ TRAINER role includes attendance access; SUPER_ADMIN receives all permissions`,
  );

  // Accountant permissions
  const accountantPermCodes = [
    'student.read',
    'payment.create',
    'refund.request',
    'refund.approve',
    'dashboard.finance',
    'dashboard.view',
    'enrollment.read',
    'finance.menu.view',
    'finance.invoice.read',
    'finance.invoice.create',
    'finance.payment.read',
    'finance.payment.create',
    'finance.refund.read',
  ];
  const accountantPerms = permRecords.filter((p) =>
    accountantPermCodes.includes(p.permissionCode),
  );
  for (const perm of accountantPerms) {
    await prisma.rolePermission.create({
      data: { roleId: roleMap['ACCOUNTANT'].id, permissionId: perm.id },
    });
  }
  console.log(`  ✓ Assigned permissions to ACCOUNTANT`);

  // Student permissions (mostly read-only dashboard)
  const studentPerms = permRecords.filter((p) =>
    [
      'certificate.verify',
      'attendance.record.read',
      'attendance.report.student.view',
      'document.create',
      'document.view',
    ].includes(p.permissionCode),
  );
  for (const perm of studentPerms) {
    await prisma.rolePermission.create({
      data: { roleId: roleMap['STUDENT'].id, permissionId: perm.id },
    });
  }
  console.log(`  ✓ Assigned permissions to STUDENT`);

  // Auditor permissions
  const auditorPermCodes = [
    'attendance.audit.read',
    'attendance.report.daily.view',
    'attendance.report.batch.view',
    'attendance.report.student.view',
    'attendance.report.trainer.view',
    'attendance.report.lowAttendance.view',
    'attendance.report.correctionAging.view',
    'attendance.report.export',
    'attendance.consolidated.read',
    'iam.audit.read',
    'report.iam.audit-trail',
    'dashboard.compliance',
    'exam.view',
    'result.view',
    'result.export',
    'completion.view',
    'exam-completion.report.view',
    'exam-completion.report.export',
    'exam-completion.menu.view',
  ];
  const auditorPerms = permRecords.filter((p) =>
    auditorPermCodes.includes(p.permissionCode),
  );
  for (const perm of auditorPerms) {
    await prisma.rolePermission.create({
      data: { roleId: roleMap['AUDITOR'].id, permissionId: perm.id },
    });
  }
  console.log(`  ✓ Assigned permissions to AUDITOR`);

  // Read-only executive permissions
  const execPermCodes = [
    'attendance.dashboard.view',
    'attendance.dashboard.branch.view',
    'attendance.dashboard.consolidated.view',
    'attendance.report.daily.view',
    'attendance.report.batch.view',
    'attendance.report.student.view',
    'attendance.report.trainer.view',
    'attendance.report.lowAttendance.view',
    'attendance.report.correctionAging.view',
    'attendance.report.export',
    'attendance.consolidated.read',
    'dashboard.ceo',
    'dashboard.view',
    'report.iam.session',
    'report.iam.audit-trail',
    'exam.view',
    'result.view',
    'completion.view',
    'exam-completion.report.view',
    'exam-completion.menu.view',
  ];
  const execPerms = permRecords.filter((p) =>
    execPermCodes.includes(p.permissionCode),
  );
  for (const perm of execPerms) {
    await prisma.rolePermission.create({
      data: {
        roleId: roleMap['READ_ONLY_EXECUTIVE'].id,
        permissionId: perm.id,
      },
    });
  }
  console.log(`  ✓ Assigned permissions to READ_ONLY_EXECUTIVE`);

  // 5. Seed Institute & Branches
  const institute = await prisma.institute.create({
    data: {
      id: crypto.randomUUID(),
      instituteCode: 'AST-HQ',
      instituteName: 'Al-Saud Training Institute',
      registrationNumber: 'REG-2024-001',
      primaryEmail: 'info@al-saud.edu.sa',
      primaryPhone: '+966-11-4567890',
      website: 'https://al-saud.edu.sa',
      address: 'King Fahd Road, Olaya',
      country: 'Saudi Arabia',
      status: 'Active',
    },
  });
  console.log(`  ✓ Institute created: Al-Saud Training Institute`);

  const riyadhBranch = await prisma.branch.create({
    data: {
      id: crypto.randomUUID(),
      instituteId: institute.id,
      branchCode: 'AST-RIYADH',
      branchName: 'Riyadh Main Campus',
      address: 'King Fahd Road, Olaya, Riyadh',
      city: 'Riyadh',
      country: 'Saudi Arabia',
      phone: '+966-11-4567890',
      email: 'riyadh@al-saud.edu.sa',
      status: 'Active',
      effectiveStartDate: new Date(),
    },
  });
  console.log(`  ✓ Branch created: Riyadh Main Campus (AST-RIYADH)`);

  const muscatBranch = await prisma.branch.create({
    data: {
      id: crypto.randomUUID(),
      instituteId: institute.id,
      branchCode: 'AST-MUSCAT',
      branchName: 'Muscat Campus',
      address: 'Al Khuwair, Muscat',
      city: 'Muscat',
      country: 'Oman',
      phone: '+968-24-123456',
      email: 'muscat@al-saud.edu.om',
      status: 'Active',
      effectiveStartDate: new Date(),
    },
  });
  console.log(`  ✓ Branch created: Muscat Campus (AST-MUSCAT)`);

  // Seed Riyadh Departments & Classrooms
  const riyadhItDept = await prisma.department.create({
    data: {
      id: crypto.randomUUID(),
      branchId: riyadhBranch.id,
      departmentCode: 'AST-RIYADH-IT',
      departmentName: 'Information Technology',
      description: 'IT and software development training department.',
      status: 'Active',
      effectiveStartDate: new Date(),
    },
  });
  console.log(`  ✓ Department created: Information Technology (AST-RIYADH-IT)`);

  const riyadhBizDept = await prisma.department.create({
    data: {
      id: crypto.randomUUID(),
      branchId: riyadhBranch.id,
      departmentCode: 'AST-RIYADH-BIZ',
      departmentName: 'Business Administration',
      description: 'Management and business training department.',
      status: 'Active',
      effectiveStartDate: new Date(),
    },
  });
  console.log(
    `  ✓ Department created: Business Administration (AST-RIYADH-BIZ)`,
  );

  const riyadhLabA = await prisma.classroom.create({
    data: {
      id: crypto.randomUUID(),
      branchId: riyadhBranch.id,
      classroomName: 'Lab A',
      capacity: 25,
      location: '1st Floor, Building A',
      status: 'Active',
      effectiveStartDate: new Date(),
    },
  });
  console.log(`  ✓ Classroom created: Lab A (Riyadh)`);

  const riyadhLecture1 = await prisma.classroom.create({
    data: {
      id: crypto.randomUUID(),
      branchId: riyadhBranch.id,
      classroomName: 'Lecture Hall 1',
      capacity: 45,
      location: '2nd Floor, Building A',
      status: 'Active',
      effectiveStartDate: new Date(),
    },
  });
  console.log(`  ✓ Classroom created: Lecture Hall 1 (Riyadh)`);

  // Seed Muscat Departments & Classrooms
  const muscatEngDept = await prisma.department.create({
    data: {
      id: crypto.randomUUID(),
      branchId: muscatBranch.id,
      departmentCode: 'AST-MUSCAT-ENG',
      departmentName: 'English Training',
      description: 'Language training and IELTS preparation.',
      status: 'Active',
      effectiveStartDate: new Date(),
    },
  });
  console.log(`  ✓ Department created: English Training (AST-MUSCAT-ENG)`);

  const muscatRoom101 = await prisma.classroom.create({
    data: {
      id: crypto.randomUUID(),
      branchId: muscatBranch.id,
      classroomName: 'Room 101',
      capacity: 20,
      location: 'Ground Floor, Muscat Campus',
      status: 'Active',
      effectiveStartDate: new Date(),
    },
  });
  console.log(`  ✓ Classroom created: Room 101 (Muscat)`);

  // 6. Seed Users, Roles, and Branch Access
  const passwordHash = await argon2.hash('Password@123');

  await prisma.securityPolicy.create({
    data: {
      id: crypto.randomUUID(),
      maxFailedAttempts: 5,
      lockoutDurationMinutes: 30,
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireLowercase: true,
      passwordRequireNumbers: true,
      passwordRequireSpecial: true,
      passwordHistoryCount: 5,
      passwordExpiryDays: 90,
      resetTokenExpiryMinutes: 15,
      accessTokenExpiryMinutes: 30,
      refreshTokenExpiryDays: 7,
      rememberMeRefreshTokenDays: 30,
      sessionInactivityMinutes: 30,
      maxConcurrentSessions: 3,
    },
  });
  console.log('  ✓ Security Policy created');

  // User A: Super Admin (Global Scope)
  const superAdminPerson = await prisma.person.create({
    data: {
      id: crypto.randomUUID(),
      firstName: 'System',
      lastName: 'Administrator',
      mobile: '+966-500000001',
    },
  });
  const superAdminUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      personId: superAdminPerson.id,
      username: 'admin@ims.com',
      email: 'admin@ims.com',
      userType: 'Admin',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({
    data: { userId: superAdminUser.id, roleId: roleMap['SUPER_ADMIN'].id },
  });
  console.log(`  ✓ User created: admin@ims.com (SUPER_ADMIN)`);

  await prisma.user.update({
    where: { id: superAdminUser.id },
    data: { defaultBranchId: riyadhBranch.id },
  });
  await prisma.userBranchAccess.create({
    data: {
      id: crypto.randomUUID(),
      userId: superAdminUser.id,
      branchId: riyadhBranch.id,
      isDefault: true,
      status: 'Active',
    },
  });
  await prisma.userBranchAccess.create({
    data: {
      id: crypto.randomUUID(),
      userId: superAdminUser.id,
      branchId: muscatBranch.id,
      isDefault: false,
      status: 'Active',
    },
  });
  console.log(`  ✓ Branch access created for admin@ims.com (SUPER_ADMIN)`);

  const smokePerson = await prisma.person.create({
    data: {
      id: crypto.randomUUID(),
      firstName: 'Smoke',
      lastName: 'Admin',
      mobile: '+966-500000007',
    },
  });
  const smokeUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      personId: smokePerson.id,
      username: 'smoke.iam@ims.com',
      email: 'smoke.iam@ims.com',
      userType: 'Admin',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({
    data: { userId: smokeUser.id, roleId: roleMap['SUPER_ADMIN'].id },
  });
  console.log(
    `  ✓ User created: smoke.iam@ims.com (SUPER_ADMIN smoke account)`,
  );

  await prisma.user.update({
    where: { id: smokeUser.id },
    data: { defaultBranchId: riyadhBranch.id },
  });
  await prisma.userBranchAccess.create({
    data: {
      id: crypto.randomUUID(),
      userId: smokeUser.id,
      branchId: riyadhBranch.id,
      isDefault: true,
      status: 'Active',
    },
  });
  await prisma.userBranchAccess.create({
    data: {
      id: crypto.randomUUID(),
      userId: smokeUser.id,
      branchId: muscatBranch.id,
      isDefault: false,
      status: 'Active',
    },
  });
  console.log(
    `  ✓ Smoke user branch access created for AST-RIYADH and AST-MUSCAT`,
  );

  // User B: Riyadh Branch Manager
  const riyadhManagerPerson = await prisma.person.create({
    data: {
      id: crypto.randomUUID(),
      firstName: 'Riyadh',
      lastName: 'Branch Manager',
      mobile: '+966-500000002',
    },
  });
  const riyadhManagerUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      personId: riyadhManagerPerson.id,
      username: 'manager.riyadh@ims.com',
      email: 'manager.riyadh@ims.com',
      userType: 'BranchManager',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({
    data: {
      userId: riyadhManagerUser.id,
      roleId: roleMap['BRANCH_MANAGER'].id,
    },
  });
  await prisma.userBranchAccess.create({
    data: {
      id: crypto.randomUUID(),
      userId: riyadhManagerUser.id,
      branchId: riyadhBranch.id,
      isDefault: true,
      status: 'Active',
    },
  });
  console.log(
    `  ✓ User created: manager.riyadh@ims.com (BRANCH_MANAGER, Branch AST-RIYADH)`,
  );

  // User C: Riyadh Counselor
  const riyadhCounselorPerson = await prisma.person.create({
    data: {
      id: crypto.randomUUID(),
      firstName: 'Riyadh',
      lastName: 'Counselor',
      mobile: '+966-500000003',
    },
  });
  const riyadhCounselorUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      personId: riyadhCounselorPerson.id,
      username: 'counselor.riyadh@ims.com',
      email: 'counselor.riyadh@ims.com',
      userType: 'Counselor',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({
    data: { userId: riyadhCounselorUser.id, roleId: roleMap['COUNSELOR'].id },
  });
  await prisma.userBranchAccess.create({
    data: {
      id: crypto.randomUUID(),
      userId: riyadhCounselorUser.id,
      branchId: riyadhBranch.id,
      isDefault: true,
      status: 'Active',
    },
  });
  console.log(
    `  ✓ User created: counselor.riyadh@ims.com (COUNSELOR, Branch AST-RIYADH)`,
  );

  // User D: Riyadh Trainer
  const riyadhTrainerPerson = await prisma.person.create({
    data: {
      id: crypto.randomUUID(),
      firstName: 'Riyadh',
      lastName: 'Core Trainer',
      mobile: '+966-500000004',
    },
  });
  const riyadhTrainerUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      personId: riyadhTrainerPerson.id,
      username: 'trainer.riyadh@ims.com',
      email: 'trainer.riyadh@ims.com',
      userType: 'Trainer',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({
    data: { userId: riyadhTrainerUser.id, roleId: roleMap['TRAINER'].id },
  });
  await prisma.userBranchAccess.create({
    data: {
      id: crypto.randomUUID(),
      userId: riyadhTrainerUser.id,
      branchId: riyadhBranch.id,
      isDefault: true,
      status: 'Active',
    },
  });
  console.log(
    `  ✓ User created: trainer.riyadh@ims.com (TRAINER, Branch AST-RIYADH)`,
  );

  // User D2: Muscat Trainer
  const muscatTrainerPerson = await prisma.person.create({
    data: {
      id: crypto.randomUUID(),
      firstName: 'Muscat',
      lastName: 'Session Trainer',
      mobile: '+968-500000004',
    },
  });
  const muscatTrainerUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      personId: muscatTrainerPerson.id,
      username: 'trainer.muscat@ims.com',
      email: 'trainer.muscat@ims.com',
      userType: 'Trainer',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({
    data: { userId: muscatTrainerUser.id, roleId: roleMap['TRAINER'].id },
  });
  await prisma.userBranchAccess.create({
    data: {
      id: crypto.randomUUID(),
      userId: muscatTrainerUser.id,
      branchId: muscatBranch.id,
      isDefault: true,
      status: 'Active',
    },
  });
  console.log(
    `  ✓ User created: trainer.muscat@ims.com (TRAINER, Branch AST-MUSCAT)`,
  );

  // User E: Riyadh Accountant
  const riyadhAccountantPerson = await prisma.person.create({
    data: {
      id: crypto.randomUUID(),
      firstName: 'Riyadh',
      lastName: 'Accountant User',
      mobile: '+966-500000005',
    },
  });
  const riyadhAccountantUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      personId: riyadhAccountantPerson.id,
      username: 'accountant.riyadh@ims.com',
      email: 'accountant.riyadh@ims.com',
      userType: 'Accountant',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({
    data: { userId: riyadhAccountantUser.id, roleId: roleMap['ACCOUNTANT'].id },
  });
  await prisma.userBranchAccess.create({
    data: {
      id: crypto.randomUUID(),
      userId: riyadhAccountantUser.id,
      branchId: riyadhBranch.id,
      isDefault: true,
      status: 'Active',
    },
  });
  console.log(
    `  ✓ User created: accountant.riyadh@ims.com (ACCOUNTANT, Branch AST-RIYADH)`,
  );

  // User F: Muscat Branch Manager
  const muscatManagerPerson = await prisma.person.create({
    data: {
      id: crypto.randomUUID(),
      firstName: 'Muscat',
      lastName: 'Branch Manager',
      mobile: '+966-500000006',
    },
  });
  const muscatManagerUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      personId: muscatManagerPerson.id,
      username: 'manager.muscat@ims.com',
      email: 'manager.muscat@ims.com',
      userType: 'BranchManager',
      status: 'Active',
      passwordHash,
      effectiveStartDate: new Date(),
    },
  });
  await prisma.userRole.create({
    data: {
      userId: muscatManagerUser.id,
      roleId: roleMap['BRANCH_MANAGER'].id,
    },
  });
  await prisma.userBranchAccess.create({
    data: {
      id: crypto.randomUUID(),
      userId: muscatManagerUser.id,
      branchId: muscatBranch.id,
      isDefault: true,
      status: 'Active',
    },
  });
  console.log(
    `  ✓ User created: manager.muscat@ims.com (BRANCH_MANAGER, Branch AST-MUSCAT)`,
  );

  // 6. Create default active Courses
  const defaultCategoryCode = 'CAT-TECH';
  let techCategory = await prisma.courseCategory.findUnique({
    where: { code: defaultCategoryCode },
  });
  if (!techCategory) {
    techCategory = await prisma.courseCategory.create({
      data: {
        id: crypto.randomUUID(),
        code: defaultCategoryCode,
        nameEnglish: 'Technology & Engineering',
        nameArabic: 'التكنولوجيا والهندسة',
        description:
          'Tech courses, software engineering, cyber security, data science',
        status: 'Active',
      },
    });
    console.log(`  ✓ Course Category seeded: ${techCategory.nameEnglish}`);
  }

  const defaultCourses = [
    {
      code: 'CS-FSWD',
      nameEnglish: 'Full Stack Web Development',
      nameArabic: 'تطوير تطبيقات الويب بالكامل',
    },
    {
      code: 'CS-MDEV',
      nameEnglish: 'Mobile App Development (iOS/Android)',
      nameArabic: 'تطوير تطبيقات الهاتف المحمول',
    },
    {
      code: 'CS-CSEC',
      nameEnglish: 'Advanced Cyber Security & Ethical Hacking',
      nameArabic: 'الأمن السيبراني المتقدم والاختراق الأخلاقي',
    },
    {
      code: 'CS-DSAI',
      nameEnglish: 'Data Science and Artificial Intelligence',
      nameArabic: 'علم البيانات والذكاء الاصطناعي',
    },
    {
      code: 'CS-CLAW',
      nameEnglish: 'Cloud Solutions Architecture (AWS/Azure)',
      nameArabic: 'هندسة حلول السحابة',
    },
    {
      code: 'CS-UIUX',
      nameEnglish: 'UI/UX Design & Product Strategy',
      nameArabic: 'تصميم واجهة وتجربة المستخدم',
    },
  ];

  for (const c of defaultCourses) {
    const existing = await prisma.course.findUnique({
      where: { courseCode: c.code },
    });
    if (!existing) {
      const newCourse = await prisma.course.create({
        data: {
          id: crypto.randomUUID(),
          courseCode: c.code,
          nameEnglish: c.nameEnglish,
          nameArabic: c.nameArabic,
          descriptionEnglish: `${c.nameEnglish} course template.`,
          descriptionArabic: `دورة ${c.nameEnglish}.`,
          departmentId: riyadhItDept.id,
          categoryId: techCategory.id,
          courseClassification: 'Regular',
          durationType: 'Weeks',
          durationValue: 12,
          allowWalkInCompletion: false,
          status: 'Published',
          effectiveStartDate: new Date(),
        },
      });

      // Seed default pricing and completion rules to satisfy constraints
      await prisma.coursePricing.create({
        data: {
          id: crypto.randomUUID(),
          courseId: newCourse.id,
          customerType: 'Individual',
          batchType: 'Regular',
          basePrice: 500.0,
          effectiveStartDate: new Date(),
          status: 'Active',
        },
      });
      await prisma.courseCompletionRule.create({
        data: {
          id: crypto.randomUUID(),
          courseId: newCourse.id,
          minimumAttendancePercent: 80,
          effectiveStartDate: new Date(),
          status: 'Active',
        },
      });

      console.log(`  ✓ Course seeded: ${c.nameEnglish}`);
    }
  }

  // Seed Mock Student Profiles
  console.log('\n🌱 Seeding mock students & CRM leads...');
  const firstCourse = await prisma.course.findFirst({
    where: { isDeleted: false },
  });
  const firstCourseId = firstCourse ? firstCourse.id : crypto.randomUUID();

  const mockStudents = [
    {
      firstName: 'Ahmed',
      lastName: 'Al-Balushi',
      email: 'ahmed.balushi@asti.edu',
      mobile: '+96899123456',
      number: 'STU-2026-0001',
    },
    {
      firstName: 'Fatima',
      lastName: 'Al-Hashmi',
      email: 'fatima.hashmi@asti.edu',
      mobile: '+96899123457',
      number: 'STU-2026-0002',
    },
    {
      firstName: 'Said',
      lastName: 'Al-Siyabi',
      email: 'said.siyabi@asti.edu',
      mobile: '+96899123458',
      number: 'STU-2026-0003',
    },
    {
      firstName: 'Muna',
      lastName: 'Al-Riyami',
      email: 'muna.riyami@asti.edu',
      mobile: '+96899123459',
      number: 'STU-2026-0004',
    },
  ];

  for (const ms of mockStudents) {
    const person = await prisma.person.create({
      data: {
        id: crypto.randomUUID(),
        firstName: ms.firstName,
        lastName: ms.lastName,
        email: ms.email,
        mobile: ms.mobile,
      },
    });

    await prisma.studentProfile.create({
      data: {
        id: crypto.randomUUID(),
        person: {
          connect: { id: person.id },
        },
        branch: {
          connect: { id: riyadhBranch.id },
        },
        studentNumber: ms.number,
        status: 'Active',
      },
    });
    console.log(`  ✓ Mock Student created: ${ms.firstName} ${ms.lastName}`);
  }

  // Seed Mock Leads
  const mockLeads = [
    {
      firstName: 'Khalid',
      lastName: 'Al-Busaidi',
      email: 'khalid.busaidi@gmail.com',
      mobile: '+96899789012',
      number: 'LD-2026-0001',
    },
    {
      firstName: 'Asma',
      lastName: 'Al-Kharusi',
      email: 'asma.kharusi@gmail.com',
      mobile: '+96899789013',
      number: 'LD-2026-0002',
    },
    {
      firstName: 'Salim',
      lastName: 'Al-Mamari',
      email: 'salim.mamari@gmail.com',
      mobile: '+96899789014',
      number: 'LD-2026-0003',
    },
  ];

  for (const ml of mockLeads) {
    const person = await prisma.person.create({
      data: {
        id: crypto.randomUUID(),
        firstName: ml.firstName,
        lastName: ml.lastName,
        email: ml.email,
        mobile: ml.mobile,
      },
    });

    await prisma.lead.create({
      data: {
        id: crypto.randomUUID(),
        leadNumber: ml.number,
        personId: person.id,
        branchId: riyadhBranch.id,
        firstName: ml.firstName,
        lastName: ml.lastName,
        email: ml.email,
        phone: ml.mobile,
        interestedCourseId: firstCourseId,
        stage: 'New',
        source: 'Web',
      },
    });
    console.log(`  ✓ Mock CRM Lead created: ${ml.firstName} ${ml.lastName}`);
  }

  // Seed Document Requirements (Document Master)
  console.log('\n🌱 Seeding document requirements...');
  await prisma.documentRequirement.deleteMany({});

  const riyadh = await prisma.branch.findFirst({
    where: { branchCode: 'AST-RIYADH' },
  });
  const muscat = await prisma.branch.findFirst({
    where: { branchCode: 'AST-MUSCAT' },
  });
  const uiux = await prisma.course.findFirst({
    where: { courseCode: 'CS-UIUX' },
  });

  const dynamicRequirements = [
    // Student requirements
    {
      targetEntity: 'STUDENT' as const,
      documentType: 'CIVIL_ID_FRONT' as const,
      isMandatory: true,
      branchId: null,
      courseId: null,
    },
    {
      targetEntity: 'STUDENT' as const,
      documentType: 'PASSPORT_SCAN' as const,
      isMandatory: false,
      branchId: null,
      courseId: null,
    },
    {
      targetEntity: 'STUDENT' as const,
      documentType: 'ACADEMIC_TRANSCRIPT' as const,
      isMandatory: true,
      branchId: riyadh?.id || null,
      courseId: null,
    },
    {
      targetEntity: 'STUDENT' as const,
      documentType: 'SPONSORSHIP_LETTER' as const,
      isMandatory: false,
      branchId: null,
      courseId: uiux?.id || null,
    },

    // Trainer requirements
    {
      targetEntity: 'TRAINER' as const,
      documentType: 'CIVIL_ID_FRONT' as const,
      isMandatory: true,
      branchId: null,
      courseId: null,
    },
    {
      targetEntity: 'TRAINER' as const,
      documentType: 'CIVIL_ID_BACK' as const,
      isMandatory: true,
      branchId: null,
      courseId: null,
    },
    {
      targetEntity: 'TRAINER' as const,
      documentType: 'OTHER' as const,
      isMandatory: true,
      branchId: muscat?.id || null,
      courseId: null,
    },
    {
      targetEntity: 'TRAINER' as const,
      documentType: 'PASSPORT_SCAN' as const,
      isMandatory: false,
      branchId: null,
      courseId: null,
    },
  ];

  for (const req of dynamicRequirements) {
    await prisma.documentRequirement.create({
      data: {
        id: crypto.randomUUID(),
        targetEntity: req.targetEntity,
        documentType: req.documentType,
        isMandatory: req.isMandatory,
        branchId: req.branchId,
        courseId: req.courseId,
        status: 'Active',
        effectiveStartDate: new Date(),
      },
    });
  }
  console.log('  ✓ Document requirements seeded.');

  console.log('\n🌱 Seed script complete! Database seeded successfully.');
}

seed()
  .catch((err) => {
    console.error('❌ Seed failed:', err.message, err.stack || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
