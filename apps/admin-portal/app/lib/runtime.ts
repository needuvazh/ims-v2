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
import { PrismaSchedulingRepository, SchedulingService } from '@ims/scheduling';
import {
  AttendanceQueryService,
  AttendanceService,
  PrismaAttendanceAlertRepository,
  PrismaAttendanceCorrectionRepository,
  PrismaAttendanceQueryRepository,
  PrismaAttendanceRecordRepository,
  PrismaAttendanceSessionRepository,
} from '@ims/attendance';
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
  InMemoryPermissionCache,
  DummyNotificationProvider,
} from '@ims/identity-access';

// ─── Cache ────────────────────────────────────────────────────────────────
const permissionCache = new InMemoryPermissionCache();

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
const schedulingRepository = new PrismaSchedulingRepository(prisma);
const attendanceSessionRepository = new PrismaAttendanceSessionRepository(prisma);
const attendanceRecordRepository = new PrismaAttendanceRecordRepository(prisma);
const attendanceCorrectionRepository = new PrismaAttendanceCorrectionRepository(prisma);
const attendanceAlertRepository = new PrismaAttendanceAlertRepository(prisma);
const attendanceQueryRepository = new PrismaAttendanceQueryRepository(prisma);

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
  roleRepository,
  userBranchAccessRepository,
  outboxEventRepository,
  notificationPort,
  permissionCache
);

export const roleService = new RoleService(
  roleRepository,
  permissionRepository,
  auditRepository,
  userRepository,
  notificationRepository,
  permissionCache
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

export const schedulingCalendarService = new SchedulingService(prisma, schedulingRepository);
export const attendanceService = new AttendanceService(
  prisma,
  attendanceSessionRepository,
  attendanceRecordRepository,
  attendanceCorrectionRepository,
  attendanceAlertRepository,
  attendanceQueryRepository,
);
export const attendanceQueryService = new AttendanceQueryService(
  prisma,
  attendanceQueryRepository,
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
  roleRepository,
  permissionCache
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
    getActiveEnrollmentSize: async (_classroomId: string) => {
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
  FollowUpSchedulerService,
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

export const followUpSchedulerService = new FollowUpSchedulerService(
  prisma,
  crmFollowUpRepository
);

// ─── Admissions Repositories & Services ──────────────────────────────────
import {
  AdmissionRepository,
  AdmissionService,
  AdmissionQueryService,
  LeadConversionOrchestrator,
  EnrollmentService,
  StudentQueryService,
  OtpService,
  StudentMergeService,
  StudentStatusService,
} from '@ims/admissions-enrollment';

const admissionRepository = new AdmissionRepository(prisma);
export const admissionService = new AdmissionService(admissionRepository, prisma);
export const admissionQueryService = new AdmissionQueryService(prisma);
export const enrollmentService = new EnrollmentService(prisma);
export const studentQueryService = new StudentQueryService(prisma);
export const otpService = new OtpService();
export const studentMergeService = new StudentMergeService(prisma);
export const studentStatusService = new StudentStatusService(prisma);

export const leadConversionOrchestrator = new LeadConversionOrchestrator(
  prisma,
  leadService,
  admissionService
);

// ─── Course Catalog Repositories & Services ────────────────────────────────
import {
  CourseRepository,
  CourseCategoryRepository,
  CoursePricingRepository,
  CourseDiscountRepository,
  CourseCompletionRuleRepository,
  CourseService,
  CategoryService,
  CoursePricingService,
  CourseDiscountService,
  CourseCompletionRuleService,
} from '@ims/course-catalog';

const courseRepository = new CourseRepository(prisma);
const categoryRepository = new CourseCategoryRepository(prisma);
const coursePricingRepository = new CoursePricingRepository(prisma);
const courseDiscountRepository = new CourseDiscountRepository(prisma);
const courseCompletionRuleRepository = new CourseCompletionRuleRepository(prisma);

export const courseService = new CourseService(prisma, courseRepository);
export const categoryService = new CategoryService(prisma, categoryRepository);
export const coursePricingService = new CoursePricingService(prisma, coursePricingRepository, courseDiscountRepository);
export const courseDiscountService = new CourseDiscountService(prisma, courseDiscountRepository);
export const courseCompletionRuleService = new CourseCompletionRuleService(prisma, courseCompletionRuleRepository);

// ─── Reporting & CRM Dashboards ───────────────────────────────────────────
import { LeadAnalyticsReadService } from '@ims/crm-leads';
import { CrmDashboardQueryService } from '@ims/reporting-dashboards';
import { PrismaAuditRepository } from '@ims/database';

export const leadAnalyticsReadService = new LeadAnalyticsReadService(prisma);
const prismaAuditRepository = new PrismaAuditRepository(prisma);

export const crmDashboardQueryService = new CrmDashboardQueryService(
  leadAnalyticsReadService,
  prismaAuditRepository
);

// ─── Training Delivery Repositories & Services ────────────────────────────
import { BatchRepository, BatchService, ISchedulingService } from '@ims/training-delivery';

class PrismaSchedulingService implements ISchedulingService {
  constructor(private readonly prisma: any) {}

  async getSessionsForTrainer(
    trainerId: string,
    startDate: Date,
    endDate: Date,
    tx?: any
  ): Promise<any[]> {
    const client = tx || this.prisma;
    const assignments = await client.batchTrainer.findMany({
      where: {
        trainerId,
        status: 'Active',
        isDeleted: false,
        assignedFrom: { lte: endDate },
        assignedTo: { gte: startDate },
      },
      select: {
        batchId: true,
      },
    });

    if (assignments.length === 0) {
      return [];
    }

    const batchIds = assignments.map((a: any) => a.batchId);

    const sessions = await client.session.findMany({
      where: {
        batchId: { in: batchIds },
        sessionDate: {
          gte: startDate,
          lte: endDate,
        },
        status: 'Scheduled',
        isDeleted: false,
      },
      include: {
        batch: {
          select: {
            batchCode: true,
          },
        },
      },
    });

    return sessions.map((s: any) => ({
      batchCode: s.batch.batchCode,
      sessionDate: s.sessionDate,
      startTime: s.startTime,
      endTime: s.endTime,
    }));
  }

  async validateSession(input: {
    branchId: string;
    instituteId: string;
    scheduledDate: Date;
    startTime: string;
    endTime: string;
    trainerId?: string | null;
    classroomId?: string | null;
    batchId?: string | null;
    sessionId?: string | null;
  }, tx?: any) {
    return schedulingCalendarService.validateSession(input, tx);
  }
}

const batchRepository = new BatchRepository(prisma);
const schedulingService = new PrismaSchedulingService(prisma);
export const batchService = new BatchService(prisma, batchRepository, schedulingService);

export { prisma };
