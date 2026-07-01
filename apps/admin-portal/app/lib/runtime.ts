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
  PrismaExportJobRepository,
  PrismaLoginHistoryRepository,
  PrismaUserActivationTokenRepository,
} from '@ims/database';
import { createUuid } from '@ims/shared-kernel';
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
  LoginHistoryQueryService,
  EffectivePermissionsService,
  BranchScopeResolver,
  AuthorizationGuard,
  NoOpPermissionCache,
  DummyNotificationProvider,
} from '@ims/identity-access';

// ─── Repositories ──────────────────────────────────────────────────────────
const auditRepository = new PrismaAuditLogRepository(prisma);
export const userRepository = new PrismaUserRepository(prisma);
const roleRepository = new PrismaRoleRepository(prisma);
const permissionRepository = new PrismaPermissionRepository(prisma);
const userBranchAccessRepository = new PrismaUserBranchAccessRepository(prisma);
export const sessionRepository = new PrismaSessionRepository(prisma);
const passwordHistoryRepository = new PrismaPasswordHistoryRepository(prisma);
const securityPolicyRepository = new PrismaSecurityPolicyRepository(prisma);
const notificationRepository = new PrismaNotificationRepository(prisma);
const outboxEventRepository = new PrismaOutboxEventRepository(prisma);
export const exportJobRepository = new PrismaExportJobRepository(prisma);
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
  userBranchAccessRepository,
  outboxEventRepository
);

export const roleService = new RoleService(
  roleRepository,
  permissionRepository,
  auditRepository,
  userRepository,
  notificationRepository
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
  auditRepository,
  userBranchAccessRepository
);

export const securityPolicyService = new SecurityPolicyService(
  securityPolicyRepository,
  auditRepository
);

export const auditQueryService = new AuditQueryService(
  auditRepository
);

export const loginHistoryQueryService = new LoginHistoryQueryService(
  loginHistoryRepository,
  userBranchAccessRepository
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
  branchScopeResolver,
  new NoOpPermissionCache()
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
        const user = await userRepository.findById(createUuid(userId));
        return user ? user.status === 'Active' : false;
      } catch {
        return false;
      }
    },
    hasBranchAccess: async (userId: string, branchId: string) => {
      try {
        const accessList = await userBranchAccessRepository.findByUser(createUuid(userId));
        return accessList.some((a) => a.branchId === branchId && a.status === 'Active');
      } catch {
        return false;
      }
    },
  },
  {
    getActiveEnrollmentSize: async (classroomId: string) => {
      // Placeholder: Batch/Scheduling module not implemented yet.
      return 0;
    },
  },
  {
    hasActiveDependencies: async (branchId: string) => {
      try {
        const [leadsCount, admissionsCount, inquiriesCount] = await Promise.all([
          prisma.lead.count({ where: { branchId, isDeleted: false } }),
          prisma.admission.count({ where: { branchId, isDeleted: false } }),
          prisma.inquiry.count({ where: { branchId, isDeleted: false } }),
        ]);
        return (leadsCount + admissionsCount + inquiriesCount) > 0;
      } catch {
        return false;
      }
    },
  }
);

// ─── CRM Repositories & Services ──────────────────────────────────────────
import {
  InquiryRepository,
  LeadRepository,
  FollowUpRepository,
  InquiryApplicationService,
  LeadService,
  FollowUpApplicationService,
} from '@ims/crm-leads';

const crmInquiryRepository = new InquiryRepository(prisma);
const crmLeadRepository = new LeadRepository(prisma);
const crmFollowUpRepository = new FollowUpRepository(prisma);

export const inquiryService = new InquiryApplicationService(
  prisma,
  crmInquiryRepository,
  crmLeadRepository
);

export const leadService = new LeadService(
  prisma,
  crmLeadRepository,
  crmFollowUpRepository
);

export const followUpService = new FollowUpApplicationService(
  prisma,
  crmFollowUpRepository,
  crmLeadRepository
);

// ─── Admissions Repositories & Services ──────────────────────────────────
import {
  AdmissionRepository,
  AdmissionService,
  LeadConversionOrchestrator
} from '@ims/admissions-enrollment';

const admissionRepository = new AdmissionRepository(prisma);
export const admissionService = new AdmissionService(admissionRepository);

export const leadConversionOrchestrator = new LeadConversionOrchestrator(
  prisma,
  leadService,
  admissionService
);

