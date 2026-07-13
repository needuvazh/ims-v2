import { assertAnyPermission } from "../../../../lib/auth-guard";
import { getLeadDetailsAction } from "../../actions";
import { CorporateLeadDetailsClient } from "./_components/corporate-lead-details-client";
import { prisma } from "@ims/database";
import { notFound } from "next/navigation";
import { AdminDetailPageLayout } from "@ims/shared-ui";

export const metadata = { title: "B2B Lead Details - Corporate Sales | ASTI IMS" };

export default async function LeadDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const session = await assertAnyPermission(["lead.read", "organization.manage"]);

  const lead = await getLeadDetailsAction(params.id);
  if (!lead) {
    notFound();
  }

  const quotations = await prisma.quotation.findMany({
    where: { corporateSalesLeadId: lead.id, isDeleted: false },
    orderBy: { createdAt: "desc" },
    include: {
      salesOrders: { where: { isDeleted: false } }
    }
  });
  lead.quotations = JSON.parse(JSON.stringify(quotations));

  // Query active sales users
  const rawUsers = await prisma.user.findMany({
    where: { status: "Active" },
    include: { person: true },
  });
  const users = rawUsers.map((u) => ({
    id: u.id,
    name: `${u.person.firstName} ${u.person.lastName} (${u.username})`,
  }));

  // Query published courses for searchable multi-select
  const rawCourses = await prisma.course.findMany({
    where: { status: "Published" },
    select: { id: true, nameEnglish: true, courseCode: true },
    orderBy: { nameEnglish: "asc" },
  });
  const courses = rawCourses.map((c) => ({
    id: c.id,
    name: `${c.nameEnglish} (${c.courseCode})`,
  }));

  return (
    <AdminDetailPageLayout className="pt-1 sm:pt-0">
      <CorporateLeadDetailsClient
        lead={lead}
        users={users}
        actorId={session.userId}
        courses={courses}
      />
    </AdminDetailPageLayout>
  );
}
