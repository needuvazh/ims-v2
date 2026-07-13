import { assertAnyPermission } from "../../../lib/auth-guard";
import { getLeadsAction } from "../actions";
import { AdminListPageLayout } from "@ims/shared-ui";
import { LeadsClientList } from "./_components/leads-client-list";
import { prisma } from "@ims/database";

export const metadata = { title: "B2B Corporate Leads - Corporate Sales | ASTI IMS" };

export default async function CorporateLeadsPage(props: {
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

  const result = await getLeadsAction({
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

  // Query corporate accounts
  const rawAccounts = await prisma.corporateAccount.findMany({ where: { isDeleted: false } });
  const corporateAccounts = rawAccounts.map((c) => ({ id: c.id, name: c.accountName }));

  // Calculate scope KPIs
  const kpiWhere: any = {
    isDeleted: false,
    branchId: allowedBranchIds.length > 0 ? { in: allowedBranchIds } : undefined,
  };

  const [totalLeads, totalVisits, pendingFollowUps] = await Promise.all([
    prisma.corporateSalesLead.count({ where: kpiWhere }),
    prisma.corporateMarketingVisit.count({ where: { isDeleted: false, branchId: kpiWhere.branchId } }),
    prisma.corporateSalesFollowUp.count({ where: { isDeleted: false, status: "Scheduled", branchId: kpiWhere.branchId } }),
  ]);

  const kpis = {
    total: totalLeads,
    visitsCount: totalVisits,
    pendingFollowUps,
  };

  // Query active sales users
  const rawUsers = await prisma.user.findMany({
    where: { status: "Active" },
    include: { person: true },
  });
  const users = rawUsers.map((u) => ({
    id: u.id,
    name: `${u.person.firstName} ${u.person.lastName} (${u.username})`,
  }));

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <LeadsClientList
        leads={result.items}
        branches={branches}
        corporateAccounts={corporateAccounts}
        users={users}
        total={result.total}
        currentPage={page}
        actorId={session.userId}
        kpis={kpis}
      />
    </AdminListPageLayout>
  );
}
