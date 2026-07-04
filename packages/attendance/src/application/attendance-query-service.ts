import type { PrismaClient } from '@prisma/client';
import type { AttendanceActionContext, AttendanceSessionStatus } from '../domain/attendance';
import type { AttendanceQueryRepository } from '../domain/repositories';

export class AttendanceQueryService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly queryRepo: AttendanceQueryRepository,
  ) {}

  async listSessions(filters: {
    branchIds: string[];
    batchId?: string | null;
    sessionId?: string | null;
    attendanceDateFrom?: Date | null;
    attendanceDateTo?: Date | null;
    status?: AttendanceSessionStatus | null;
    page: number;
    pageSize: number;
  }) {
    return this.queryRepo.sessionRows(this.prisma, filters, filters.page, filters.pageSize);
  }

  async enrollmentSummary(enrollmentId: string, context: AttendanceActionContext) {
    return this.queryRepo.summaryByEnrollment(this.prisma, enrollmentId);
  }

  async batchSummary(batchId: string, branchIds: string[]) {
    return this.queryRepo.summaryByBatch(this.prisma, batchId, branchIds);
  }

  async branchSummary(branchId: string, branchIds: string[]) {
    return this.queryRepo.summaryByBranch(this.prisma, branchId, branchIds);
  }

  async trainerWorkload(branchIds: string[], page = 1, pageSize = 20) {
    return this.queryRepo.sessionRows(this.prisma, { branchIds }, page, pageSize);
  }
}
