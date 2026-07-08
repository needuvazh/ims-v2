import {
  AdminListPageLayout,
  Breadcrumbs,
  PageHeader,
} from '@ims/shared-ui';
import { getFacultyTrainerContext } from '../_lib';
import { assertPermission } from '../../../lib/auth-guard';
import { prisma } from '@ims/database';
import { Home, Users, BarChart } from 'lucide-react';
import ReportsClient from './_components/reports-client';

export const metadata = { title: 'Faculty Reports | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function FacultyReportsPage() {
  const session = await assertPermission('trainer.report.view');
  const { authContext } = await getFacultyTrainerContext();
  const { trainerManagementService, branchScopeResolver } = await import(
    '../../../lib/runtime'
  );

  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any,
  );

  const [branches, initialData] = await Promise.all([
    prisma.branch.findMany({
      where: {
        isDeleted: false,
        ...(allowedBranchIds.length > 0
          ? { id: { in: allowedBranchIds } }
          : {}),
      },
      select: { id: true, branchName: true, branchCode: true },
      orderBy: { branchName: 'asc' },
    }),
    trainerManagementService.listReports(
      'trainer.roster',
      { branchId: session.activeBranchId },
      { page: 1, pageSize: 20 },
      authContext,
    ),
  ]);

  return (
    <AdminListPageLayout>
      <PageHeader
        title="Faculty Reports"
        description="Branch-aware operational views for roster coverage, authorizations, availability, and compensation coverage."
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Dashboard',
                href: '/dashboard',
                icon: <Home className="h-3.5 w-3.5" />,
              },
              {
                label: 'Faculty',
                href: '/faculty/trainers',
                icon: <Users className="h-3.5 w-3.5" />,
              },
              {
                label: 'Reports',
                icon: <BarChart className="h-3.5 w-3.5" />,
              },
            ]}
          />
        }
      />

      <ReportsClient
        initialData={initialData as any}
        branches={branches}
        session={session as any}
      />
    </AdminListPageLayout>
  );
}
