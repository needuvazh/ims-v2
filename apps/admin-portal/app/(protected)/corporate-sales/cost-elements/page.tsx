import { assertAnyPermission } from "../../../../lib/auth-guard";
import { getPaginatedDirectCostElementsAction } from "../actions";
import { CostElementsClient } from "./cost-elements-client";
import { AdminListPageLayout } from "@ims/shared-ui";

export const metadata = { title: "Direct Cost Elements Master - Corporate Sales | ASTI IMS" };
export const dynamic = "force-dynamic";

export default async function CostElementsPage(props: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await assertAnyPermission(["lead.read", "organization.manage"]);

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const q = searchParams.q || undefined;
  const status = searchParams.status || undefined;
  const sortBy = searchParams.sortBy || undefined;
  const sortOrder = (searchParams.sortOrder as "asc" | "desc") || undefined;

  const { items, total } = await getPaginatedDirectCostElementsAction({
    q,
    status,
    page,
    limit: 10,
    sortBy,
    sortOrder,
  });

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <CostElementsClient
        elements={items}
        total={total}
        currentPage={page}
        actorId={session.userId}
      />
    </AdminListPageLayout>
  );
}
