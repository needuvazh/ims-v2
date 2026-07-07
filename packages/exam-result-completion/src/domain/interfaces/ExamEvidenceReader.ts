export interface ExamEvidenceReader {
  getExamSummaryForEnrollment(
    enrollmentId: string,
    batchId: string
  ): Promise<{
    outcome: 'Pass' | 'Fail' | 'Pending' | 'NotRequired';
    lastUpdated: Date | null;
  } | null>;
}
