/**
 * Server-side runtime — wires Prisma repositories into application services.
 * Import this only in server actions and route handlers (never in client components).
 */
import { prisma } from '@ims/database';
import { PrismaAuditRepository } from '@ims/database';
import { PrismaOrganizationRepository } from '@ims/database';
import { PrismaUserRepository } from '@ims/database';
import { PrismaRoleRepository } from '@ims/database';
import { PrismaAuthSessionRepository } from '@ims/database';
import { PrismaAuthResetTokenRepository } from '@ims/database';
import { OrganizationService } from '@ims/organization';
import { AuthService, UserService, RoleService } from '@ims/identity-access';
import { ConsolePasswordResetPort } from './notification-port';

// ─── Repositories ──────────────────────────────────────────────────────────
const auditRepository = new PrismaAuditRepository(prisma);
const organizationRepository = new PrismaOrganizationRepository(prisma);
const userRepository = new PrismaUserRepository(prisma);
const roleRepository = new PrismaRoleRepository(prisma);
export const sessionRepository = new PrismaAuthSessionRepository(prisma);
const resetTokenRepository = new PrismaAuthResetTokenRepository(prisma);

// ─── Application Services ─────────────────────────────────────────────────
export const userService = new UserService(userRepository, roleRepository, auditRepository);
export const authService = new AuthService(
  userRepository,
  sessionRepository,
  resetTokenRepository,
  auditRepository,
  // Phase 1 stub: logs reset link safely (token hidden in production).
  // Replace with EmailPasswordResetPort in Phase 2.
  new ConsolePasswordResetPort(),
);
export const roleService = new RoleService(roleRepository, auditRepository);

export const organizationService = new OrganizationService(
  organizationRepository,
  auditRepository,
  {
    isActiveUser: async (userId: string) => {
      try {
        const user = await userService.getUser(userId);
        return user.status === 'Active';
      } catch {
        return false;
      }
    },
  }
);

