import { z } from 'zod';

export const permissionCodeSchema = z.string().min(3);

export type PermissionCode = z.infer<typeof permissionCodeSchema>;

export const knownPermissions = [
  'iam.user.read',
  'iam.user.create',
  'iam.user.update',
  'iam.user.activate',
  'iam.role.read',
  'iam.role.create',
  'iam.role.update',
  'organization.manage',
  'scheduling.calendar.read',
  'scheduling.calendar.create',
  'scheduling.calendar.update',
  'scheduling.venueBlock.read',
  'scheduling.venueBlock.create',
  'scheduling.venueBlock.update',
  'scheduling.conflict.read',
  'scheduling.holiday.create',
  'schedule.manage',
  'dashboard.view',
  'certificate.verify',
  'batch.delivery.view',
  'menu.faculty',
  'menu.faculty.trainers',
  'menu.faculty.eligible-trainers',
  'menu.faculty.reports',
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
  'dashboard.finance',
  'finance.menu.view',
  'finance.invoice.read',
  'finance.invoice.create',
  'finance.payment.read',
  'finance.payment.create',
  'finance.refund.read',
  'finance.refund.request',
  'finance.refund.approve',
  'exam.view',
  'exam.create',
  'exam.update',
  'exam.delete',
  'result.view',
  'result.create',
  'result.finalize',
  'result.correct',
  'result.export',
  'completion.view',
  'completion.evaluate',
  'completion.reevaluate',
  'completion.recommend',
  'completion.coordinator-review',
  'completion.final-approve',
  'exam-completion.report.view',
  'exam-completion.report.export',
  'exam-completion.menu.view',
  'certificate.view',
  'certificate.create',
  'certificate.issue',
  'certificate.reissue',
  'certificate.revoke',
  'document.requirement.manage',
  'course.catalog.menu.view',
  'course.catalog.dashboard.view',
  'batch.delivery.menu.view',
  'batch.delivery.dashboard.view',
] as const;

export type KnownPermission = (typeof knownPermissions)[number];

export type NavigationItem = {
  href: string;
  label: string;
  permission?: PermissionCode;
  items?: NavigationItem[];
  category?: string;
};

