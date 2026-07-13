import { assertAnyPermission } from "../../../lib/auth-guard";
import { prisma } from "@ims/database";
import { getPaginatedOrdersAction } from "../actions";
import { OrdersClient } from "./_components/orders-client";
import { AdminListPageLayout } from "@ims/shared-ui";

export const metadata = { title: "B2B Sales Orders - Corporate Sales | ASTI IMS" };

export default async function CorporateOrdersPage(props: {
  searchParams: Promise<{
    quotationId?: string;
    branchId?: string;
    q?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await assertAnyPermission(["lead.read", "organization.manage"]);

  // Resolve allowed branch scope
  const { branchScopeResolver } = await import("@/lib/runtime");
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any
  );

  let filterBranchId = searchParams.branchId || undefined;
  if (!filterBranchId && allowedBranchIds.length > 0) {
    // If no branch filter selected, scope to user's first allowed branch
    filterBranchId = allowedBranchIds[0] as string;
  }

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const q = searchParams.q || undefined;
  const sortBy = searchParams.sortBy || undefined;
  const sortOrder = (searchParams.sortOrder as "asc" | "desc") || undefined;

  // Fetch approved quotations that can be converted to orders (scoped to active branch filter)
  const rawApprovedQuotes = await prisma.quotation.findMany({
    where: {
      status: { in: ["Approved", "Sent"] },
      isDeleted: false,
      branchId: filterBranchId ? filterBranchId : (allowedBranchIds.length > 0 ? { in: allowedBranchIds } : undefined),
    },
    include: {
      corporateAccount: true,
    },
  });
  const approvedQuotes = JSON.parse(JSON.stringify(rawApprovedQuotes));

  const result = await getPaginatedOrdersAction({
    branchId: filterBranchId,
    allowedBranchIds: allowedBranchIds.length > 0 ? (allowedBranchIds as string[]) : undefined,
    q,
    page,
    limit: 10,
    sortBy,
    sortOrder,
  });

  // Query branches matching authorization scope
  const rawBranches = await prisma.branch.findMany({
    where: {
      isDeleted: false,
      id: allowedBranchIds.length > 0 ? { in: allowedBranchIds } : undefined,
    },
    select: { id: true, branchName: true },
  });
  const branches = rawBranches.map((b) => ({ id: b.id, name: b.branchName }));

  // Calculate scope KPIs
  const kpiWhere: any = {
    isDeleted: false,
    branchId: filterBranchId ? filterBranchId : (allowedBranchIds.length > 0 ? { in: allowedBranchIds } : undefined),
  };

  const [totalOrders, revenueRes, pendingHandoff] = await Promise.all([
    prisma.salesOrder.count({ where: kpiWhere }),
    prisma.salesOrder.aggregate({
      where: {
        ...kpiWhere,
        status: { not: "Cancelled" },
      },
      _sum: {
        totalAmount: true,
      },
    }),
    prisma.salesOrder.count({
      where: {
        ...kpiWhere,
        status: { in: ["Confirmed", "ContractInitiated"] },
      },
    }),
  ]);

  const kpis = {
    totalOrders,
    totalRevenue: revenueRes._sum.totalAmount ? Number(revenueRes._sum.totalAmount) : 0,
    pendingHandoff,
  };

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <OrdersClient
        approvedQuotes={approvedQuotes}
        confirmedOrders={result.items}
        total={result.total}
        currentPage={page}
        actorId={session.userId}
        defaultQuotationId={searchParams.quotationId}
        branches={branches}
        kpis={kpis}
      />
    </AdminListPageLayout>
  );
}
