import { assertAnyPermission } from "../../../lib/auth-guard";
import { prisma } from "@ims/database";
import { ApprovalsList } from "./_components/approvals-list";
import { getPendingApprovalsAction } from "../actions";
import { AdminListPageLayout } from "@ims/shared-ui";

export const metadata = { title: "B2B Manager Approvals - Corporate Sales | ASTI IMS" };

export default async function CorporateApprovalsPage(props: {
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

  const filterBranchId = searchParams.branchId || undefined;
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const q = searchParams.q || undefined;
  const sortBy = searchParams.sortBy || undefined;
  const sortOrder = (searchParams.sortOrder as "asc" | "desc") || undefined;

  const result = await getPendingApprovalsAction({
    branchId: filterBranchId,
    q,
    page,
    limit: 10,
    sortBy,
    sortOrder,
    allowedBranchIds,
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

  // Compute pending stats for KPIs based on allowed branches
  const kpiWhere: any = {
    status: "SubmittedForApproval",
    isDeleted: false,
    branchId: allowedBranchIds.length > 0 ? { in: allowedBranchIds } : undefined,
  };

  const allPending = await prisma.quotation.findMany({
    where: kpiWhere,
    include: {
      costingSheet: true,
    },
  });

  const totalPending = allPending.length;
  let avgMargin = 0;
  let minMargin = 100;
  if (totalPending > 0) {
    const margins = allPending.map(q => Number(q.costingSheet?.profitPercentage || 0));
    const sum = margins.reduce((acc, val) => acc + val, 0);
    avgMargin = sum / totalPending;
    minMargin = Math.min(...margins);
  } else {
    minMargin = 0;
  }

  const kpis = {
    totalPending,
    avgMargin,
    minMargin,
  };

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <ApprovalsList
        pendingQuotes={result.items}
        total={result.total}
        currentPage={page}
        actorId={session.userId}
        branches={branches}
        kpis={kpis}
      />
    </AdminListPageLayout>
  );
}