export const adminNavigation: NavigationItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    permission: 'dashboard.view',
    category: 'Overview',
  },
  {
    href: '/dashboards/crm',
    label: 'CRM Dashboard',
    permission: 'REPORTING_VIEW_CRM_DASHBOARD',
    category: 'CRM',
  },
  {
    href: '/leads',
    label: 'Leads',
    permission: 'dashboard.view',
    category: 'CRM',
  },
  {
    href: '/admissions',
    label: 'Academic Operations',
    permission: 'admission.read',
    category: 'Operations',
    items: [
      {
        href: '/dashboards/admissions',
        label: 'Admissions Dashboard',
        permission: 'dashboard.view',
      },
      {
        href: '/admissions',
        label: 'Admissions',
        permission: 'admission.read',
      },
      {
        href: '/enrollments',
        label: 'Enrollments',
        permission: 'enrollment.read',
      },
      {
        href: '/students',
        label: 'Student Management',
        permission: 'student.read',
      },
    ],
  },
  {
    href: '/courses-catalog',
    label: 'Course Catalog',
    permission: 'course.catalog.menu.view',
    category: 'Operations',
    items: [
      {
        href: '/dashboards/courses',
        label: 'Courses Dashboard',
        permission: 'course.catalog.dashboard.view',
      },
      {
        href: '/courses-catalog',
        label: 'Courses List',
        permission: 'course.catalog.view',
      },
    ],
  },
  {
    href: '/batches',
    label: 'Training Delivery',
    permission: 'batch.delivery.menu.view',
    category: 'Operations',
    items: [
      {
        href: '/dashboards/batches',
        label: 'Batches Dashboard',
        permission: 'batch.delivery.dashboard.view',
      },
      {
        href: '/batches',
        label: 'Batches List',
        permission: 'batch.delivery.view',
      },
    ],
  },
  {
    href: '/scheduling',
    label: 'Scheduling',
    permission: 'scheduling.calendar.read',
    category: 'Operations',
    items: [
      {
        href: '/scheduling',
        label: 'Scheduling Dashboard',
        permission: 'scheduling.calendar.read',
      },
      {
        href: '/scheduling/calendars',
        label: 'Calendar',
        permission: 'scheduling.calendar.read',
      },
      {
        href: '/scheduling/venues',
        label: 'Venue Management',
        permission: 'scheduling.venueBlock.read',
      },
      {
        href: '/scheduling/conflicts',
        label: 'Conflict Dashboard',
        permission: 'scheduling.conflict.read',
      },
    ],
  },
  {
    href: '/attendance',
    label: 'Attendance',
    permission: 'attendance.menu.view',
    category: 'Operations',
    items: [
      {
        href: '/attendance/dashboard',
        label: 'Attendance Dashboard',
        permission: 'attendance.dashboard.view',
      },
      {
        href: '/attendance/sessions',
        label: 'Sessions',
        permission: 'attendance.sessions.menu.view',
      },
      {
        href: '/attendance/records',
        label: 'Records',
        permission: 'attendance.records.menu.view',
      },
      {
        href: '/attendance/corrections',
        label: 'Corrections',
        permission: 'attendance.corrections.menu.view',
      },
      {
        href: '/attendance/reports',
        label: 'Reports',
        permission: 'attendance.reports.menu.view',
      },
    ],
  },
  {
    href: '/organization',
    label: 'Organization',
    permission: 'organization.manage',
    category: 'Management',
    items: [
      { href: '/organization/institutes', label: 'Institutes' },
      { href: '/organization/branches', label: 'Branches' },
      { href: '/organization/departments', label: 'Departments' },
      { href: '/organization/classrooms', label: 'Classrooms' },
      { href: '/organization/hierarchy', label: 'Hierarchy View' },
      {
        href: '/organization/documents',
        label: 'Document Master',
        permission: 'document.requirement.manage',
      },
    ],
  },
  {
    href: '/faculty',
    label: 'Faculty & Trainers',
    permission: 'menu.faculty',
    category: 'Management',
    items: [
      {
        href: '/faculty/dashboard',
        label: 'Faculty Dashboard',
        permission: 'menu.faculty',
      },
      {
        href: '/faculty/trainers',
        label: 'Trainer Registry',
        permission: 'menu.faculty.trainers',
      },
      {
        href: '/faculty/eligible-trainers',
        label: 'Eligible Trainers',
        permission: 'menu.faculty.eligible-trainers',
      },
      {
        href: '/faculty/leaves',
        label: 'Leaves & Time-Off',
        permission: 'menu.faculty.leaves',
      },
      {
        href: '/faculty/reports',
        label: 'Faculty Reports',
        permission: 'menu.faculty.reports',
      },
    ],
  },
  {
    href: '/finance',
    label: 'Finance & Billings',
    permission: 'dashboard.finance',
    category: 'Operations',
    items: [
      {
        href: '/finance',
        label: 'Finance Dashboard',
        permission: 'dashboard.finance',
      },
      {
        href: '/finance/invoices',
        label: 'Invoices',
        permission: 'dashboard.finance',
      },
      {
        href: '/finance/payments',
        label: 'Payments',
        permission: 'dashboard.finance',
      },
      {
        href: '/finance/refunds',
        label: 'Refunds',
        permission: 'dashboard.finance',
      },
    ],
  },
  {
    href: '/exam-completion',
    label: 'Exams & Completion',
    permission: 'exam-completion.menu.view',
    category: 'Operations',
    items: [
      {
        href: '/exam-completion/dashboard',
        label: 'Dashboard',
        permission: 'exam.view',
      },
      {
        href: '/exam-completion/exams',
        label: 'Exams',
        permission: 'exam.view',
      },
      {
        href: '/exam-completion/results',
        label: 'Results',
        permission: 'result.view',
      },
      {
        href: '/exam-completion/completions',
        label: 'Completions',
        permission: 'completion.view',
      },
      {
        href: '/exam-completion/approval-queue',
        label: 'Approval Queue',
        permission: 'completion.recommend',
      },
    ],
  },
  {
    href: '/certificates',
    label: 'Certificates',
    permission: 'certificate.view',
    category: 'Operations',
  },
  {
    href: '/iam',
    label: 'Identity & Access',
    permission: 'iam.user.read',
    category: 'Management',
    items: [
      { href: '/iam/dashboards', label: 'Dashboards' },
      { href: '/iam/users', label: 'Users' },
      { href: '/iam/roles', label: 'Roles' },
      { href: '/iam/permissions', label: 'Permissions' },
      { href: '/iam/sessions', label: 'Active Sessions' },
      { href: '/iam/login-history', label: 'Login History' },
      { href: '/iam/security-policy', label: 'Security Policy' },
      { href: '/iam/audit', label: 'Audit Trail' },
      { href: '/iam/reports', label: 'IAM Reports' },
    ],
  },
];

export const studentNavigation: NavigationItem[] = [
  { href: '/dashboard', label: 'Overview', category: 'Overview' },
  { href: '/fees', label: 'Fees', category: 'Academic' },
  { href: '/certificates', label: 'Certificates', category: 'Academic' },
];

export const trainerNavigation: NavigationItem[] = [
  { href: '/dashboard', label: 'Dashboard', category: 'Overview' },
  { href: '/schedule', label: 'Schedule', category: 'Academic' },
  { href: '/attendance', label: 'Attendance', category: 'Academic' },
];
