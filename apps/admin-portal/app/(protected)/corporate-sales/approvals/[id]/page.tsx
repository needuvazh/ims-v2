import { assertAnyPermission } from "../../../../lib/auth-guard";
import { getQuotationDetailsAction } from "../../actions";
import { QuotationApprovalClient } from "./_components/quotation-approval-client";
import { notFound } from "next/navigation";
import { AdminDetailPageLayout } from "@ims/shared-ui";
import { prisma } from "@ims/database";

export const metadata = { title: "Review Quotation Proposal - B2B Approvals | ASTI IMS" };

export default async function CorporateQuotationApprovalPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const session = await assertAnyPermission(["lead.read", "organization.manage"]);

  try {
    const quote = await getQuotationDetailsAction(params.id);
    if (!quote) {
      notFound();
    }

    // Fetch approval/rejection audit logs for this quotation
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: "Quotation",
        entityId: params.id,
        action: { in: ["REJECT", "APPROVE"] },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const userIds = auditLogs.map((log) => log.performedBy).filter(Boolean) as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      include: { person: true },
    });

    const decisionHistory = auditLogs.map((log) => {
      const user = users.find((u) => u.id === log.performedBy);
      const performerName = user
        ? `${user.person.firstName} ${user.person.lastName} (${user.username})`
        : "Unknown User";
      return {
        id: log.id,
        action: log.action,
        performedAt: log.performedAt,
        reason: log.reason,
        performerName,
      };
    });

    return (
      <AdminDetailPageLayout className="pt-1 sm:pt-0">
        <QuotationApprovalClient
          quote={quote}
          actorId={session.userId}
          decisionHistory={decisionHistory}
        />
      </AdminDetailPageLayout>
    );
  } catch (err) {
    notFound();
  }
}
