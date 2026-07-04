import { z } from 'zod';
import type { BranchId, Uuid } from '@ims/shared-kernel';

export const calendarStatusSchema = z.enum(['Draft', 'Active', 'Closed', 'Archived']);
export type CalendarStatus = z.infer<typeof calendarStatusSchema>;

export const holidayStatusSchema = z.enum(['Draft', 'Active', 'Inactive', 'Cancelled', 'Archived']);
export type HolidayStatus = z.infer<typeof holidayStatusSchema>;

export const dayOfWeekSchema = z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']);
export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;

export type CalendarWorkingHour = {
  id: Uuid;
  operatingDayId: Uuid;
  startTime: string;
  endTime: string;
};

export type CalendarOperatingDay = {
  id: Uuid;
  businessCalendarId?: Uuid | null;
  branchCalendarOverrideId?: Uuid | null;
  dayOfWeek: DayOfWeek;
  isOpen: boolean;
  workingHours: CalendarWorkingHour[];
};

export type BusinessCalendar = {
  id: Uuid;
  instituteId: Uuid;
  code: string;
  name: string;
  nameLocalized: { en: string; ar: string };
  year: number;
  countryCode: string;
  timezone: string;
  effectiveStartDate: Date;
  effectiveEndDate: Date | null;
  status: CalendarStatus;
  isActive: boolean;
  version: number;
  operatingDays: CalendarOperatingDay[];
  createdAt: Date;
  createdBy: Uuid | null;
  updatedAt: Date | null;
  updatedBy: Uuid | null;
  deletedAt: Date | null;
  deletedBy: Uuid | null;
  isDeleted: boolean;
};

export type BranchCalendarOverride = {
  id: Uuid;
  businessCalendarId: Uuid;
  branchId: BranchId;
  year: number;
  name: string | null;
  nameLocalized: { en: string; ar: string } | null;
  effectiveStartDate: Date;
  effectiveEndDate: Date | null;
  status: CalendarStatus;
  notes: string | null;
  version: number;
  operatingDays: CalendarOperatingDay[];
  createdAt: Date;
  createdBy: Uuid | null;
  updatedAt: Date | null;
  updatedBy: Uuid | null;
  deletedAt: Date | null;
  deletedBy: Uuid | null;
  isDeleted: boolean;
};

export type Holiday = {
  id: Uuid;
  businessCalendarId: Uuid;
  branchCalendarOverrideId: Uuid | null;
  branchId: BranchId | null;
  date: Date;
  name: string;
  nameLocalized: { en: string; ar: string };
  holidayType: string;
  affectsScheduling: boolean;
  status: HolidayStatus;
  description: string | null;
  overridePolicy: 'NOT_ALLOWED' | 'MANAGER_APPROVAL_ALLOWED' | 'SUPER_ADMIN_ONLY';
  version: number;
  createdAt: Date;
  createdBy: Uuid | null;
  updatedAt: Date | null;
  updatedBy: Uuid | null;
  deletedAt: Date | null;
  deletedBy: Uuid | null;
  isDeleted: boolean;
};

export type VenueBlock = {
  id: Uuid;
  branchId: BranchId;
  classroomId: Uuid | null;
  blockStartDate: Date;
  blockEndDate: Date;
  startTime: string | null;
  endTime: string | null;
  isFullDay: boolean;
  reasonCode: string;
  status: 'Active' | 'Cancelled';
  version: number;
  createdAt: Date;
  createdBy: Uuid | null;
  updatedAt: Date | null;
  updatedBy: Uuid | null;
  deletedAt: Date | null;
  deletedBy: Uuid | null;
  isDeleted: boolean;
};

export const localizedTextSchema = z.object({ en: z.string().trim().min(1), ar: z.string().trim().min(1) });

export const workingHourSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
}).refine((value) => value.startTime < value.endTime, { message: 'Working hour start must be before end' });

export const operatingDaySchema = z.object({
  dayOfWeek: dayOfWeekSchema,
  isOpen: z.boolean(),
  workingHours: z.array(workingHourSchema).default([]),
}).refine((value) => (value.isOpen ? value.workingHours.length > 0 : value.workingHours.length === 0), {
  message: 'Open days require working hours and closed days must not include working hours',
});

