import { CourseCompletionRepository } from '../../domain/interfaces/CourseCompletionRepository';
import { CourseCompletionRuleReader } from '../../domain/interfaces/CourseCompletionRuleReader';
import { AttendanceEvidenceReader } from '../../domain/interfaces/AttendanceEvidenceReader';
import { FinanceValidationReader } from '../../domain/interfaces/FinanceValidationReader';
import { EnrollmentReader } from '../../domain/interfaces/EnrollmentReader';
import { CourseCompletionAggregate, EvaluateCompletionCommand, COMPLETION_STATUSES } from '../../domain/aggregates/CourseCompletion';
import { CompletionInvalidStateError, CompletionDuplicateError } from '../../domain/errors';

export interface EvaluateCompletionInput {
  enrollmentId: string;
  userId: string;
}

export class EvaluateCompletionCommandHandler {
  constructor(
    private readonly completionRepository: CourseCompletionRepository,
    private readonly ruleReader: CourseCompletionRuleReader,
    private readonly attendanceReader: AttendanceEvidenceReader,
    private readonly financeReader: FinanceValidationReader,
    private readonly enrollmentReader: EnrollmentReader,
  ) {}

  async execute(input: EvaluateCompletionInput): Promise<string> {
    const enrollment = await this.enrollmentReader.getEnrollmentById(input.enrollmentId);
    if (!enrollment) {
      throw new CompletionInvalidStateError(`Enrollment ${input.enrollmentId} not found`);
    }

    const existing = await this.completionRepository.findByEnrollmentId(input.enrollmentId);
    if (existing && existing.completionStatus !== COMPLETION_STATUSES.PENDING && existing.completionStatus !== COMPLETION_STATUSES.EVIDENCE_INCOMPLETE && existing.completionStatus !== COMPLETION_STATUSES.REEVALUATION_REQUIRED) {
      throw new CompletionDuplicateError(`Completion already exists for enrollment ${input.enrollmentId} with status: ${existing.completionStatus}`);
    }

    const rule = await this.ruleReader.getCompletionRuleForCourse(enrollment.courseId);
    if (!rule) {
      throw new CompletionInvalidStateError(`No completion rule found for course ${enrollment.courseId}`);
    }

    const attendance = await this.attendanceReader.getAttendanceSummaryForEnrollment(input.enrollmentId);
    const finance = await this.financeReader.getPaymentStatusForEnrollment(input.enrollmentId);

    const attendancePercentage = attendance?.attendancePercentage ?? 0;
    const attendanceOutcome = attendance?.outcome === 'Met' ? 'Met' : 'NotMet';
    const examRequired = rule.examRequired;
    const examOutcome = examRequired ? 'Pending' : 'NotRequired';
    const paymentRequired = rule.feeClearanceRequired;
    const paymentOutcome = finance?.outcome === 'Cleared' ? 'Cleared' : 'Outstanding';
    const manualApprovalRequired = rule.manualApprovalRequired;

    if (existing) {
      const aggregate = new CourseCompletionAggregate(existing);
      const updated = aggregate.updateEvidence({
        attendancePercentage,
        attendanceOutcome,
        examOutcome,
        paymentOutcome: finance ? paymentOutcome : undefined,
        attendanceUpdatedAt: attendance?.lastUpdated ?? undefined,
        resultUpdatedAt: new Date(),
        paymentUpdatedAt: finance?.lastPaymentDate ?? undefined,
      });

      const evaluated = updated.evidenceStale ? updated : aggregate.evaluate();
      evaluated.updatedBy = input.userId;
      await this.completionRepository.save(evaluated);
      return existing.id;
    }

    const command: EvaluateCompletionCommand = {
      enrollmentId: input.enrollmentId,
      attendancePercentage,
      attendanceOutcome,
      examRequired,
      examOutcome,
      paymentRequired,
      paymentOutcome: finance ? paymentOutcome : undefined,
      manualApprovalRequired,
      createdBy: input.userId,
    };

    const aggregate = CourseCompletionAggregate.create(command);
    await this.completionRepository.save(aggregate.state);

    return aggregate.state.id;
  }
}
