import { assertAnyPermission } from "../../../../lib/auth-guard";
import { getOrderDetailsAction } from "../../actions";
import { OrderDetailsClient } from "./_components/order-details-client";
import { notFound } from "next/navigation";
import { AdminDetailPageLayout } from "@ims/shared-ui";

export const metadata = { title: "Sales Order Details - Corporate Sales | ASTI IMS" };

export default async function CorporateOrderDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const session = await assertAnyPermission(["lead.read", "organization.manage"]);

  try {
    const order = await getOrderDetailsAction(params.id);
    if (!order) {
      notFound();
    }

    return (
      <AdminDetailPageLayout className="pt-1 sm:pt-0">
        <OrderDetailsClient
          order={order}
          actorId={session.userId}
        />
      </AdminDetailPageLayout>
    );
  } catch (err) {
    notFound();
  }
}
