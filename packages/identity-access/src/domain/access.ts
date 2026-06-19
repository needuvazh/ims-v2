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
};

export const adminNavigation: NavigationItem[] = [
  { href: '/dashboard', label: 'Dashboard', permission: 'dashboard.view' },
  { href: '/organization', label: 'Organization', permission: 'organization.manage' },
  { href: '/identity', label: 'Identity & Access', permission: 'identity.read' },
];

export const studentNavigation: NavigationItem[] = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/fees', label: 'Fees' },
  { href: '/certificates', label: 'Certificates' },
];

export const trainerNavigation: NavigationItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/attendance', label: 'Attendance' },
];
