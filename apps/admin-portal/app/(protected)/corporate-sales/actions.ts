"use server";

import { revalidatePath } from "next/cache";
import {
  corporateSalesService,
  quotationService,
  salesOrderService,
} from "../../lib/runtime";
import {
  CreateCorporateSalesLeadSchema,
  LogMarketingVisitSchema,
  CreateFollowUpSchema,
  CreateQuotationSchema,
  ConfigureCostingSheetSchema,
  ConfirmSalesOrderSchema,
} from "@ims/corporate-sales";

import { prisma } from "@ims/database";
import { Prisma } from "@prisma/client";

export async function createLeadAction(payload: any, actorId: string) {
  const parsed = CreateCorporateSalesLeadSchema.parse(payload);
  const lead = await corporateSalesService.createCorporateSalesLead(parsed, actorId);
  revalidatePath("/corporate-sales/leads");
  return JSON.parse(JSON.stringify(lead));
}

export async function createCorporateAccountAndLeadAction(payload: any, actorId: string) {
  const institute = await prisma.institute.findFirst();
  const organizationId = institute ? institute.id : "00000000-0000-0000-0000-000000000000";

  return await prisma.$transaction(async (tx) => {
    let finalAccountId = payload.corporateAccountId;
    if (!finalAccountId) {
      const newAccount = await tx.corporateAccount.create({
        data: {
          organizationId,
          accountName: payload.newAccountName,
          accountCode: payload.newAccountCode || `ACC-${Date.now()}`,
          creditLimit: 5000.0,
          branchId: payload.branchId,
          createdBy: actorId,
        },
      });
      finalAccountId = newAccount.id;
    }

    const lead = await tx.corporateSalesLead.create({
      data: {
        corporateAccountId: finalAccountId,
        salesOwnerId: payload.salesOwnerId || actorId, // Map assigned executive
        branchId: payload.branchId,
        stage: "New",
        expectedValue: new Prisma.Decimal(payload.expectedValue),
        expectedCloseDate: new Date(payload.expectedCloseDate),
        createdBy: actorId,
      },
    });

    revalidatePath("/corporate-sales/leads");
    return JSON.parse(JSON.stringify(lead));
  });
}

export async function updateLeadAction(id: string, payload: any, actorId: string) {
  const lead = await prisma.corporateSalesLead.update({
    where: { id },
    data: {
      stage: payload.stage,
      expectedValue: new Prisma.Decimal(payload.expectedValue),
      expectedCloseDate: new Date(payload.expectedCloseDate),
      branchId: payload.branchId,
      salesOwnerId: payload.salesOwnerId,
      updatedBy: actorId,
    },
  });
  revalidatePath("/corporate-sales/leads");
  revalidatePath(`/corporate-sales/leads/${id}`);
  return JSON.parse(JSON.stringify(lead));
}

export async function logVisitAction(payload: any, actorId: string) {
  const parsed = LogMarketingVisitSchema.parse(payload);
  const visit = await corporateSalesService.logMarketingVisit(parsed, actorId);
  revalidatePath(`/corporate-sales/leads/${parsed.corporateSalesLeadId}`);
  return JSON.parse(JSON.stringify(visit));
}

export async function createFollowUpAction(payload: any, actorId: string) {
  const parsed = CreateFollowUpSchema.parse(payload);
  const followUp = await corporateSalesService.createFollowUp(parsed, actorId);
  revalidatePath(`/corporate-sales/leads/${parsed.corporateSalesLeadId}`);
  return JSON.parse(JSON.stringify(followUp));
}

export async function createQuotationAction(payload: any, actorId: string) {
  const parsed = CreateQuotationSchema.parse(payload);
  const quote = await quotationService.createQuotation(parsed, actorId);
  revalidatePath("/corporate-sales/quotations");
  return JSON.parse(JSON.stringify(quote));
}

