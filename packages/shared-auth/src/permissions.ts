import type { Session } from './session';

export const permissions = {
  iam: {
    user: {
      read: 'iam.user.read',
      create: 'iam.user.create',
      update: 'iam.user.update',
      archive: 'iam.user.archive',
      activate: 'iam.user.activate',
      suspend: 'iam.user.suspend',
      unlock: 'iam.user.unlock',
      resetPassword: 'iam.user.reset-password',
      assignRole: 'iam.user.assign-role',
      assignBranch: 'iam.user.assign-branch',
      readSessions: 'iam.session.read',
      terminateSessions: 'iam.session.terminate',
      readLoginHistory: 'iam.user.view-login-history',
    },
    role: {
      read: 'iam.role.read',
      create: 'iam.role.create',
      update: 'iam.role.update',
      archive: 'iam.role.archive',
      assignPermission: 'iam.role.permission.assign',
    },
    permission: {
      read: 'iam.permission.read',
      create: 'iam.permission.create',
      update: 'iam.permission.update',
      archive: 'iam.permission.archive',
    },
    securityPolicy: {
      read: 'iam.security-policy.read',
      update: 'iam.security-policy.update',
    },
    audit: {
      read: 'iam.audit.read',
    },
  },
  crm: {
    leads: {
      viewAllInBranch: 'LEAD_VIEW_ALL_IN_BRANCH',
    },
  },
  report: {
    iam: {
      user: 'report.iam.user',
      userAccess: 'report.iam.user-access',
      loginHistory: 'report.iam.login-history',
      security: 'report.iam.security',
      role: 'report.iam.role',
      permission: 'report.iam.permission',
      branch: 'report.iam.branch',
      privileged: 'report.iam.privileged',
      session: 'report.iam.session',
      auditTrail: 'report.iam.audit-trail',
    },
    crm: {
      viewDashboard: 'REPORTING_VIEW_CRM_DASHBOARD',
      viewCounselorMetrics: 'REPORTING_VIEW_COUNSELOR_METRICS',
    },
  },
  dashboard: {
    view: 'dashboard.view',
    security: 'dashboard.security',
    admin: 'dashboard.admin',
    ceo: 'dashboard.ceo',
    compliance: 'dashboard.compliance',
    branch: 'dashboard.branch',
    finance: 'dashboard.finance',
    training: 'dashboard.training',
    crm: 'dashboard.crm',
  },
} as const;

export function hasPermission(session: Session | null, permission: string): boolean {
  if (!session) {
    return false;
  }

  return session.permissions.includes(permission);
}

export function hasAnyPermission(session: Session | null, permissions: readonly string[]): boolean {
  return permissions.some((permission) => hasPermission(session, permission));
}

export function hasRole(session: Session | null, role: string): boolean {
  return Boolean(session?.roles.includes(role));
}
