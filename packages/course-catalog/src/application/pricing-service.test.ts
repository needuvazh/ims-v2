import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoursePricingService, parseDateOnly, getGstDateAtMidnight } from './pricing-service';
import { Decimal } from '@prisma/client/runtime/library';

describe('Course Pricing Timezone Normalizations', () => {
  it('should parse date-only strings exactly as UTC midnight dates', () => {
    const d1 = parseDateOnly('2026-07-10');
    expect(d1.getUTCFullYear()).toBe(2026);
    expect(d1.getUTCMonth()).toBe(6); // July (0-indexed)
    expect(d1.getUTCDate()).toBe(10);
    expect(d1.getUTCHours()).toBe(0);
    expect(d1.getUTCMinutes()).toBe(0);
  });

  it('should resolve current GST Date at midnight correctly', () => {
    // July 10, 2026 at 02:00:00 UTC is July 10, 2026 at 06:00:00 GST
    const mockDate = new Date(Date.UTC(2026, 6, 10, 2, 0, 0));
    const gstMidnight = getGstDateAtMidnight(mockDate);
    expect(gstMidnight.getUTCFullYear()).toBe(2026);
    expect(gstMidnight.getUTCMonth()).toBe(6);
    expect(gstMidnight.getUTCDate()).toBe(10);
    expect(gstMidnight.getUTCHours()).toBe(0);
  });
});

