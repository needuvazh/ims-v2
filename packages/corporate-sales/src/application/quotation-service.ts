import { PrismaClient, Prisma } from "@prisma/client";
import { DomainError } from "@ims/shared-kernel";
import {
  CreateQuotationInput,
  ConfigureCostingSheetInput,
} from "../domain/schemas";
import { CostingBreakdown } from "../domain/types";

export class QuotationService {
  constructor(private readonly prisma: PrismaClient) {}

  private calculateMargin(sellingPrice: number, totalCost: number): number {
    if (sellingPrice <= 0) return 0;
    return Number((((sellingPrice - totalCost) / sellingPrice) * 100).toFixed(2));
  }

  async createQuotation(input: CreateQuotationInput, actorId: string | null = null) {
    if (input.validUntil.getTime() < input.quotationDate.getTime()) {
      throw new DomainError("invalid_value", "Validity date cannot be before quotation date", {
        errorCode: "ERR_CSQ_INVALID_DATE_RANGE",
      });
    }

    // Generate Quotation Number
    const count = await this.prisma.quotation.count();
    const quotationNumber = `QTN-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, "0")}`;

    return await this.prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let taxAmount = 0;
      let totalAmount = 0;

      const createdItems = [];

      for (const item of input.lineItems) {
        const lineTotal = item.quantity * item.unitPrice;
        const lineTax = Number((lineTotal * 0.05).toFixed(3)); // 5% VAT
        const lineFinal = lineTotal + lineTax;

        subtotal += lineTotal;
        taxAmount += lineTax;
        totalAmount += lineFinal;

        createdItems.push({
          courseId: item.courseId,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(item.unitPrice),
          discountAmount: new Prisma.Decimal(0),
          taxAmount: new Prisma.Decimal(lineTax),
          lineTotal: new Prisma.Decimal(lineFinal),
          createdBy: actorId,
        });
      }

      const quote = await tx.quotation.create({
        data: {
          quotationNumber,
          corporateAccountId: input.corporateAccountId,
          corporateSalesLeadId: input.corporateSalesLeadId,
          quotationDate: input.quotationDate,
          validUntil: input.validUntil,
          subtotal: new Prisma.Decimal(subtotal),
          discountAmount: new Prisma.Decimal(0),
          taxAmount: new Prisma.Decimal(taxAmount),
          totalAmount: new Prisma.Decimal(totalAmount),
          status: "Draft",
          branchId: input.branchId,
          corporateMarketingVisitId: input.corporateMarketingVisitId || null,
          createdBy: actorId,
        },
      });

      for (const line of createdItems) {
        await tx.quotationLineItem.create({
          data: {
            ...line,
            quotationId: quote.id,
          },
        });
      }

      return await tx.quotation.findUnique({
        where: { id: quote.id },
        include: { lineItems: true },
      });
    });
  }

  async configureCostingSheet(input: ConfigureCostingSheetInput, actorId: string | null = null) {
    const quote = await this.prisma.quotation.findUnique({
      where: { id: input.quotationId },
      include: { costingSheet: true },
    });

    if (!quote || quote.isDeleted) {
      throw new DomainError("not_found", "Quotation not found", {
        errorCode: "ERR_CSQ_NOT_FOUND",
      });
    }

    if (["SubmittedForApproval", "Approved", "Sent", "Accepted"].includes(quote.status)) {
      throw new DomainError("conflict", "Quotation is locked and cannot be modified", {
        errorCode: "ERR_CSQ_QUOTE_LOCKED",
      });
    }

    const totalDirectCost =
      input.directCosts && input.directCosts.length > 0
        ? input.directCosts.reduce((sum, item) => sum + item.amount, 0)
        : (input.trainerCost +
          input.venueCost +
          input.equipmentCost +
          input.printingCost +
          input.certificateCost +
          input.travelCost +
          input.accommodationCost +
          input.foodCost +
          input.vehicleCost);

    const totalIndirectCost = input.administrationCost + input.marketingCost + input.miscellaneousCost;
    const totalCost = totalDirectCost + totalIndirectCost;
    const profitAmount = input.sellingPrice - totalCost;
    const profitPercentage = this.calculateMargin(input.sellingPrice, totalCost);

    return await this.prisma.$transaction(async (tx) => {
      // If costing sheet exists, update it. Otherwise, create it.
      const sheetData = {
        trainerCost: new Prisma.Decimal(input.trainerCost),
        venueCost: new Prisma.Decimal(input.venueCost),
        equipmentCost: new Prisma.Decimal(input.equipmentCost),
        printingCost: new Prisma.Decimal(input.printingCost),
        certificateCost: new Prisma.Decimal(input.certificateCost),
        travelCost: new Prisma.Decimal(input.travelCost),
        accommodationCost: new Prisma.Decimal(input.accommodationCost),
        foodCost: new Prisma.Decimal(input.foodCost),
        vehicleCost: new Prisma.Decimal(input.vehicleCost),
        administrationCost: new Prisma.Decimal(input.administrationCost),
        marketingCost: new Prisma.Decimal(input.marketingCost),
        miscellaneousCost: new Prisma.Decimal(input.miscellaneousCost),
        totalDirectCost: new Prisma.Decimal(totalDirectCost),
        totalIndirectCost: new Prisma.Decimal(totalIndirectCost),
        totalCost: new Prisma.Decimal(totalCost),
        sellingPrice: new Prisma.Decimal(input.sellingPrice),
        profitAmount: new Prisma.Decimal(profitAmount),
        profitPercentage: new Prisma.Decimal(profitPercentage),
        status: "Completed",
        updatedBy: actorId,
      };

      let costingSheetId: string;

      if (quote.costingSheet) {
        await tx.quotationCostingSheet.update({
          where: { quotationId: quote.id },
          data: sheetData,
        });
        costingSheetId = quote.costingSheet.id;

        // Delete old direct cost items
        await tx.quotationDirectCostItem.deleteMany({
          where: { costingSheetId: costingSheetId },
        });
      } else {
        const newSheet = await tx.quotationCostingSheet.create({
          data: {
            ...sheetData,
            quotationId: quote.id,
            createdBy: actorId,
          },
        });
        costingSheetId = newSheet.id;
      }

      // Insert new direct cost items
      if (input.directCosts && input.directCosts.length > 0) {
        await tx.quotationDirectCostItem.createMany({
          data: input.directCosts.map((item) => ({
            costingSheetId: costingSheetId,
            costElementId: item.costElementId,
            amount: new Prisma.Decimal(item.amount),
          })),
        });
      }

      // Update Quotation subtotal/totals to match costing selling price
      const costingTax = Number((input.sellingPrice * 0.05).toFixed(3));
      const costingFinal = input.sellingPrice + costingTax;

      await tx.quotation.update({
        where: { id: quote.id },
        data: {
          subtotal: new Prisma.Decimal(input.sellingPrice),
          taxAmount: new Prisma.Decimal(costingTax),
          totalAmount: new Prisma.Decimal(costingFinal),
          version: { increment: 1 },
        },
      });

      return await tx.quotation.findUnique({
        where: { id: quote.id },
        include: { costingSheet: true },
      });
    });
  }

  async submitForApproval(quotationId: string, actorId: string | null = null) {
    const quote = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { costingSheet: true },
    });

    if (!quote || quote.isDeleted) {
      throw new DomainError("not_found", "Quotation not found", {
        errorCode: "ERR_CSQ_NOT_FOUND",
      });
    }

    if (!quote.costingSheet) {
      throw new DomainError("precondition_failed", "Cannot submit quotation without costing sheet configurations", {
        errorCode: "ERR_CSQ_QUOTE_LOCKED",
      });
    }

    return await this.prisma.quotation.update({
      where: { id: quotationId },
      data: {
        status: "SubmittedForApproval",
        version: { increment: 1 },
        updatedBy: actorId,
      },
    });
  }

  async approveQuotation(quotationId: string, actorId: string, remarks?: string) {
    const quote = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!quote || quote.isDeleted) {
      throw new DomainError("not_found", "Quotation not found", {
        errorCode: "ERR_CSQ_NOT_FOUND",
      });
    }

    if (quote.status !== "SubmittedForApproval") {
      throw new DomainError("conflict", "Quotation is not in a pending approval state", {
        errorCode: "ERR_CSQ_QUOTE_LOCKED",
      });
    }

    return await this.prisma.quotation.update({
      where: { id: quotationId },
      data: {
        status: "Approved",
        approvedBy: actorId,
        approvedAt: new Date(),
        version: { increment: 1 },
        updatedBy: actorId,
      },
    });
  }

  async rejectQuotation(quotationId: string, actorId: string, remarks?: string) {
    const quote = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!quote || quote.isDeleted) {
      throw new DomainError("not_found", "Quotation not found", {
        errorCode: "ERR_CSQ_NOT_FOUND",
      });
    }

    if (quote.status !== "SubmittedForApproval") {
      throw new DomainError("conflict", "Quotation is not in a pending approval state", {
        errorCode: "ERR_CSQ_QUOTE_LOCKED",
      });
    }

    return await this.prisma.quotation.update({
      where: { id: quotationId },
      data: {
        status: "Rejected",
        version: { increment: 1 },
        updatedBy: actorId,
      },
    });
  }

  async createRevision(quotationId: string, input: CreateQuotationInput, reason: string, actorId: string) {
    const quote = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { lineItems: true, costingSheet: true },
    });

    if (!quote || quote.isDeleted) {
      throw new DomainError("not_found", "Quotation not found", {
        errorCode: "ERR_CSQ_NOT_FOUND",
      });
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Record snapshot revision
      const revisionCount = await tx.quotationRevision.count({
        where: { quotationId: quote.id },
      });

      await tx.quotationRevision.create({
        data: {
          quotationId: quote.id,
          revisionNumber: revisionCount + 1,
          snapshotJson: JSON.parse(JSON.stringify(quote)),
          revisionReason: reason,
          revisedBy: actorId,
        },
      });

      // 2. Remove old line items
      await tx.quotationLineItem.deleteMany({
        where: { quotationId: quote.id },
      });

      // 3. Insert new line items
      let subtotal = 0;
      let taxAmount = 0;
      let totalAmount = 0;

      for (const item of input.lineItems) {
        const lineTotal = item.quantity * item.unitPrice;
        const lineTax = Number((lineTotal * 0.05).toFixed(3));
        const lineFinal = lineTotal + lineTax;

        subtotal += lineTotal;
        taxAmount += lineTax;
        totalAmount += lineFinal;

        await tx.quotationLineItem.create({
          data: {
            quotationId: quote.id,
            courseId: item.courseId,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            discountAmount: new Prisma.Decimal(0),
            taxAmount: new Prisma.Decimal(lineTax),
            lineTotal: new Prisma.Decimal(lineFinal),
            createdBy: actorId,
          },
        });
      }

      // 4. Update quote metadata, resetting status to Draft
      await tx.quotation.update({
        where: { id: quote.id },
        data: {
          subtotal: new Prisma.Decimal(subtotal),
          taxAmount: new Prisma.Decimal(taxAmount),
          totalAmount: new Prisma.Decimal(totalAmount),
          status: "Draft",
          version: { increment: 1 },
          updatedBy: actorId,
        },
      });

      // 5. Delete costing sheet since quote values have changed
      if (quote.costingSheet) {
        await tx.quotationCostingSheet.delete({
          where: { quotationId: quote.id },
        });
      }

      return await tx.quotation.findUnique({
        where: { id: quote.id },
        include: { lineItems: true, costingSheet: true },
      });
    });
  }

  async getQuotations(branchId?: string) {
    return await this.prisma.quotation.findMany({
      where: {
        branchId: branchId ? branchId : undefined,
        isDeleted: false,
      },
      include: {
        corporateAccount: true,
        costingSheet: true,
        revisions: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getQuotationDetails(quotationId: string) {
    const quote = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        corporateAccount: true,
        costingSheet: {
          include: {
            directCosts: {
              include: {
                costElement: true,
              },
            },
          },
        },
        lineItems: { include: { course: true } },
        revisions: true,
        salesOrders: { where: { isDeleted: false } },
      },
    });

    if (!quote || quote.isDeleted) {
      throw new DomainError("not_found", "Quotation not found", {
        errorCode: "ERR_CSQ_NOT_FOUND",
      });
    }

    return quote;
  }

  async getDirectCostElements() {
    return await this.prisma.directCostElementMaster.findMany({
      orderBy: { name: "asc" },
    });
  }

  async createDirectCostElement(input: { name: string; status?: string }, actorId: string | null = null) {
    const existing = await this.prisma.directCostElementMaster.findUnique({
      where: { name: input.name },
    });

    if (existing) {
      throw new DomainError("conflict", "A cost element with this name already exists", {
        errorCode: "ERR_CSQ_DUPLICATE_COST_ELEMENT",
      });
    }

    return await this.prisma.directCostElementMaster.create({
      data: {
        name: input.name,
        status: input.status || "Active",
        createdBy: actorId,
      },
    });
  }

  async updateDirectCostElement(
    input: { id: string; name: string; status: string },
    actorId: string | null = null
  ) {
    const element = await this.prisma.directCostElementMaster.findUnique({
      where: { id: input.id },
    });

    if (!element) {
      throw new DomainError("not_found", "Cost element not found", {
        errorCode: "ERR_CSQ_NOT_FOUND",
      });
    }

    // Check duplicate name for other elements
    const dup = await this.prisma.directCostElementMaster.findFirst({
      where: {
        name: input.name,
        id: { not: input.id },
      },
    });

    if (dup) {
      throw new DomainError("conflict", "Another cost element with this name already exists", {
        errorCode: "ERR_CSQ_DUPLICATE_COST_ELEMENT",
      });
    }

    return await this.prisma.directCostElementMaster.update({
      where: { id: input.id },
      data: {
        name: input.name,
        status: input.status,
        updatedBy: actorId,
      },
    });
  }

  async deleteDirectCostElement(id: string, actorId: string | null = null) {
    // Check if referenced
    const referenced = await this.prisma.quotationDirectCostItem.findFirst({
      where: { costElementId: id },
    });

    if (referenced) {
      // Toggle status to Inactive instead of deleting
      return await this.prisma.directCostElementMaster.update({
        where: { id },
        data: {
          status: "Inactive",
          updatedBy: actorId,
        },
      });
    }

    return await this.prisma.directCostElementMaster.delete({
      where: { id },
    });
  }

  async cancelQuotation(quotationId: string, actorId: string | null = null) {
    const quote = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { salesOrders: { where: { isDeleted: false } } },
    });

    if (!quote || quote.isDeleted) {
      throw new DomainError("not_found", "Quotation not found", {
        errorCode: "ERR_CSQ_NOT_FOUND",
      });
    }

    if (quote.salesOrders.length > 0) {
      throw new DomainError("conflict", "Cannot cancel a quotation that has already been converted to a Sales Order", {
        errorCode: "ERR_CSQ_QUOTE_LOCKED",
      });
    }

    return await this.prisma.quotation.update({
      where: { id: quotationId },
      data: {
        status: "Cancelled",
        version: { increment: 1 },
        updatedBy: actorId,
      },
    });
  }
}
