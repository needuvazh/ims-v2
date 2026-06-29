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
  'dashboard.view',
  'certificate.verify',
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
  { href: '/dashboard', label: 'Dashboard', permission: 'dashboard.view', category: 'Overview' },
  { href: '/leads', label: 'Leads', permission: 'dashboard.view', category: 'CRM' },
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
    ],
  },
  {
    href: '/iam',
    label: 'Identity & Access',
    permission: 'iam.user.read',
    category: 'Management',
    items: [
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