describe('CoursePricingService rules & logic', () => {
  let mockPrisma: any;
  let mockPricingRepo: any;
  let mockDiscountRepo: any;
  let service: CoursePricingService;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn((cb) => cb(mockPrisma)),
      course: {
        findFirst: vi.fn().mockResolvedValue({ id: 'course-1', status: 'Draft' }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
      outboxEvent: {
        create: vi.fn().mockResolvedValue({}),
      },
    };

    mockPricingRepo = {
      create: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findOverlappingPricing: vi.fn().mockResolvedValue([]),
      findAll: vi.fn().mockResolvedValue([]),
    };

    mockDiscountRepo = {
      findAll: vi.fn().mockResolvedValue([]),
    };

    service = new CoursePricingService(mockPrisma, mockPricingRepo, mockDiscountRepo);
  });

  it('should validate tax exemption metadata when isTaxExempt is true', async () => {
    const input = {
      courseId: 'course-1',
      customerType: 'Individual',
      batchType: 'Regular',
      basePrice: 100,
      isTaxExempt: true,
      effectiveStartDate: '2026-07-10',
    };

    await expect(service.createPricingRule(input, 'user-1', mockPrisma)).rejects.toThrow(
      'ERR_CRS_TAX_EXEMPTION_METADATA_REQUIRED'
    );
  });

  it('should throw collision error if new pricing date is before or equal to existing start date', async () => {
    mockPricingRepo.findOverlappingPricing.mockResolvedValue([
      {
        id: 'pricing-1',
        effectiveStartDate: new Date(Date.UTC(2026, 6, 10)),
        status: 'Active',
      },
    ]);

    const input = {
      courseId: 'course-1',
      customerType: 'Individual',
      batchType: 'Regular',
      basePrice: 150,
      effectiveStartDate: '2026-07-10', // Collision (same date)
    };

    await expect(service.createPricingRule(input, 'user-1', mockPrisma)).rejects.toThrow(
      'ERR_CRS_MULTIPLE_ACTIVE_PRICING'
    );
  });

  it('should supersede existing record if new pricing date is strictly after existing start date', async () => {
    mockPricingRepo.findOverlappingPricing.mockResolvedValue([
      {
        id: 'pricing-1',
        effectiveStartDate: new Date(Date.UTC(2026, 6, 10)),
        status: 'Active',
      },
    ]);

    const input = {
      courseId: 'course-1',
      customerType: 'Individual',
      batchType: 'Regular',
      basePrice: 150,
      effectiveStartDate: '2026-07-15', // Starts July 15, after July 10
    };

    mockPricingRepo.create.mockResolvedValue({ id: 'pricing-2', basePrice: 150 });

    const result = await service.createPricingRule(input, 'user-1', mockPrisma);
    expect(result).toBeDefined();

    // The existing pricing should be updated with a superseded end date of July 14 (one day prior)
    expect(mockPricingRepo.update).toHaveBeenCalledWith(
      'pricing-1',
      {
        status: 'Superseded',
        effectiveEndDate: new Date(Date.UTC(2026, 6, 14)),
      },
      mockPrisma
    );
  });

  describe('resolveCoursePricing priority matching', () => {
    it('should resolve P1 (Batch) over P2 (Branch) over P3 (Global Default) pricing and discounts', async () => {
      // Setup batch record resolver
      mockPrisma.batch = {
        findUnique: vi.fn().mockResolvedValue({ id: 'batch-1', branchId: 'branch-1', batchType: 'Regular' }),
      };

      // Mock database pricing lists (P1 Batch, P2 Branch, P3 Global all active at once)
      mockPricingRepo.findAll.mockResolvedValue([
        {
          id: 'pricing-global',
          customerType: 'Individual',
          batchType: 'Regular',
          basePrice: new Decimal(100),
          taxPercentage: new Decimal(5),
          isTaxExempt: false,
          effectiveStartDate: new Date(Date.UTC(2026, 6, 1)),
          currency: 'OMR',
        },
        {
          id: 'pricing-branch',
          customerType: 'Individual',
          batchType: 'Regular',
          basePrice: new Decimal(120),
          taxPercentage: new Decimal(5),
          isTaxExempt: false,
          effectiveStartDate: new Date(Date.UTC(2026, 6, 1)),
          currency: 'OMR',
          branchId: 'branch-1',
        },
        {
          id: 'pricing-batch',
          customerType: 'Individual',
          batchType: 'Regular',
          basePrice: new Decimal(150),
          taxPercentage: new Decimal(5),
          isTaxExempt: false,
          effectiveStartDate: new Date(Date.UTC(2026, 6, 1)),
          currency: 'OMR',
          batchId: 'batch-1',
          branchId: 'branch-1',
        },
      ]);

      // Mock database discounts
      mockDiscountRepo.findAll.mockResolvedValue([
        {
          id: 'discount-global',
          discountType: 'Individual',
          discountMode: 'Percentage',
          discountValue: new Decimal(10),
          requiresApproval: false,
          effectiveStartDate: new Date(Date.UTC(2026, 6, 1)),
        },
        {
          id: 'discount-branch',
          discountType: 'Individual',
          discountMode: 'Percentage',
          discountValue: new Decimal(15),
          requiresApproval: false,
          effectiveStartDate: new Date(Date.UTC(2026, 6, 1)),
          branchId: 'branch-1',
        },
        {
          id: 'discount-batch',
          discountType: 'Individual',
          discountMode: 'Percentage',
          discountValue: new Decimal(20),
          requiresApproval: false,
          effectiveStartDate: new Date(Date.UTC(2026, 6, 1)),
          batchId: 'batch-1',
          branchId: 'branch-1',
        },
      ]);

      // 1. Resolve for Batch-1 -> Should match P1 (Batch level override)
      const resBatch = await service.resolveCoursePricing({
        courseId: 'course-1',
        customerType: 'Individual',
        batchId: 'batch-1',
        asOfDate: '2026-07-10',
      });
      expect(resBatch.basePrice).toBe(150);
      expect(resBatch.applicableDiscounts[0].discountValue).toBe(20);

      // 2. Resolve for Branch-1 with no batchId -> Should match P2 (Branch level override)
      const resBranch = await service.resolveCoursePricing({
        courseId: 'course-1',
        customerType: 'Individual',
        branchId: 'branch-1',
        asOfDate: '2026-07-10',
      });
      expect(resBranch.basePrice).toBe(120);
      expect(resBranch.applicableDiscounts[0].discountValue).toBe(15);

      // 3. Resolve for Global (no batch, no branch) -> Should match P3 (Global default fallback)
      const resGlobal = await service.resolveCoursePricing({
        courseId: 'course-1',
        customerType: 'Individual',
        asOfDate: '2026-07-10',
      });
      expect(resGlobal.basePrice).toBe(100);
      expect(resGlobal.applicableDiscounts[0].discountValue).toBe(10);
    });
  });
});