export const createBusinessCalendarSchema = z.object({
  instituteId: z.string().uuid(),
  code: z.string().trim().min(3).max(40),
  name: z.string().trim().min(3).max(160),
  nameLocalized: localizedTextSchema,
  year: z.number().int().min(2000).max(2100),
  countryCode: z.string().trim().length(2).default('OM'),
  timezone: z.literal('Asia/Muscat').default('Asia/Muscat'),
  effectiveStartDate: z.coerce.date(),
  effectiveEndDate: z.coerce.date().nullable().optional(),
  status: calendarStatusSchema.default('Draft'),
  operatingDays: z.array(operatingDaySchema).length(7),
});

export const updateBusinessCalendarSchema = createBusinessCalendarSchema.partial().omit({ instituteId: true, code: true });

export const createBranchOverrideSchema = z.object({
  businessCalendarId: z.string().uuid(),
  branchId: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  name: z.string().trim().min(3).max(160).optional().nullable(),
  nameLocalized: localizedTextSchema.optional().nullable(),
  effectiveStartDate: z.coerce.date(),
  effectiveEndDate: z.coerce.date().nullable().optional(),
  status: calendarStatusSchema.default('Draft'),
  notes: z.string().trim().max(1000).optional().nullable(),
  operatingDays: z.array(operatingDaySchema).default([]),
});

export const updateBranchOverrideSchema = createBranchOverrideSchema.partial().omit({ businessCalendarId: true, branchId: true, year: true });

export const createHolidaySchema = z.object({
  businessCalendarId: z.string().uuid(),
  branchCalendarOverrideId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  date: z.coerce.date(),
  name: z.string().trim().min(2).max(160),
  nameLocalized: localizedTextSchema,
  holidayType: z.string().trim().min(2).max(50),
  affectsScheduling: z.boolean().default(true),
  status: holidayStatusSchema.default('Draft'),
  description: z.string().trim().max(1000).optional().nullable(),
  overridePolicy: z.enum(['NOT_ALLOWED', 'MANAGER_APPROVAL_ALLOWED', 'SUPER_ADMIN_ONLY']).default('MANAGER_APPROVAL_ALLOWED'),
});

export const createVenueBlockSchema = z.object({
  branchId: z.string().uuid(),
  classroomId: z.string().uuid().nullable().optional(),
  blockStartDate: z.coerce.date(),
  blockEndDate: z.coerce.date().nullable().optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  isFullDay: z.boolean().default(true),
  reasonCode: z.string().trim().min(2).max(50),
  status: z.enum(['Active', 'Cancelled']).default('Active'),
});

const createVenueBlockSchemaRefined = createVenueBlockSchema.refine((data) => {
  const blockEndDate = data.blockEndDate ?? data.blockStartDate;
  if (blockEndDate < data.blockStartDate) {
    return false;
  }
  if (!data.isFullDay) {
    return data.startTime && data.endTime && data.startTime < data.endTime;
  }
  return true;
}, { message: 'Venue block end date must be on or after the start date, and partial-day blocks require valid start and end times.' });

export { createVenueBlockSchemaRefined as createVenueBlockRefinedSchema };

export const updateVenueBlockSchema = createVenueBlockSchema.partial().omit({ branchId: true });

export type CreateBusinessCalendarCommand = z.infer<typeof createBusinessCalendarSchema>;
export type UpdateBusinessCalendarCommand = z.infer<typeof updateBusinessCalendarSchema>;
export type CreateBranchOverrideCommand = z.infer<typeof createBranchOverrideSchema>;
export type UpdateBranchOverrideCommand = z.infer<typeof updateBranchOverrideSchema>;
export type CreateHolidayCommand = z.infer<typeof createHolidaySchema>;
export type CreateVenueBlockCommand = z.infer<typeof createVenueBlockSchema>;
export type UpdateVenueBlockCommand = z.infer<typeof updateVenueBlockSchema>;

export type ResolvedCalendar = {
  businessCalendar: BusinessCalendar;
  branchOverride: BranchCalendarOverride | null;
  holidays: Holiday[];
  resolvedOperatingDays: CalendarOperatingDay[];
  source: 'branch-override' | 'institute-calendar' | 'system-default';
};

export const conflictTypeEnum = z.enum(['HOLIDAY', 'VENUE', 'TRAINER_OVERLAP', 'CLASSROOM_OVERLAP', 'OPERATING_HOURS']);
export type ConflictType = z.infer<typeof conflictTypeEnum>;

export type ValidationConflict = {
  type: ConflictType;
  message: string;
  severity: 'CRITICAL' | 'WARNING';
  conflictEntityId?: string;
};

export type ValidationResult = {
  isValid: boolean;
  conflicts: ValidationConflict[];
};
