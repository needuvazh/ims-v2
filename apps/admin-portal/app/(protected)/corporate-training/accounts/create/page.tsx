import { assertAnyPermission } from "../../../../lib/auth-guard";
import { prisma } from "@ims/database";
import { CreateAccountClientForm } from "../../_components/create-account-client-form";
import { Breadcrumbs, PageHeader, AdminFormPageLayout } from "@ims/shared-ui";
import { Home, Briefcase, PlusCircle } from "lucide-react";

export const metadata = { title: "Register B2B Account - Corporate Training | ASTI IMS" };

export default async function CreateCorporateAccountPage() {
  const session = await assertAnyPermission(["corporate-training.accounts.write", "lead.write"]);

  // Fetch branches for assignment dropdown
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
        title="Register B2B Corporate Account"
        description="Establish corporate profile, assign scope branch, and configure credit control rules."
        backUrl="/corporate-training/accounts"
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
                label: "Register Client",
                icon: <PlusCircle className="h-3.5 w-3.5" />,
              },
            ]}
          />
        }
      />
      <div className="mt-6">
        <CreateAccountClientForm
          branches={mappedBranches}
          actorId={session.userId}
        />
      </div>
    </AdminFormPageLayout>
  );
}
