import { describe, expect, it, vi } from 'vitest';
import { SchedulingService } from './scheduling-service';

const repository = {
  findBusinessCalendarById: vi.fn(),
  findOverlappingBusinessCalendars: vi.fn(),
  createBusinessCalendar: vi.fn(),
  updateBusinessCalendar: vi.fn(),
  findBranchOverrideByBranchAndYear: vi.fn(),
  createBranchOverride: vi.fn(),
  findBranchOverrideById: vi.fn(),
  updateBranchOverride: vi.fn(),
  createHoliday: vi.fn(),
  resolveCalendar: vi.fn(),
  listBusinessCalendars: vi.fn(),
  findActiveBusinessCalendarByInstitute: vi.fn(),
  findHolidayById: vi.fn(),
  listHolidays: vi.fn(),
};

const auditLogCreateMock = vi.fn();

function buildService() {
  const prisma = {
    auditLog: { create: auditLogCreateMock },
    outboxEvent: { create: vi.fn() },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback(prisma as never),
    ),
  } as never;

  return new SchedulingService(prisma as never, repository as never);
}

describe('SchedulingService', () => {
  it('allows sparse branch overrides without forcing a full operating-day payload', async () => {
    const service = buildService();
    repository.findBusinessCalendarById.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
    });
    repository.findBranchOverrideByBranchAndYear.mockResolvedValue(null);
    repository.createBranchOverride.mockResolvedValue({ id: 'override-1' });

    await service.createBranchOverride(
      {
        businessCalendarId: '11111111-1111-1111-1111-111111111111',
        branchId: '22222222-2222-2222-2222-222222222222',
        year: 2026,
        effectiveStartDate: new Date('2026-01-01'),
        status: 'Draft',
        operatingDays: [],
      },
      { actorId: '33333333-3333-3333-3333-333333333333' },
    );

    expect(repository.createBranchOverride).toHaveBeenCalledWith(
      expect.objectContaining({ operatingDays: undefined }),
    );
    expect(auditLogCreateMock).toHaveBeenCalled();
  });

  it('rejects branch overrides outside the active branch scope', async () => {
    const service = buildService();
    repository.findBusinessCalendarById.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
    });
    repository.findBranchOverrideByBranchAndYear.mockResolvedValue(null);

    await expect(
      service.createBranchOverride(
        {
          businessCalendarId: '11111111-1111-1111-1111-111111111111',
          branchId: '22222222-2222-2222-2222-222222222222',
          year: 2026,
          effectiveStartDate: new Date('2026-01-01'),
          status: 'Draft',
          operatingDays: [],
        },
        { branchId: '33333333-3333-3333-3333-333333333333' },
      ),
    ).rejects.toMatchObject({ code: 'branch_scope_violation' });
  });
});
