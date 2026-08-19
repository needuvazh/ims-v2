import { assertAnyPermission } from "../../../../lib/auth-guard";
import { Breadcrumbs, PageHeader, AdminFormPageLayout } from "@ims/shared-ui";
import { CreateQuotationClientForm } from "./_components/create-quotation-client-form";
import { prisma } from "@ims/database";
import { Home, Briefcase, PlusCircle } from "lucide-react";
import { notFound } from "next/navigation";

export const metadata = { title: "Create B2B Quotation - Corporate Sales | ASTI IMS" };

export default async function CreateCorporateQuotationPage(props: {
  searchParams: Promise<{ leadId?: string; visitId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await assertAnyPermission(["lead.write", "organization.manage"]);

  // Resolve allowed branch scope
  const { branchScopeResolver } = await import("@/lib/runtime");
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any
  );

  // Fetch leads and courses
  const leads = await prisma.corporateSalesLead.findMany({
    where: {
      isDeleted: false,
      branchId: allowedBranchIds.length > 0 ? { in: allowedBranchIds } : undefined,
    },
    include: { corporateAccount: true },
  });

  const courses = await prisma.course.findMany({
    where: { isDeleted: false, status: "Published" },
    include: {
      pricings: {
        where: { isDeleted: false, status: "Active" },
      },
    },
  });

  // If a leadId query param is supplied, verify it exists and is allowed
  let initialLead = null;
  if (searchParams.leadId) {
    initialLead = leads.find((l) => l.id === searchParams.leadId) || null;
  }

  let initialVisit = null;
  if (searchParams.visitId) {
    const visitRecord = await prisma.corporateMarketingVisit.findFirst({
      where: { id: searchParams.visitId, isDeleted: false },
    });
    if (visitRecord) {
      initialVisit = {
        id: visitRecord.id,
        coursesDiscussed: visitRecord.coursesDiscussed,
        expectedCandidates: visitRecord.expectedCandidates,
      };
      // Auto-set the lead if not provided
      if (!initialLead) {
        initialLead = leads.find((l) => l.id === visitRecord.corporateSalesLeadId) || null;
      }
    }
  }

  const mappedLeads = leads.map((l) => ({
    id: l.id,
    corporateAccountId: l.corporateAccountId,
    accountName: l.corporateAccount.accountName,
    branchId: l.branchId,
  }));

  const mappedCourses = courses.map((c) => {
    const corpPrice = c.pricings.find((p) => p.customerType === "Corporate");
    const fallbackPrice = c.pricings[0];
    const resolvedPrice = corpPrice
      ? Number(corpPrice.basePrice)
      : fallbackPrice
      ? Number(fallbackPrice.basePrice)
      : 0;

    return {
      id: c.id,
      nameEnglish: c.nameEnglish,
      code: c.courseCode,
      basePrice: resolvedPrice,
      hasCorporatePrice: !!corpPrice,
    };
  });

  return (
    <AdminFormPageLayout>
      <PageHeader
        title="Create B2B Quotation"
        description="Formulate commercial proposal line items and configure pricing margins."
        backUrl="/corporate-sales/quotations"
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
              {
                label: "Quotations",
                href: "/corporate-sales/quotations",
              },
              { label: "Create", icon: <PlusCircle className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />
      <div className="mt-6">
        <CreateQuotationClientForm
          leads={mappedLeads}
          courses={mappedCourses}
          initialLeadId={initialLead?.id}
          actorId={session.userId}
          initialVisit={initialVisit}
        />
      </div>
    </AdminFormPageLayout>
  );
}
