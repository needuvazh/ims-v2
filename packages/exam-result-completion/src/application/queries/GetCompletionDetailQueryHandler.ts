import { CourseCompletionRepository } from '../../domain/interfaces/CourseCompletionRepository';
import { CompletionApprovalRepository } from '../../domain/interfaces/CompletionApprovalRepository';
import {
  CompletionApproval,
  ApprovalLevel,
  ApprovalStatus,
} from '../../domain/aggregates/CompletionApproval';

export interface GetCompletionDetailInput {
  completionId: string;
}

export interface ApprovalTimelineEntry {
  id: string;
  approvalLevel: ApprovalLevel;
  status: ApprovalStatus;
  actorId: string;
  actionDate?: Date | null;
  remarks?: string | null;
  createdAt: Date;
}

export interface CompletionDetail {
  id: string;
  enrollmentId: string;
  completionStatus: string;
  attendancePercentage?: number | null;
  attendanceOutcome?: string | null;
  examRequired: boolean;
  examOutcome?: string | null;
  paymentRequired: boolean;
  paymentOutcome?: string | null;
  manualApprovalRequired: boolean;
  certificateAllowed: boolean;
  evidenceStale: boolean;
  approvalTimeline: ApprovalTimelineEntry[];
}

export class GetCompletionDetailQueryHandler {
  constructor(
    private readonly completionRepository: CourseCompletionRepository,
    private readonly approvalRepository: CompletionApprovalRepository,
  ) {}

  async execute(
    input: GetCompletionDetailInput,
  ): Promise<CompletionDetail | null> {
    const completion = await this.completionRepository.findById(
      input.completionId,
    );
    if (!completion) {
      return null;
    }

    const approvals = await this.approvalRepository.findByCompletionId(
      completion.id,
    );

    return {
      id: completion.id,
      enrollmentId: completion.enrollmentId,
      completionStatus: completion.completionStatus,
      attendancePercentage: completion.attendancePercentage,
      attendanceOutcome: completion.attendanceOutcome,
      examRequired: completion.examRequired,
      examOutcome: completion.examOutcome,
      paymentRequired: completion.paymentRequired,
      paymentOutcome: completion.paymentOutcome,
      manualApprovalRequired: completion.manualApprovalRequired,
      certificateAllowed: completion.certificateAllowed,
      evidenceStale: completion.evidenceStale,
      approvalTimeline: approvals.map((a) => ({
        id: a.id,
        approvalLevel: a.approvalLevel,
        status: a.status,
        actorId: a.actorId,
        actionDate: a.actionDate,
        remarks: a.remarks,
        createdAt: a.createdAt,
      })),
    };
  }
}
