import { PrismaClient, Prisma } from '@prisma/client';
import { ICoursePricingRepository, ICourseDiscountRepository } from '../domain/repositories';
import { CoursePricing } from '../domain/course';
import { createUuid } from '@ims/shared-kernel';
import { randomUUID } from 'crypto';

export interface ResolvedDiscount {
  id: string;
  discountType: string;
  discountMode: string;
  discountValue: number;
  requiresApproval: boolean;
}

export interface ResolvedPricingResponse {
  courseId: string;
  resolvedBranchId?: string | null;
  customerType: string;
  batchType: string;
  basePrice: number;
  taxPercentage: number;
  isTaxExempt: boolean;
  taxExemptionReason?: string | null;
  taxExemptionCode?: string | null;
  currency: string;
  totalPrice: number;
  effectiveStartDate: string;
  applicableDiscounts: ResolvedDiscount[];
}

export function parseDateOnly(dateInput: string | Date): Date {
  if (dateInput instanceof Date) {
    return new Date(Date.UTC(dateInput.getUTCFullYear(), dateInput.getUTCMonth(), dateInput.getUTCDate()));
  }
  const parts = dateInput.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(Date.UTC(year, month, day));
}

export function getGstDateAtMidnight(date: Date = new Date()): Date {
  const gstOffset = 4 * 60 * 60 * 1000; // GST is UTC+4
  const gstTime = date.getTime() + gstOffset;
  const gstDate = new Date(gstTime);
  return new Date(Date.UTC(gstDate.getUTCFullYear(), gstDate.getUTCMonth(), gstDate.getUTCDate()));
}

