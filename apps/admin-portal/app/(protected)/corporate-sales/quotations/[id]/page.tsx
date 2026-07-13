import { assertAnyPermission } from "../../../../lib/auth-guard";
import { getQuotationDetailsAction } from "../../actions";
import { QuotationDetailsClient } from "./_components/quotation-details-client";
import { notFound } from "next/navigation";
import { AdminDetailPageLayout } from "@ims/shared-ui";

export const metadata = { title: "Quotation Details - Corporate Sales | ASTI IMS" };

export default async function CorporateQuotationDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const session = await assertAnyPermission(["lead.read", "organization.manage"]);

  try {
    const quote = await getQuotationDetailsAction(params.id);
    if (!quote) {
      notFound();
    }

    return (
      <AdminDetailPageLayout className="pt-1 sm:pt-0">
        <QuotationDetailsClient
          quote={quote}
          actorId={session.userId}
        />
      </AdminDetailPageLayout>
    );
  } catch (err) {
    notFound();
  }
}
