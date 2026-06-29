/**
 * Server-side runtime — wires Prisma repositories into application services.
 * Import this only in server actions and route handlers (never in client components).
 */
import {
  prisma,
  PrismaUserRepository,
  PrismaRoleRepository,
  PrismaPermissionRepository,
  PrismaUserBranchAccessRepository,
  PrismaSessionRepository,
  PrismaPasswordHistoryRepository,
  PrismaSecurityPolicyRepository,
  PrismaAuditLogRepository,
  PrismaNotificationRepository,
  PrismaOutboxEventRepository,
  PrismaLoginHistoryRepository,
  PrismaUserActivationTokenRepository,
} from '@ims/database';
import { OrganizationService } from '@ims/organization';
import {
  AuthService,
  UserService,
  RoleService,
  PermissionService,
  BranchAccessService,
  SessionService,
  SecurityPolicyService,
  AuditQueryService,
  EffectivePermissionsService,
  BranchScopeResolver,
  AuthorizationGuard,
  DummyNotificationProvider,
} from '@ims/identity-access';

// ─── Repositories ──────────────────────────────────────────────────────────
const auditRepository = new PrismaAuditLogRepository(prisma);
const userRepository = new PrismaUserRepository(prisma);
const roleRepository = new PrismaRoleRepository(prisma);
const permissionRepository = new PrismaPermissionRepository(prisma);
const userBranchAccessRepository = new PrismaUserBranchAccessRepository(prisma);
export const sessionRepository = new PrismaSessionRepository(prisma);
const passwordHistoryRepository = new PrismaPasswordHistoryRepository(prisma);
const securityPolicyRepository = new PrismaSecurityPolicyRepository(prisma);
const notificationRepository = new PrismaNotificationRepository(prisma);
const outboxEventRepository = new PrismaOutboxEventRepository(prisma);
const loginHistoryRepository = new PrismaLoginHistoryRepository(prisma);
const userActivationTokenRepository = new PrismaUserActivationTokenRepository(prisma);

// ─── Notification Port ────────────────────────────────────────────────────
const notificationPort = new DummyNotificationProvider();

// ─── Application Services ─────────────────────────────────────────────────
export const userService = new UserService(
  userRepository,
  roleRepository,
  userBranchAccessRepository,
  userActivationTokenRepository,
  securityPolicyRepository,
  auditRepository,
  notificationRepository,
  outboxEventRepository,
  sessionRepository
);

export const authService = new AuthService(
  userRepository,
  sessionRepository,
  passwordHistoryRepository,
  securityPolicyRepository,
  auditRepository,
  loginHistoryRepository,
  notificationPort,
  roleRepository,
  userBranchAccessRepository
);

export const roleService = new RoleService(
  roleRepository,
  permissionRepository,
  auditRepository
);

export const permissionService = new PermissionService(
  permissionRepository,
  auditRepository
);

export const branchAccessService = new BranchAccessService(
  userBranchAccessRepository,
  userRepository,
  sessionRepository,
  auditRepository
);

export const sessionService = new SessionService(
  sessionRepository,
  auditRepository
);

export const securityPolicyService = new SecurityPolicyService(
  securityPolicyRepository,
  auditRepository
);

export const auditQueryService = new AuditQueryService(
  auditRepository
);

export const effectivePermissionsService = new EffectivePermissionsService(
  userRepository,
  roleRepository
);

export const branchScopeResolver = new BranchScopeResolver(
  userBranchAccessRepository
);

export const authorizationGuard = new AuthorizationGuard(
  userRepository,
  sessionRepository,
  effectivePermissionsService,
  branchScopeResolver
);

// We can instantiate organizationService using the same auditRepository pattern
// Let's check how organizationRepository is imported/used.
import { PrismaOrganizationRepository } from '@ims/database';
const organizationRepository = new PrismaOrganizationRepository(prisma);

// Wrap auditRepository to fit the deprecated AuditLogRepository format if needed,
// but PrismaAuditLogRepository supports appending directly which satisfies the organization module's expectations.
export const organizationService = new OrganizationService(
  organizationRepository,
  auditRepository as any,
  {
    isActiveUser: async (userId: string) => {
      try {
        const user = await userRepository.findById(userId);
        return user ? user.status === 'Active' : false;
      } catch {
        return false;
      }
    },
  }
);
