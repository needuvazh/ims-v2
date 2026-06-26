import { z } from 'zod';

export const permissionCodeSchema = z.string().min(3);

export type PermissionCode = z.infer<typeof permissionCodeSchema>;

export const knownPermissions = [
  'identity.read',
  'identity.write',
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
    href: '/identity',
    label: 'Identity & Access',
    permission: 'identity.read',
    category: 'Management',
    items: [
      { href: '/identity/users', label: 'Users' },
      { href: '/identity/roles', label: 'Roles' },
      { href: '/identity/permissions', label: 'Permissions' },
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
