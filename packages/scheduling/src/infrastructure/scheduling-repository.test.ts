import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { PrismaSchedulingRepository } from './scheduling-repository';

describe('PrismaSchedulingRepository.resolveCalendar', () => {
  it('falls back to a default weekly calendar when no institute calendar exists', async () => {
    const prisma = {
      businessCalendar: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      branchCalendarOverride: {
        findFirst: vi.fn(),
      },
      holiday: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaClient;

    const repository = new PrismaSchedulingRepository(prisma);
    const result = await repository.resolveCalendar(
      '44444444-4444-4444-4444-444444444444',
      new Date('2026-07-11'),
      '22222222-2222-2222-2222-222222222222',
    );

    expect(result.source).toBe('system-default');
    expect(result.resolvedOperatingDays).toHaveLength(7);
    expect(result.resolvedOperatingDays.every((day) => day.isOpen)).toBe(true);
    expect(result.resolvedOperatingDays[0].workingHours[0]).toEqual({
      id: expect.any(String),
      operatingDayId: expect.any(String),
      startTime: '00:00',
      endTime: '23:59',
    });
  });

  it('merges branch overrides into institute working hours and returns holidays', async () => {
    const prisma = {
      businessCalendar: {
        findFirst: vi.fn().mockResolvedValue({
          id: '11111111-1111-1111-1111-111111111111',
          instituteId: '22222222-2222-2222-2222-222222222222',
          code: 'ASTI-2026',
          name: 'Academic Calendar 2026',
          nameLocalized: {
            en: 'Academic Calendar 2026',
            ar: 'التقويم الأكاديمي 2026',
          },
          year: 2026,
          countryCode: 'OM',
          timezone: 'Asia/Muscat',
          effectiveStartDate: new Date('2026-01-01'),
          effectiveEndDate: null,
          status: 'Active',
          isActive: true,
          version: 1,
          operatingDays: [
            {
              id: 'day-1',
              businessCalendarId: '11111111-1111-1111-1111-111111111111',
              dayOfWeek: 'MONDAY',
              isOpen: true,
              workingHours: [
                {
                  id: 'wh-1',
                  operatingDayId: 'day-1',
                  startTime: '08:00',
                  endTime: '12:00',
                },
              ],
            },
            {
              id: 'day-2',
              businessCalendarId: '11111111-1111-1111-1111-111111111111',
              dayOfWeek: 'TUESDAY',
              isOpen: true,
              workingHours: [
                {
                  id: 'wh-2',
                  operatingDayId: 'day-2',
                  startTime: '08:00',
                  endTime: '12:00',
                },
              ],
            },
            {
              id: 'day-3',
              businessCalendarId: '11111111-1111-1111-1111-111111111111',
              dayOfWeek: 'WEDNESDAY',
              isOpen: true,
              workingHours: [
                {
                  id: 'wh-3',
                  operatingDayId: 'day-3',
                  startTime: '08:00',
                  endTime: '12:00',
                },
              ],
            },
            {
              id: 'day-4',
              businessCalendarId: '11111111-1111-1111-1111-111111111111',
              dayOfWeek: 'THURSDAY',
              isOpen: true,
              workingHours: [
                {
                  id: 'wh-4',
                  operatingDayId: 'day-4',
                  startTime: '08:00',
                  endTime: '12:00',
                },
              ],
            },
            {
              id: 'day-5',
              businessCalendarId: '11111111-1111-1111-1111-111111111111',
              dayOfWeek: 'FRIDAY',
              isOpen: false,
              workingHours: [],
            },
            {
              id: 'day-6',
              businessCalendarId: '11111111-1111-1111-1111-111111111111',
              dayOfWeek: 'SATURDAY',
              isOpen: false,
              workingHours: [],
            },
            {
              id: 'day-7',
              businessCalendarId: '11111111-1111-1111-1111-111111111111',
              dayOfWeek: 'SUNDAY',
              isOpen: false,
              workingHours: [],
            },
          ],
          createdAt: new Date('2025-12-01'),
          createdBy: null,
          updatedAt: null,
          updatedBy: null,
          deletedAt: null,
          deletedBy: null,
          isDeleted: false,
        }),
      },
      branchCalendarOverride: {
        findFirst: vi.fn().mockResolvedValue({
          id: '33333333-3333-3333-3333-333333333333',
          businessCalendarId: '11111111-1111-1111-1111-111111111111',
          branchId: '44444444-4444-4444-4444-444444444444',
          year: 2026,
          name: null,
          nameLocalized: null,
          effectiveStartDate: new Date('2026-01-01'),
          effectiveEndDate: null,
          status: 'Active',
          notes: null,
          version: 1,
          operatingDays: [
            {
              id: 'ov-1',
              branchCalendarOverrideId: '33333333-3333-3333-3333-333333333333',
              dayOfWeek: 'MONDAY',
              isOpen: true,
              workingHours: [
                {
                  id: 'ov-wh-1',
                  operatingDayId: 'ov-1',
                  startTime: '10:00',
                  endTime: '14:00',
                },
              ],
            },
          ],
          createdAt: new Date('2025-12-02'),
          createdBy: null,
          updatedAt: null,
          updatedBy: null,
          deletedAt: null,
          deletedBy: null,
          isDeleted: false,
        }),
      },
      holiday: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: '55555555-5555-5555-5555-555555555555',
            businessCalendarId: '11111111-1111-1111-1111-111111111111',
            branchCalendarOverrideId: null,
            branchId: null,
            date: new Date('2026-01-01'),
            name: 'New Year',
            nameLocalized: { en: 'New Year', ar: 'رأس السنة' },
            holidayType: 'PublicHoliday',
            affectsScheduling: true,
            status: 'Active',
            description: null,
            overridePolicy: 'MANAGER_APPROVAL_ALLOWED',
            version: 1,
            createdAt: new Date('2025-12-01'),
            createdBy: null,
            updatedAt: null,
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
            isDeleted: false,
          },
        ]),
      },
    } as unknown as PrismaClient;

    const repository = new PrismaSchedulingRepository(prisma);
    const result = await repository.resolveCalendar(
      '44444444-4444-4444-4444-444444444444',
      new Date('2026-01-01'),
      '22222222-2222-2222-2222-222222222222',
    );

    expect(result.source).toBe('branch-override');
    expect(result.holidays).toHaveLength(1);
    expect(
      result.resolvedOperatingDays.find((day) => day.dayOfWeek === 'MONDAY')
        ?.workingHours[0]?.startTime,
    ).toBe('10:00');
    expect(
      result.resolvedOperatingDays.find((day) => day.dayOfWeek === 'TUESDAY')
        ?.workingHours[0]?.startTime,
    ).toBe('08:00');
  });
});
