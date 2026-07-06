import { ExamRepository } from '../../domain/interfaces/ExamRepository';
import { ExamStatus } from '../../domain/aggregates/Exam';

export interface SearchExamsInput {
  batchId?: string;
  courseId?: string;
  status?: ExamStatus;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  pageSize?: number;
}

export interface ExamSummary {
  id: string;
  examName: string;
  batchId: string;
  courseId: string;
  examDate: Date;
  status: ExamStatus;
  maxMarks: number;
  passMarks: number;
}

export class SearchExamsQueryHandler {
  constructor(private readonly examRepository: ExamRepository) {}

  async execute(input: SearchExamsInput): Promise<{
    exams: ExamSummary[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    let exams = input.batchId
      ? await this.examRepository.findByBatchId(input.batchId, input.status)
      : input.courseId
        ? await this.examRepository.findByCourseId(input.courseId, input.status)
        : [];

    if (input.fromDate) {
      exams = exams.filter(e => e.examDate >= input.fromDate!);
    }

    if (input.toDate) {
      exams = exams.filter(e => e.examDate <= input.toDate!);
    }

    const total = exams.length;
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const pagedExams = exams.slice(start, start + pageSize);

    return {
      exams: pagedExams.map(e => ({
        id: e.id,
        examName: e.examName,
        batchId: e.batchId,
        courseId: e.courseId,
        examDate: e.examDate,
        status: e.status,
        maxMarks: e.maxMarks,
        passMarks: e.passMarks,
      })),
      total,
      page,
      pageSize,
    };
  }
}
