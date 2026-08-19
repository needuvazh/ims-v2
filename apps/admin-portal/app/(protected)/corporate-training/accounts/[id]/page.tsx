import { assertAnyPermission } from "../../../../lib/auth-guard";
import { getCorporateAccountDetailsAction } from "../../actions";
import { notFound } from "next/navigation";
import { CorporateAccountDetailsClient } from "../../_components/corporate-account-details-client";
import { AdminDetailPageLayout } from "@ims/shared-ui";

export const metadata = { title: "Corporate Profile - Corporate Training | ASTI IMS" };

export default async function CorporateAccountDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const session = await assertAnyPermission(["corporate-training.accounts.read", "lead.read"]);

  const account = await getCorporateAccountDetailsAction(params.id);
  if (!account) {
    notFound();
  }

  return (
    <AdminDetailPageLayout>
      <CorporateAccountDetailsClient
        account={account}
        actorId={session.userId}
      />
    </AdminDetailPageLayout>
  );
}
