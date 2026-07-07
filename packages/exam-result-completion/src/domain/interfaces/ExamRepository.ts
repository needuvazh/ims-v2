import { Exam, ExamStatus } from '../aggregates/Exam';

export interface ExamRepository {
  findById(id: string): Promise<Exam | null>;
  findByBatchId(batchId: string, status?: ExamStatus): Promise<Exam[]>;
  findByCourseId(courseId: string, status?: ExamStatus): Promise<Exam[]>;
  findByBatchAndDate(batchId: string, examDate: Date): Promise<Exam[]>;
  save(exam: Exam): Promise<void>;
  saveMany(exams: Exam[]): Promise<void>;
  delete(id: string, deletedBy: string): Promise<void>;
}
