export interface EnrollmentReader {
  getEnrollmentById(enrollmentId: string): Promise<{
    id: string;
    studentProfileId: string;
    courseId: string;
    batchId: string;
    branchId: string;
    enrollmentStatus: string;
  } | null>;

  getEnrollmentsForBatch(batchId: string): Promise<
    Array<{
      id: string;
      studentProfileId: string;
      enrollmentStatus: string;
    }>
  >;
}
