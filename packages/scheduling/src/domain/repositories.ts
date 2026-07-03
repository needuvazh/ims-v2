import { Prisma } from '@prisma/client';
import type { BusinessCalendar, BranchCalendarOverride, Holiday, ResolvedCalendar, CalendarStatus } from './scheduling';

export interface ISchedulingRepository {
  findBusinessCalendarById(id: string, tx?: Prisma.TransactionClient): Promise<BusinessCalendar | null>;
  findActiveBusinessCalendarByInstitute(instituteId: string, date: Date, tx?: Prisma.TransactionClient): Promise<BusinessCalendar | null>;
  findOverlappingBusinessCalendars(instituteId: string, startDate: Date, endDate: Date | null, tx?: Prisma.TransactionClient): Promise<BusinessCalendar[]>;
  findBusinessCalendarByCode(instituteId: string, code: string, tx?: Prisma.TransactionClient): Promise<BusinessCalendar | null>;
  createBusinessCalendar(data: Prisma.BusinessCalendarUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<BusinessCalendar>;
  updateBusinessCalendar(id: string, data: Prisma.BusinessCalendarUncheckedUpdateInput, version: number, tx?: Prisma.TransactionClient): Promise<BusinessCalendar>;
  listBusinessCalendars(filters: { instituteId?: string; branchId?: string; year?: number; status?: CalendarStatus; q?: string }, tx?: Prisma.TransactionClient): Promise<BusinessCalendar[]>;

  findBranchOverrideById(id: string, tx?: Prisma.TransactionClient): Promise<BranchCalendarOverride | null>;
  findBranchOverrideByBranchAndYear(branchId: string, year: number, tx?: Prisma.TransactionClient): Promise<BranchCalendarOverride | null>;
  createBranchOverride(data: Prisma.BranchCalendarOverrideUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<BranchCalendarOverride>;
  updateBranchOverride(id: string, data: Prisma.BranchCalendarOverrideUncheckedUpdateInput, version: number, tx?: Prisma.TransactionClient): Promise<BranchCalendarOverride>;

  createHoliday(data: Prisma.HolidayUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<Holiday>;
  updateHoliday(id: string, data: Prisma.HolidayUncheckedUpdateInput, version: number, tx?: Prisma.TransactionClient): Promise<Holiday>;
  findHolidayById(id: string, tx?: Prisma.TransactionClient): Promise<Holiday | null>;
  listHolidays(filters: { businessCalendarId?: string; branchId?: string | null; branchCalendarOverrideId?: string | null; date?: Date }, tx?: Prisma.TransactionClient): Promise<Holiday[]>;

  resolveCalendar(branchId: string, date: Date, instituteId: string, tx?: Prisma.TransactionClient): Promise<ResolvedCalendar>;
}
