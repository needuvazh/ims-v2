import { PrismaClient } from '@prisma/client';
import { AttendanceEvidenceReader } from '../../domain/interfaces/AttendanceEvidenceReader';

export class PrismaAttendanceEvidenceReader implements AttendanceEvidenceReader {
  constructor(private readonly prisma: PrismaClient) {}

  async getAttendanceSummaryForEnrollment(enrollmentId: string): Promise<{
    attendedSessions: number;
    totalSessions: number;
    attendancePercentage: number;
    outcome: 'Met' | 'NotMet' | 'InsufficientData';
    lastUpdated: Date | null;
  } | null> {
    const attendanceRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        enrollmentId,
        isDeleted: false,
      },
    });

    if (attendanceRecords.length === 0) {
      return null;
    }

    const attendedSessions = attendanceRecords.filter(
      (r) => r.status === 'Present' || r.status === 'Late'
    ).length;

    const totalSessions = attendanceRecords.length;
    const attendancePercentage = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;

    let outcome: 'Met' | 'NotMet' | 'InsufficientData';
    if (totalSessions < 1) {
      outcome = 'InsufficientData';
    } else if (attendancePercentage >= 75) {
      outcome = 'Met';
    } else {
      outcome = 'NotMet';
    }

    const lastUpdated = attendanceRecords
      .map((r) => r.updatedAt ?? r.createdAt)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return {
      attendedSessions,
      totalSessions,
      attendancePercentage: Math.round(attendancePercentage * 100) / 100,
      outcome,
      lastUpdated,
    };
  }
}