export class CoursePricingService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly pricingRepository: ICoursePricingRepository,
    private readonly discountRepository: ICourseDiscountRepository
  ) {}

  async createPricingRule(input: any, actorId?: string, tx?: Prisma.TransactionClient) {
    const execute = async (activeClient: Prisma.TransactionClient) => {
      // Validate Course exists
      const courseExists = await activeClient.course.findFirst({
        where: { id: input.courseId, isDeleted: false },
      });
      if (!courseExists) {
        throw new Error('ERR_CRS_COURSE_NOT_FOUND');
      }

      // Normalize date boundaries
      const startDate = parseDateOnly(input.effectiveStartDate);
      const endDate = input.effectiveEndDate ? parseDateOnly(input.effectiveEndDate) : null;

      if (endDate && endDate <= startDate) {
        throw new Error('ERR_CRS_INVALID_DATE_RANGE');
      }

      // Tax Exemption Checks
      let taxPercentage = input.taxPercentage ?? 5.000;
      if (input.isTaxExempt) {
        if (!input.taxExemptionReason || !input.taxExemptionCode) {
          throw new Error('ERR_CRS_TAX_EXEMPTION_METADATA_REQUIRED');
        }
        taxPercentage = 0.000;
      }

      // Round basePrice to 3 decimals (Omani Rial standard)
      const basePrice = Math.round(input.basePrice * 1000) / 1000;

      // check pricing overlaps
      const overlaps = await this.pricingRepository.findOverlappingPricing(
        {
          courseId: input.courseId,
          branchId: input.branchId || null,
          batchId: input.batchId || null,
          customerType: input.customerType,
          batchType: input.batchType,
          currency: input.currency || 'OMR',
          startDate,
          endDate,
        },
        activeClient
      );

      for (const record of overlaps) {
        // Date Collision Block
        if (startDate <= new Date(record.effectiveStartDate)) {
          throw new Error('ERR_CRS_MULTIPLE_ACTIVE_PRICING');
        }
        
        // Sequential Deprecation / Superseding
        const previousEnd = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
        await this.pricingRepository.update(
          record.id,
          {
            status: 'Superseded',
            effectiveEndDate: previousEnd,
          },
          activeClient
        );

        // Log Audit of superseded pricing record
        await activeClient.auditLog.create({
          data: {
            id: createUuid(randomUUID()),
            module: 'CourseCatalog',
            performedBy: actorId || null,
            performedAt: new Date(),
            entityType: 'CoursePricing',
            entityId: record.id,
            action: 'Supersede',
            oldValue: { status: record.status, effectiveEndDate: record.effectiveEndDate },
            newValue: { status: 'Superseded', effectiveEndDate: previousEnd },
          },
        });
      }

      // Create new Pricing record
      const newPricing = await this.pricingRepository.create(
        {
          ...input,
          basePrice,
          taxPercentage,
          effectiveStartDate: startDate,
          effectiveEndDate: endDate,
          status: 'Active',
          createdBy: actorId,
        },
        activeClient
      );

      // Audit Log
      await activeClient.auditLog.create({
        data: {
          id: createUuid(randomUUID()),
          module: 'CourseCatalog',
          performedBy: actorId || null,
          performedAt: new Date(),
          entityType: 'CoursePricing',
          entityId: newPricing.id,
          action: 'Create',
          newValue: {
            courseId: newPricing.courseId,
            branchId: newPricing.branchId,
            customerType: newPricing.customerType,
            basePrice: Number(newPricing.basePrice),
          },
        },
      });

      // Outbox Event
      await activeClient.outboxEvent.create({
        data: {
          id: createUuid(randomUUID()),
          eventType: 'CoursePricingCreated',
          aggregateType: 'CoursePricing',
          aggregateId: newPricing.id,
          payload: {
            id: newPricing.id,
            courseId: newPricing.courseId,
            basePrice: Number(newPricing.basePrice),
          },
          status: 'Pending',
          availableAt: new Date(),
        },
      });

      return newPricing;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async resolveCoursePricing(
    filters: {
      courseId: string;
      branchId?: string | null;
      batchId?: string | null;
      customerType: string;
      batchType?: string;
      asOfDate?: Date | string;
    },
    tx?: Prisma.TransactionClient
  ): Promise<ResolvedPricingResponse> {
    const client = tx || this.prisma;

    // Normalise evaluation date to GST Midnight
    const evaluationDate = filters.asOfDate ? parseDateOnly(filters.asOfDate) : getGstDateAtMidnight();

    let resolvedBranchId = filters.branchId || null;
    let resolvedBatchType = filters.batchType || 'Regular';

    // If batchId is provided, resolve batch characteristics
    if (filters.batchId) {
      const batch = await client.batch.findUnique({
        where: { id: filters.batchId, isDeleted: false },
      });
      if (batch) {
        resolvedBatchType = batch.batchType || 'Regular';
        resolvedBranchId = batch.branchId;
      }
    }

    // Fetch all Active pricing configs for this course and sector
    const pricings = await this.pricingRepository.findAll(
      {
        courseId: filters.courseId,
        status: 'Active',
        activeAt: evaluationDate,
      },
      client
    );

    // Apply strict override priority resolution
    // P1: Match batchId override
    let matchingPricing = pricings.find(
      p => p.customerType === filters.customerType &&
           p.batchType === resolvedBatchType &&
           filters.batchId && p.batchId === filters.batchId
    );

    // P2: Match branchId override, batchId is null
    if (!matchingPricing) {
      matchingPricing = pricings.find(
        p => p.customerType === filters.customerType &&
             p.batchType === resolvedBatchType &&
             !p.batchId && resolvedBranchId && p.branchId === resolvedBranchId
      );
    }

    // P3: Global fallback, branchId and batchId are null
    if (!matchingPricing) {
      matchingPricing = pricings.find(
        p => p.customerType === filters.customerType &&
             p.batchType === resolvedBatchType &&
             !p.batchId && !p.branchId
      );
    }

    if (!matchingPricing) {
      throw new Error('ERR_CRS_PRICING_NOT_FOUND');
    }

    // Rounding and conversion to raw numbers
    const basePriceNum = Number(matchingPricing.basePrice);
    const taxPercentageNum = Number(matchingPricing.taxPercentage);
    const totalPrice = Math.round(basePriceNum * (1 + taxPercentageNum / 100) * 1000) / 1000;

    // Query active discounts
    const discounts = await this.discountRepository.findAll(
      {
        courseId: filters.courseId,
        status: 'Active',
        activeAt: evaluationDate,
      },
      client
    );

    // Filter discounts matching target segment and branch/batch scope context
    const segmentDiscounts = discounts.filter(d => {
      // 1. Customer segment match
      let segmentMatch = false;
      if (filters.customerType === 'Individual') {
        segmentMatch = d.discountType === 'Individual' || d.discountType === 'EarlyBird';
      } else if (filters.customerType === 'Corporate') {
        segmentMatch = d.discountType === 'Corporate';
      } else {
        segmentMatch = d.discountType === filters.customerType;
      }

      if (!segmentMatch) return false;

      // 2. Scope match
      if (d.batchId) {
        return !!filters.batchId && d.batchId === filters.batchId;
      }
      if (d.branchId) {
        return !!resolvedBranchId && d.branchId === resolvedBranchId;
      }
      return true;
    });

    // Resolve discount hierarchy by sorting by priority ascending: Global (0) -> Branch (1) -> Batch (2)
    const getDiscountPriority = (d: any) => {
      if (d.batchId) return 2;
      if (d.branchId) return 1;
      return 0;
    };

    const sortedDiscounts = [...segmentDiscounts].sort((a, b) => getDiscountPriority(a) - getDiscountPriority(b));

    const resolvedDiscountsMap = new Map<string, ResolvedDiscount>();
    for (const d of sortedDiscounts) {
      resolvedDiscountsMap.set(d.discountType, {
        id: d.id,
        discountType: d.discountType,
        discountMode: d.discountMode,
        discountValue: Number(d.discountValue),
        requiresApproval: d.requiresApproval,
      });
    }

    return {
      courseId: filters.courseId,
      resolvedBranchId,
      customerType: filters.customerType,
      batchType: resolvedBatchType,
      basePrice: basePriceNum,
      taxPercentage: taxPercentageNum,
      isTaxExempt: matchingPricing.isTaxExempt,
      taxExemptionReason: matchingPricing.taxExemptionReason,
      taxExemptionCode: matchingPricing.taxExemptionCode,
      currency: matchingPricing.currency,
      totalPrice,
      effectiveStartDate: matchingPricing.effectiveStartDate.toISOString().split('T')[0],
      applicableDiscounts: Array.from(resolvedDiscountsMap.values()),
    };
  }
}
