import { assertAnyPermission } from "../../../lib/auth-guard";
import { getQuotationsAction } from "../actions";
import { AdminListPageLayout } from "@ims/shared-ui";
import { QuotationsClientList } from "./_components/quotations-client-list";
import { prisma } from "@ims/database";

export const metadata = { title: "Quotations Pipeline - Corporate Sales | ASTI IMS" };

export default async function CorporateQuotationsPage(props: {
  searchParams: Promise<{
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

  const result = await getQuotationsAction({
    branchId: filterBranchId,
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

  const [totalProposals, pendingApproval, approvedSent, wins] = await Promise.all([
    prisma.quotation.count({ where: kpiWhere }),
    prisma.quotation.count({
      where: {
        ...kpiWhere,
        status: "SubmittedForApproval",
      },
    }),
    prisma.quotation.count({
      where: {
        ...kpiWhere,
        status: { in: ["Approved", "Sent"] },
      },
    }),
    prisma.quotation.count({
      where: {
        ...kpiWhere,
        status: "Accepted",
      },
    }),
  ]);

  const kpis = {
    total: totalProposals,
    pendingApproval,
    approvedSent,
    wins,
  };

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <QuotationsClientList
        quotations={result.items}
        branches={branches}
        total={result.total}
        currentPage={page}
        kpis={kpis}
      />
    </AdminListPageLayout>
  );
}
