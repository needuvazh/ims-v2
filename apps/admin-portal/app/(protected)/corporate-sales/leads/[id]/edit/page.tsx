import { assertAnyPermission } from "../../../../../lib/auth-guard";
import { notFound } from "next/navigation";
import { Breadcrumbs, PageHeader, AdminFormPageLayout } from "@ims/shared-ui";
import { EditLeadForm } from "../../_components/edit-lead-form";
import { prisma } from "@ims/database";
import { Home, Briefcase, Pencil } from "lucide-react";

export const metadata = { title: "Edit B2B Corporate Lead - Corporate Sales | ASTI IMS" };

export default async function EditCorporateLeadPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id: leadId } = await props.params;
  const session = await assertAnyPermission(["lead.write", "organization.manage"]);

  const lead = await prisma.corporateSalesLead.findUnique({
    where: { id: leadId },
    include: { corporateAccount: true },
  });
  if (!lead || lead.isDeleted) {
    notFound();
  }

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
        title={`Edit B2B Lead: ${lead.corporateAccount.accountName}`}
        description="Modify prospecting parameters and sales pipelines."
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
              { label: "Edit Lead", icon: <Pencil className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />
      <div className="mt-6">
        <EditLeadForm
          lead={lead}
          branches={branches}
          users={users}
          actorId={session.userId}
        />
      </div>
    </AdminFormPageLayout>
  );
}
