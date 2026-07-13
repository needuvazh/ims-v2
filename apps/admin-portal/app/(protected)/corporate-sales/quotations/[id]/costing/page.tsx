import { assertAnyPermission } from "../../../../../lib/auth-guard";
import { getQuotationDetailsAction, getDirectCostElementsAction } from "../../../actions";
import { CostingEditor } from "./_components/costing-editor";
import { AdminDetailPageLayout } from "@ims/shared-ui";

export default async function CostingSheetPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const session = await assertAnyPermission(["lead.read", "organization.manage"]);

  const [quote, costElements] = await Promise.all([
    getQuotationDetailsAction(params.id),
    getDirectCostElementsAction(),
  ]);

  return (
    <AdminDetailPageLayout className="pt-1 sm:pt-0">
      <CostingEditor quote={quote} costElements={costElements} actorId={session.userId} />
    </AdminDetailPageLayout>
  );
}
