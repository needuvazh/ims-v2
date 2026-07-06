export interface AttendanceEvidenceReader {
  getAttendanceSummaryForEnrollment(enrollmentId: string): Promise<{
    attendedSessions: number;
    totalSessions: number;
    attendancePercentage: number;
    outcome: 'Met' | 'NotMet' | 'InsufficientData';
    lastUpdated: Date | null;
  } | null>;
}
