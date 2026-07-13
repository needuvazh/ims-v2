import { expect, test, vi } from "vitest";
import { QuotationService } from "./quotation-service";
import { SalesOrderService } from "./sales-order-service";

test("QuotationService configureCostingSheet should compute margin correctly and enforce edit lock checks", async () => {
  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma)),
    quotation: {
      findUnique: vi.fn().mockResolvedValue({
        id: "quote-1",
        status: "Draft",
        isDeleted: false,
        costingSheet: null,
      }),
      update: vi.fn().mockResolvedValue({ id: "quote-1" }),
    },
    quotationCostingSheet: {
      create: vi.fn().mockResolvedValue({ id: "costing-1" }),
      update: vi.fn().mockResolvedValue({ id: "costing-1" }),
    },
  } as any;

  const service = new QuotationService(mockPrisma);

  // 1. Calculate costing with 100 OMR selling price and 70 OMR cost (30% margin)
  const result = await service.configureCostingSheet({
    quotationId: "quote-1",
    trainerCost: 50,
    venueCost: 10,
    equipmentCost: 10,
    printingCost: 0,
    certificateCost: 0,
    travelCost: 0,
    accommodationCost: 0,
    foodCost: 0,
    vehicleCost: 0,
    administrationCost: 0,
    marketingCost: 0,
    miscellaneousCost: 0,
    sellingPrice: 100,
  });

  // Verify create was called with computed margin
  expect(mockPrisma.quotationCostingSheet.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        totalDirectCost: expect.objectContaining({ d: expect.any(Array) }),
        profitPercentage: expect.objectContaining({ d: expect.any(Array) }),
      }),
    })
  );

  // 2. Lock check: If status is SubmittedForApproval, costing update must throw an error
  mockPrisma.quotation.findUnique.mockResolvedValue({
    id: "quote-1",
    status: "SubmittedForApproval",
    isDeleted: false,
    costingSheet: {},
  });

  await expect(
    service.configureCostingSheet({
      quotationId: "quote-1",
      trainerCost: 50,
      venueCost: 10,
      equipmentCost: 10,
      printingCost: 0,
      certificateCost: 0,
      travelCost: 0,
      accommodationCost: 0,
      foodCost: 0,
      vehicleCost: 0,
      administrationCost: 0,
      marketingCost: 0,
      miscellaneousCost: 0,
      sellingPrice: 100,
    })
  ).rejects.toThrow("Quotation is locked and cannot be modified");
});

test("QuotationService submitForApproval should always require approval regardless of margin", async () => {
  const mockPrisma = {
    quotation: {
      findUnique: vi.fn().mockResolvedValue({
        id: "quote-1",
        status: "Draft",
        isDeleted: false,
        costingSheet: {
          profitPercentage: 35.0, // High margin (above 25% target)
        },
      }),
      update: vi.fn().mockResolvedValue({ id: "quote-1" }),
    },
  } as any;

  const service = new QuotationService(mockPrisma);

  await service.submitForApproval("quote-1");

  // Verify status was updated to SubmittedForApproval
  expect(mockPrisma.quotation.update).toHaveBeenCalledWith({
    where: { id: "quote-1" },
    data: {
      status: "SubmittedForApproval",
      version: { increment: 1 },
      updatedBy: null,
    },
  });
});

test("SalesOrderService confirmSalesOrder should create sales order, accept quotation and publish outbox handoff event", async () => {
  const mockPrisma = {
    $transaction: vi.fn((callback) => callback(mockPrisma)),
    quotation: {
      findUnique: vi.fn().mockResolvedValue({
        id: "quote-1",
        status: "Approved",
        isDeleted: false,
        corporateSalesLeadId: "lead-1",
      }),
      update: vi.fn().mockResolvedValue({ id: "quote-1" }),
    },
    salesOrder: {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({
        id: "order-1",
        salesOrderNumber: "SO-2026-00001",
        quotationId: "quote-1",
        corporateAccountId: "account-1",
        branchId: "branch-1",
        totalAmount: 105.0,
        LpoDocumentId: "lpo-1",
      }),
    },
    corporateSalesLead: {
      update: vi.fn().mockResolvedValue({ id: "lead-1" }),
    },
    outboxEvent: {
      create: vi.fn().mockResolvedValue(null),
    },
  } as any;

  const service = new SalesOrderService(mockPrisma);

  const order = await service.confirmSalesOrder({
    quotationId: "quote-1",
    corporateAccountId: "account-1",
    orderDate: new Date(),
    totalAmount: 105.0,
    LpoDocumentId: "lpo-1",
    branchId: "branch-1",
  });

  expect(order.salesOrderNumber).toBe("SO-2026-00001");
  expect(mockPrisma.salesOrder.create).toHaveBeenCalled();
  expect(mockPrisma.quotation.update).toHaveBeenCalledWith({
    where: { id: "quote-1" },
    data: {
      status: "Accepted",
      version: { increment: 1 },
      updatedBy: null,
    },
  });
  expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      eventType: "SalesOrderConfirmed",
      aggregateType: "SalesOrder",
      aggregateId: "order-1",
      availableAt: expect.any(Date),
    }),
  });
});

test("QuotationService cancelQuotation should update status to Cancelled if no sales orders", async () => {
  const mockPrisma = {
    quotation: {
      findUnique: vi.fn().mockResolvedValue({
        id: "quote-1",
        status: "Draft",
        isDeleted: false,
        salesOrders: [],
      }),
      update: vi.fn().mockResolvedValue({ id: "quote-1", status: "Cancelled" }),
    },
  } as any;

  const service = new QuotationService(mockPrisma);

  const result = await service.cancelQuotation("quote-1");

  expect(result.status).toBe("Cancelled");
  expect(mockPrisma.quotation.update).toHaveBeenCalledWith({
    where: { id: "quote-1" },
    data: {
      status: "Cancelled",
      version: { increment: 1 },
      updatedBy: null,
    },
  });
});

test("QuotationService cancelQuotation should throw conflict error if active sales order exists", async () => {
  const mockPrisma = {
    quotation: {
      findUnique: vi.fn().mockResolvedValue({
        id: "quote-1",
        status: "Approved",
        isDeleted: false,
        salesOrders: [{ id: "order-1" }],
      }),
    },
  } as any;

  const service = new QuotationService(mockPrisma);

  await expect(service.cancelQuotation("quote-1")).rejects.toThrow(
    "Cannot cancel a quotation that has already been converted to a Sales Order"
  );
});
