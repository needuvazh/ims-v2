import { ResultRepository } from '../../domain/interfaces/ResultRepository';
import { ExamRepository } from '../../domain/interfaces/ExamRepository';
import {
  ResultAggregate,
  RESULT_STATUSES,
} from '../../domain/aggregates/Result';
import {
  ResultInvalidStateError,
  ResultMarksValidationError,
} from '../../domain/errors';

export interface ValidateBulkResultsInput {
  examId: string;
  results: Array<{
    enrollmentId: string;
    marksObtained: number;
    grade?: string;
  }>;
  userId: string;
}

export interface ValidationResultRow {
  rowIndex: number;
  enrollmentId: string;
  valid: boolean;
  error?: string;
}

export class ValidateBulkResultsCommandHandler {
  constructor(
    private readonly resultRepository: ResultRepository,
    private readonly examRepository: ExamRepository,
  ) {}

  async execute(input: ValidateBulkResultsInput): Promise<{
    validationToken: string;
    results: ValidationResultRow[];
    validCount: number;
    invalidCount: number;
  }> {
    const exam = await this.examRepository.findById(input.examId);
    if (!exam) {
      throw new ResultInvalidStateError(`Exam ${input.examId} not found`);
    }

    if (exam.status !== 'OpenForResultEntry') {
      throw new ResultInvalidStateError(
        `Exam ${input.examId} is not open for result entry (status: ${exam.status})`,
      );
    }

    const validationResults: ValidationResultRow[] = [];
    const seenEnrollments = new Set<string>();
    let validCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < input.results.length; i++) {
      const row = input.results[i];
      let error: string | undefined;

      if (seenEnrollments.has(row.enrollmentId)) {
        error = `Duplicate enrollmentId: ${row.enrollmentId}`;
      } else if (row.marksObtained < 0) {
        error = 'marksObtained must be >= 0';
      } else if (row.marksObtained > exam.maxMarks) {
        error = `marksObtained must be <= ${exam.maxMarks}`;
      } else {
        const existing = await this.resultRepository.findByExamAndEnrollment(
          input.examId,
          row.enrollmentId,
        );
        if (existing && existing.resultStatus !== RESULT_STATUSES.PENDING) {
          error = `Result already finalized for enrollment ${row.enrollmentId}`;
        }
      }

      if (error) {
        invalidCount++;
        validationResults.push({
          rowIndex: i,
          enrollmentId: row.enrollmentId,
          valid: false,
          error,
        });
      } else {
        validCount++;
        seenEnrollments.add(row.enrollmentId);
        validationResults.push({
          rowIndex: i,
          enrollmentId: row.enrollmentId,
          valid: true,
        });
      }
    }

    const validationToken = crypto.randomUUID();

    return {
      validationToken,
      results: validationResults,
      validCount,
      invalidCount,
    };
  }
}
