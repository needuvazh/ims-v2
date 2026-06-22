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
import { OrganizationService } from '@ims/organization';
import { AuthService, UserService, RoleService } from '@ims/identity-access';

// ─── Repositories ──────────────────────────────────────────────────────────
const auditRepository = new PrismaAuditRepository(prisma);
const organizationRepository = new PrismaOrganizationRepository(prisma);
const userRepository = new PrismaUserRepository(prisma);
const roleRepository = new PrismaRoleRepository(prisma);
export const sessionRepository = new PrismaAuthSessionRepository(prisma);

// ─── Application Services ─────────────────────────────────────────────────
export const organizationService = new OrganizationService(organizationRepository, auditRepository);
export const authService = new AuthService(userRepository, sessionRepository, auditRepository);
export const userService = new UserService(userRepository, roleRepository, auditRepository);
export const roleService = new RoleService(roleRepository, auditRepository);
