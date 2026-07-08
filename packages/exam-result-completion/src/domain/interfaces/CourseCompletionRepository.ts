import {
  CourseCompletion,
  CompletionStatus,
} from '../aggregates/CourseCompletion';

export interface CourseCompletionRepository {
  findById(id: string): Promise<CourseCompletion | null>;
  findByEnrollmentId(enrollmentId: string): Promise<CourseCompletion | null>;
  findByStatus(status: CompletionStatus): Promise<CourseCompletion[]>;
  findByEnrollmentIds(enrollmentIds: string[]): Promise<CourseCompletion[]>;
  save(completion: CourseCompletion): Promise<void>;
  saveMany(completions: CourseCompletion[]): Promise<void>;
  delete(id: string, deletedBy: string): Promise<void>;
}
