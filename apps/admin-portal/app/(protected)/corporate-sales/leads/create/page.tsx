import { assertAnyPermission } from "../../../../lib/auth-guard";
import { Breadcrumbs, PageHeader, AdminFormPageLayout } from "@ims/shared-ui";
import { CreateLeadForm } from "../_components/create-lead-form";
import { prisma } from "@ims/database";
import { Home, Briefcase, PlusCircle } from "lucide-react";

export const metadata = { title: "Create B2B Corporate Lead - Corporate Sales | ASTI IMS" };

export default async function CreateCorporateLeadPage() {
  const session = await assertAnyPermission(["lead.write", "organization.manage"]);

  // Resolve allowed branch scope
  const { branchScopeResolver } = await import("@/lib/runtime");
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any
  );

  const rawBranches = await prisma.branch.findMany({
    where: {
      isDeleted: false,
      id: allowedBranchIds.length > 0 ? { in: allowedBranchIds } : undefined,
    },
    select: { id: true, branchName: true },
  });
  const branches = rawBranches.map((b) => ({ id: b.id, name: b.branchName }));

  const rawAccounts = await prisma.corporateAccount.findMany({ where: { isDeleted: false } });
  const corporateAccounts = rawAccounts.map((c) => ({ id: c.id, name: c.accountName }));

  const rawUsers = await prisma.user.findMany({
    where: { status: "Active" },
    include: { person: true },
  });
  const users = rawUsers.map((u) => ({
    id: u.id,
    name: `${u.person.firstName} ${u.person.lastName} (${u.username})`,
  }));

  return (
    <AdminFormPageLayout>
      <PageHeader
        title="Create B2B Lead"
        description="Configure new B2B commercial pipeline opportunity parameters."
        backUrl="/corporate-sales/leads"
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: "Dashboard",
                href: "/dashboard",
                icon: <Home className="h-3.5 w-3.5" />,
              },
              {
                label: "B2B Leads",
                href: "/corporate-sales/leads",
                icon: <Briefcase className="h-3.5 w-3.5" />,
              },
              { label: "Create", icon: <PlusCircle className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />
      <div className="mt-6">
        <CreateLeadForm
          branches={branches}
          corporateAccounts={corporateAccounts}
          users={users}
          actorId={session.userId}
        />
      </div>
    </AdminFormPageLayout>
  );
}
