import { Result, ResultStatus } from '../aggregates/Result';

export interface ResultRepository {
  findById(id: string): Promise<Result | null>;
  findByExamId(examId: string): Promise<Result[]>;
  findByEnrollmentId(enrollmentId: string): Promise<Result[]>;
  findByExamAndEnrollment(examId: string, enrollmentId: string): Promise<Result | null>;
  save(result: Result): Promise<void>;
  saveMany(results: Result[]): Promise<void>;
  delete(id: string, deletedBy: string): Promise<void>;
}
