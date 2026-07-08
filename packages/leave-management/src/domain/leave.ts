import { z } from 'zod';
import { DomainError, type Uuid } from '@ims/shared-kernel';

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export const LeaveTypeSchema = z.enum(['Sick', 'Casual', 'Annual', 'Unpaid']);
export type LeaveType = z.infer<typeof LeaveTypeSchema>;

export interface LeaveRequestRecord {
  id: Uuid;
  personId: Uuid;
  branchId: Uuid;
  startDate: Date;
  endDate: Date;
  startTime: string | null;
  endTime: string | null;
  isFullDay: boolean;
  leaveType: LeaveType;
  reason: string | null;
  status: LeaveStatus;
  approvedBy: Uuid | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  isDeleted: boolean;
  person?: {
    id: Uuid;
    firstName: string;
    lastName: string;
    email: string | null;
    mobile: string;
  };
  branch?: {
    id: Uuid;
    branchCode: string;
    branchName: string;
  };
}

export const CreateLeaveRequestSchema = z
  .object({
    personId: z.string().uuid(),
    branchId: z.string().uuid(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    isFullDay: z.boolean().default(true),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional()
      .nullable(),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional()
      .nullable(),
    leaveType: LeaveTypeSchema,
    reason: z.string().max(500).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // 1. Date order check
    if (data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date cannot be before start date.',
        path: ['endDate'],
      });
    }

    // 2. Partial day checks
    if (!data.isFullDay) {
      if (!data.startTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Start time is required for partial day leaves.',
          path: ['startTime'],
        });
      }
      if (!data.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End time is required for partial day leaves.',
          path: ['endTime'],
        });
      }
      if (data.startTime && data.endTime && data.startTime >= data.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End time must be after start time.',
          path: ['endTime'],
        });
      }
    }
  });

export type CreateLeaveRequestInput = z.infer<typeof CreateLeaveRequestSchema>;

export function validateLeaveDates(startDate: Date, endDate: Date) {
  if (startDate > endDate) {
    throw new DomainError(
      'invalid_effective_date_range',
      'End date cannot be before the start date.',
    );
  }
}
