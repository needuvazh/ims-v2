export interface CourseCompletionRuleReader {
  getCompletionRuleForCourse(courseId: string): Promise<{
    minimumAttendancePercent: number;
    examRequired: boolean;
    feeClearanceRequired: boolean;
    manualApprovalRequired: boolean;
  } | null>;
}