export async function configureCostingSheetAction(payload: any, actorId: string) {
  const parsed = ConfigureCostingSheetSchema.parse(payload);
  const quote = await quotationService.configureCostingSheet(parsed, actorId);
  revalidatePath(`/corporate-sales/quotations/${parsed.quotationId}/costing`);
  return JSON.parse(JSON.stringify(quote));
}

export async function submitQuotationAction(quotationId: string, actorId: string) {
  const quote = await quotationService.submitForApproval(quotationId, actorId);
  revalidatePath("/corporate-sales/quotations");
  return JSON.parse(JSON.stringify(quote));
}

export async function approveQuotationAction(quotationId: string, actorId: string, remarks?: string) {
  const quote = await quotationService.approveQuotation(quotationId, actorId, remarks);
  await prisma.auditLog.create({
    data: {
      entityType: "Quotation",
      entityId: quotationId,
      action: "APPROVE",
      performedBy: actorId,
      reason: remarks || "Manager override approval.",
      module: "CorporateSales",
    },
  });
  revalidatePath("/corporate-sales/approvals");
  return JSON.parse(JSON.stringify(quote));
}

export async function rejectQuotationAction(quotationId: string, actorId: string, remarks?: string) {
  const quote = await quotationService.rejectQuotation(quotationId, actorId, remarks);
  await prisma.auditLog.create({
    data: {
      entityType: "Quotation",
      entityId: quotationId,
      action: "REJECT",
      performedBy: actorId,
      reason: remarks || "Manager rejection.",
      module: "CorporateSales",
    },
  });
  revalidatePath("/corporate-sales/approvals");
  return JSON.parse(JSON.stringify(quote));
}

export async function confirmOrderAction(payload: any, actorId: string) {
  const parsed = ConfirmSalesOrderSchema.parse(payload);
  const order = await salesOrderService.confirmSalesOrder(parsed, actorId);
  revalidatePath("/corporate-sales/orders");
  return JSON.parse(JSON.stringify(order));
}

