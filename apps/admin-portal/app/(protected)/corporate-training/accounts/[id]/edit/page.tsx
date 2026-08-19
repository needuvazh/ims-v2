import { assertAnyPermission } from "../../../../../lib/auth-guard";
import { getCorporateAccountDetailsAction } from "../../../actions";
import { prisma } from "@ims/database";
import { notFound } from "next/navigation";
import { EditAccountClientForm } from "../../../_components/edit-account-client-form";
import { Breadcrumbs, PageHeader, AdminFormPageLayout } from "@ims/shared-ui";
import { Home, Briefcase, UserPen } from "lucide-react";

export const metadata = { title: "Edit Corporate Account - Corporate Training | ASTI IMS" };

export default async function EditCorporateAccountPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const session = await assertAnyPermission(["corporate-training.accounts.write", "lead.write"]);

  const account = await getCorporateAccountDetailsAction(params.id);
  if (!account) {
    notFound();
  }

  // Fetch branches
  const branches = await prisma.branch.findMany({
    where: { status: "Active" },
  });

  const mappedBranches = branches.map((b) => ({
    id: b.id,
    name: b.branchName,
  }));

  return (
    <AdminFormPageLayout>
      <PageHeader
        title="Edit Corporate Account"
        description="Update corporate operational details, status options, and credit controls."
        backUrl={`/corporate-training/accounts/${account.id}`}
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: "Dashboard",
                href: "/dashboard",
                icon: <Home className="h-3.5 w-3.5" />,
              },
              {
                label: "Corporate Training",
                href: "/corporate-training/accounts",
                icon: <Briefcase className="h-3.5 w-3.5" />,
              },
              {
                label: "Accounts",
                href: "/corporate-training/accounts",
              },
              {
                label: account.accountCode,
                href: `/corporate-training/accounts/${account.id}`,
              },
              {
                label: "Edit",
                icon: <UserPen className="h-3.5 w-3.5" />,
              },
            ]}
          />
        }
      />
      <div className="mt-6">
        <EditAccountClientForm
          account={account}
          branches={mappedBranches}
          actorId={session.userId}
        />
      </div>
    </AdminFormPageLayout>
  );
}
