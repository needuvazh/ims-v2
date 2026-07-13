import { PrismaClient, Prisma } from "@prisma/client";
import { DomainError } from "@ims/shared-kernel";
import { ConfirmSalesOrderInput } from "../domain/schemas";

export class SalesOrderService {
  constructor(private readonly prisma: PrismaClient) {}

  async confirmSalesOrder(input: ConfirmSalesOrderInput, actorId: string | null = null) {
    const quote = await this.prisma.quotation.findUnique({
      where: { id: input.quotationId },
    });

    if (!quote || quote.isDeleted) {
      throw new DomainError("not_found", "Quotation not found", {
        errorCode: "ERR_CSQ_NOT_FOUND",
      });
    }

    if (!["Approved", "Sent"].includes(quote.status)) {
      throw new DomainError("conflict", "Quotation must be Approved or Sent before confirming a sales order", {
        errorCode: "ERR_CSQ_QUOTE_LOCKED",
      });
    }

    // Generate Sales Order Number
    const count = await this.prisma.salesOrder.count();
    const salesOrderNumber = `SO-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, "0")}`;

    return await this.prisma.$transaction(async (tx) => {
      // 1. Create Sales Order
      const order = await tx.salesOrder.create({
        data: {
          salesOrderNumber,
          quotationId: input.quotationId,
          corporateAccountId: input.corporateAccountId,
          orderDate: input.orderDate,
          totalAmount: new Prisma.Decimal(input.totalAmount),
          status: "Confirmed",
          LpoDocumentId: input.LpoDocumentId,
          branchId: input.branchId,
          createdBy: actorId,
        },
      });

      // 2. Update Quotation Status to Accepted
      await tx.quotation.update({
        where: { id: input.quotationId },
        data: {
          status: "Accepted",
          version: { increment: 1 },
          updatedBy: actorId,
        },
      });

      // 3. Update Sales Lead stage to Confirmed
      await tx.corporateSalesLead.update({
        where: { id: quote.corporateSalesLeadId },
        data: {
          stage: "Confirmed",
          version: { increment: 1 },
          updatedBy: actorId,
        },
      });

      // 4. Publish transactional outbox event
      await tx.outboxEvent.create({
        data: {
          eventType: "SalesOrderConfirmed",
          aggregateType: "SalesOrder",
          aggregateId: order.id,
          payload: {
            salesOrderId: order.id,
            salesOrderNumber: order.salesOrderNumber,
            quotationId: order.quotationId,
            corporateAccountId: order.corporateAccountId,
            branchId: order.branchId,
            totalAmount: Number(order.totalAmount),
            LpoDocumentId: order.LpoDocumentId,
          },
          availableAt: new Date(),
        },
      });

      return order;
    });
  }

  async getOrders(branchId?: string) {
    return await this.prisma.salesOrder.findMany({
      where: {
        branchId: branchId ? branchId : undefined,
        isDeleted: false,
      },
      include: {
        corporateAccount: true,
        quotation: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getOrderDetails(orderId: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id: orderId },
      include: {
        corporateAccount: true,
        quotation: {
          include: {
            lineItems: { include: { course: true } },
            costingSheet: true,
          },
        },
      },
    });

    if (!order || order.isDeleted) {
      throw new DomainError("not_found", "Sales Order not found", {
        errorCode: "ERR_CSQ_NOT_FOUND",
      });
    }

    return order;
  }
}