export async function getLeadsAction(options: {
  branchId?: string;
  q?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;

  const whereClause: any = {
    isDeleted: false,
  };

  if (options.branchId) {
    whereClause.branchId = options.branchId;
  }

  if (options.q) {
    whereClause.OR = [
      { corporateAccount: { accountName: { contains: options.q, mode: "insensitive" } } },
      { corporateAccount: { accountCode: { contains: options.q, mode: "insensitive" } } },
    ];
  }

  // Handle sorting
  let orderBy: any = { createdAt: "desc" };
  if (options.sortBy) {
    const direction = options.sortOrder || "desc";
    if (options.sortBy === "accountName") {
      orderBy = { corporateAccount: { accountName: direction } };
    } else if (options.sortBy === "accountCode") {
      orderBy = { corporateAccount: { accountCode: direction } };
    } else {
      orderBy = { [options.sortBy]: direction };
    }
  }

  const [items, total] = await Promise.all([
    prisma.corporateSalesLead.findMany({
      where: whereClause,
      include: {
        corporateAccount: true,
        visits: { where: { isDeleted: false } },
        followUps: { where: { isDeleted: false } },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.corporateSalesLead.count({ where: whereClause }),
  ]);

  return JSON.parse(
    JSON.stringify({
      items,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    })
  );
}

export async function getLeadDetailsAction(leadId: string) {
  const lead = await corporateSalesService.getLeadDetails(leadId);
  return JSON.parse(JSON.stringify(lead));
}

export async function completeFollowUpAction(
  followUpId: string,
  outcome: string,
  nextFollowUpDate?: string,
  actorId?: string,
  scheduleNext?: boolean,
  nextFollowUpType?: string,
  nextFollowUpNotes?: string
) {
  const result = await prisma.$transaction(async (tx) => {
    const followUp = await tx.corporateSalesFollowUp.update({
      where: { id: followUpId },
      data: {
        status: "Completed",
        outcome: outcome,
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
        updatedBy: actorId,
      },
    });

    if (scheduleNext && nextFollowUpDate && nextFollowUpType) {
      await tx.corporateSalesFollowUp.create({
        data: {
          corporateSalesLeadId: followUp.corporateSalesLeadId,
          assignedToUserId: followUp.assignedToUserId,
          followUpDate: new Date(nextFollowUpDate),
          followUpType: nextFollowUpType,
          notes: nextFollowUpNotes || "Scheduled from previous follow-up outcome log.",
          status: "Scheduled",
          branchId: followUp.branchId,
          createdBy: actorId,
        },
      });
    }

    return followUp;
  });

  revalidatePath(`/corporate-sales/leads/${result.corporateSalesLeadId}`);
  revalidatePath("/corporate-sales/follow-ups");
  return JSON.parse(JSON.stringify(result));
}

export async function updateCorporateAccountCreditLimitAction(
  corporateAccountId: string,
  creditLimit: number,
  blockOnCreditLimit: boolean,
  actorId?: string
) {
  const account = await prisma.corporateAccount.update({
    where: { id: corporateAccountId },
    data: {
      creditLimit: new Prisma.Decimal(creditLimit),
      blockOnCreditLimit,
      updatedBy: actorId,
    },
  });
  
  // Revalidate leads pages as they show credit limit and details
  revalidatePath("/corporate-sales/leads");
  
  // Find lead ID associated with this account to refresh the detail page if needed
  const lead = await prisma.corporateSalesLead.findFirst({
    where: { corporateAccountId, isDeleted: false },
    select: { id: true },
  });
  if (lead) {
    revalidatePath(`/corporate-sales/leads/${lead.id}`);
  }
  
  return JSON.parse(JSON.stringify(account));
}

export async function getPendingApprovalsAction(options: {
  branchId?: string;
  q?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  allowedBranchIds?: string[];
}) {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;

  const whereClause: any = {
    status: "SubmittedForApproval",
    isDeleted: false,
  };

  if (options.branchId) {
    whereClause.branchId = options.branchId;
  } else if (options.allowedBranchIds && options.allowedBranchIds.length > 0) {
    whereClause.branchId = { in: options.allowedBranchIds };
  }

  if (options.q) {
    whereClause.OR = [
      { quotationNumber: { contains: options.q, mode: "insensitive" } },
      { corporateAccount: { accountName: { contains: options.q, mode: "insensitive" } } },
    ];
  }

  // Handle sorting
  let orderBy: any = { createdAt: "desc" };
  if (options.sortBy) {
    const direction = options.sortOrder || "desc";
    if (options.sortBy === "accountName") {
      orderBy = { corporateAccount: { accountName: direction } };
    } else if (options.sortBy === "quotationNumber") {
      orderBy = { quotationNumber: direction };
    } else if (options.sortBy === "quotationDate") {
      orderBy = { quotationDate: direction };
    } else if (options.sortBy === "totalAmount") {
      orderBy = { totalAmount: direction };
    } else if (options.sortBy === "profitPercentage") {
      orderBy = { costingSheet: { profitPercentage: direction } };
    } else {
      orderBy = { [options.sortBy]: direction };
    }
  }

  const [items, total] = await Promise.all([
    prisma.quotation.findMany({
      where: whereClause,
      include: {
        corporateAccount: true,
        costingSheet: true,
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.quotation.count({
      where: whereClause,
    }),
  ]);

  return {
    items: JSON.parse(JSON.stringify(items)),
    total,
  };
}

export async function getQuotationsAction(options: {
  branchId?: string;
  q?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;

  const whereClause: any = {
    isDeleted: false,
  };

  if (options.branchId) {
    whereClause.branchId = options.branchId;
  }

  if (options.q) {
    whereClause.OR = [
      { quotationNumber: { contains: options.q, mode: "insensitive" } },
      { corporateAccount: { accountName: { contains: options.q, mode: "insensitive" } } },
    ];
  }

  // Handle sorting
  let orderBy: any = { createdAt: "desc" };
  if (options.sortBy) {
    const direction = options.sortOrder || "desc";
    if (options.sortBy === "accountName") {
      orderBy = { corporateAccount: { accountName: direction } };
    } else if (options.sortBy === "quotationNumber") {
      orderBy = { quotationNumber: direction };
    } else if (options.sortBy === "quotationDate") {
      orderBy = { quotationDate: direction };
    } else if (options.sortBy === "totalAmount") {
      orderBy = { totalAmount: direction };
    } else if (options.sortBy === "status") {
      orderBy = { status: direction };
    } else {
      orderBy = { [options.sortBy]: direction };
    }
  }

  const [items, total] = await Promise.all([
    prisma.quotation.findMany({
      where: whereClause,
      include: {
        corporateAccount: true,
        costingSheet: true,
        revisions: true,
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.quotation.count({
      where: whereClause,
    }),
  ]);

  return {
    items: JSON.parse(JSON.stringify(items)),
    total,
  };
}

export async function getQuotationDetailsAction(quotationId: string) {
  const quote = await quotationService.getQuotationDetails(quotationId);
  return JSON.parse(JSON.stringify(quote));
}

export async function getOrdersAction(branchId?: string) {
  const orders = await salesOrderService.getOrders(branchId);
  return JSON.parse(JSON.stringify(orders));
}

export async function getPaginatedOrdersAction(options: {
  branchId?: string;
  allowedBranchIds?: string[];
  q?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;

  const whereClause: Prisma.SalesOrderWhereInput = {
    isDeleted: false,
  };

  if (options.branchId) {
    whereClause.branchId = options.branchId;
  } else if (options.allowedBranchIds && options.allowedBranchIds.length > 0) {
    whereClause.branchId = { in: options.allowedBranchIds };
  }

  if (options.q) {
    whereClause.OR = [
      { salesOrderNumber: { contains: options.q, mode: "insensitive" } },
      { corporateAccount: { accountName: { contains: options.q, mode: "insensitive" } } },
    ];
  }

  // Handle sorting
  let orderBy: any = { createdAt: "desc" };
  if (options.sortBy) {
    const direction = options.sortOrder || "desc";
    if (options.sortBy === "accountName") {
      orderBy = { corporateAccount: { accountName: direction } };
    } else if (options.sortBy === "salesOrderNumber") {
      orderBy = { salesOrderNumber: direction };
    } else if (options.sortBy === "orderDate") {
      orderBy = { orderDate: direction };
    } else if (options.sortBy === "totalAmount") {
      orderBy = { totalAmount: direction };
    } else if (options.sortBy === "status") {
      orderBy = { status: direction };
    } else {
      orderBy = { [options.sortBy]: direction };
    }
  }

  const [items, total] = await Promise.all([
    prisma.salesOrder.findMany({
      where: whereClause,
      include: {
        corporateAccount: true,
        quotation: true,
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.salesOrder.count({
      where: whereClause,
    }),
  ]);

  return {
    items: JSON.parse(JSON.stringify(items)),
    total,
  };
}

export async function getOrderDetailsAction(orderId: string) {
  const order = await salesOrderService.getOrderDetails(orderId);
  return JSON.parse(JSON.stringify(order));
}

export async function getCorporateFollowUpCountsAction(actorId: string) {
  const { branchScopeResolver } = await import("../../lib/runtime");
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(actorId as any, null);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const baseWhere: Prisma.CorporateSalesFollowUpWhereInput = {
    isDeleted: false,
    status: "Scheduled",
    branchId: allowedBranchIds.length > 0 ? { in: allowedBranchIds } : undefined,
    lead: {
      isDeleted: false,
      status: "Active",
      stage: {
        notIn: ["Confirmed", "Converted"],
      },
    },
  };

  const [today, overdue, future] = await Promise.all([
    prisma.corporateSalesFollowUp.count({
      where: {
        ...baseWhere,
        followUpDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    }),
    prisma.corporateSalesFollowUp.count({
      where: {
        ...baseWhere,
        followUpDate: {
          lt: todayStart,
        },
      },
    }),
    prisma.corporateSalesFollowUp.count({
      where: {
        ...baseWhere,
        followUpDate: {
          gt: todayEnd,
        },
      },
    }),
  ]);

  return { today, overdue, future };
}

export async function getCorporateFollowUpsAction(
  options: {
    tab: "today" | "future" | "past";
    page?: number;
    limit?: number;
  },
  actorId: string
) {
  const page = options.page || 1;
  const limit = options.limit || 6;
  const skip = (page - 1) * limit;

  const { branchScopeResolver } = await import("../../lib/runtime");
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(actorId as any, null);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const baseWhere: Prisma.CorporateSalesFollowUpWhereInput = {
    isDeleted: false,
    branchId: allowedBranchIds.length > 0 ? { in: allowedBranchIds } : undefined,
    lead: {
      isDeleted: false,
      status: "Active",
      stage: {
        notIn: ["Confirmed", "Converted"],
      },
    },
  };

  if (options.tab === "today") {
    baseWhere.status = "Scheduled";
    baseWhere.followUpDate = {
      gte: todayStart,
      lte: todayEnd,
    };
  } else if (options.tab === "future") {
    baseWhere.status = "Scheduled";
    baseWhere.followUpDate = {
      gt: todayEnd,
    };
  } else if (options.tab === "past") {
    baseWhere.status = "Scheduled";
    baseWhere.followUpDate = {
      lt: todayStart,
    };
  }

  const [items, total] = await Promise.all([
    prisma.corporateSalesFollowUp.findMany({
      where: baseWhere,
      include: {
        lead: {
          include: {
            corporateAccount: true,
          },
        },
      },
      orderBy: {
        followUpDate: options.tab === "past" ? "desc" : "asc",
      },
      skip,
      take: limit,
    }),
    prisma.corporateSalesFollowUp.count({ where: baseWhere }),
  ]);

  return JSON.parse(
    JSON.stringify({
      items,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    })
  );
}

export async function getDirectCostElementsAction() {
  const elements = await quotationService.getDirectCostElements();
  return JSON.parse(JSON.stringify(elements));
}

export async function createDirectCostElementAction(payload: { name: string; status?: string }, actorId: string) {
  const element = await quotationService.createDirectCostElement(payload, actorId);
  revalidatePath("/corporate-sales/cost-elements");
  return JSON.parse(JSON.stringify(element));
}

export async function updateDirectCostElementAction(
  payload: { id: string; name: string; status: string },
  actorId: string
) {
  const element = await quotationService.updateDirectCostElement(payload, actorId);
  revalidatePath("/corporate-sales/cost-elements");
  return JSON.parse(JSON.stringify(element));
}

export async function deleteDirectCostElementAction(id: string, actorId: string) {
  const element = await quotationService.deleteDirectCostElement(id, actorId);
  revalidatePath("/corporate-sales/cost-elements");
  return JSON.parse(JSON.stringify(element));
}

export async function cancelQuotationAction(quotationId: string, actorId: string) {
  const quote = await quotationService.cancelQuotation(quotationId, actorId);
  revalidatePath(`/corporate-sales/quotations/${quotationId}`);
  return JSON.parse(JSON.stringify(quote));
}

export async function getPaginatedDirectCostElementsAction(options: {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;

  const whereClause: Prisma.DirectCostElementMasterWhereInput = {};

  if (options.q) {
    whereClause.name = { contains: options.q, mode: "insensitive" };
  }

  if (options.status) {
    whereClause.status = options.status;
  }

  // Handle sorting
  let orderBy: any = { name: "asc" };
  if (options.sortBy) {
    const direction = options.sortOrder || "asc";
    orderBy = { [options.sortBy]: direction };
  }

  const [items, total] = await Promise.all([
    prisma.directCostElementMaster.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.directCostElementMaster.count({ where: whereClause }),
  ]);

  return {
    items: JSON.parse(JSON.stringify(items)),
    total,
  };
}
