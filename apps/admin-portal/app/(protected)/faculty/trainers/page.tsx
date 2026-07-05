import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '@ims/database';
import { AdminListPageLayout, LinkButton, PageHeader, StatCard } from '@ims/shared-ui';
import { BadgeCheck, Clock3, Users, UserRound } from 'lucide-react';
import { getFacultyTrainerContext } from '../_lib';
import { TrainersClientList } from './_components/trainers-client-list';

export const metadata = { title: 'Trainers | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function TrainersPage(props: {
  searchParams: Promise<{
    q?: string;
    branchId?: string;
    status?: string;
    trainerType?: string;
    specialization?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await assertPermission('trainer.read');
  const { authContext } = await getFacultyTrainerContext();

  const { branchScopeResolver } = await import('@/lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any,
  );

  let filterBranchIds = allowedBranchIds.map((id) => id as string);
  if (filterBranchIds.length === 0) {
    filterBranchIds = ['00000000-0000-0000-0000-000000000000'];
  } else if (searchParams.branchId) {
    const requestedBranchId = searchParams.branchId;
    if (filterBranchIds.includes(requestedBranchId)) {
      filterBranchIds = [requestedBranchId];
    } else {
      filterBranchIds = ['00000000-0000-0000-0000-000000000000'];
    }
  }
  const appliedBranchId = searchParams.branchId && filterBranchIds[0] !== '00000000-0000-0000-0000-000000000000'
    ? filterBranchIds[0]
    : undefined;

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const limit = 10;
  const sortBy = searchParams.sortBy || 'createdAt';
  const sortOrder = (searchParams.sortOrder as 'asc' | 'desc' | undefined) || 'desc';

  const result = await import('../../../lib/runtime').then(({ trainerManagementService }) =>
    trainerManagementService.listTrainers(
      {
        q: searchParams.q,
        branchId: appliedBranchId,
        status: searchParams.status as any,
        trainerType: searchParams.trainerType as any,
        specialization: searchParams.specialization,
      },
      {
        page,
        pageSize: limit,
        sortBy,
        sortDirection: sortOrder,
      },
      authContext,
    ),
  );

  const trainers = result.items.map((trainer) => ({
    id: trainer.id,
    trainerCode: trainer.trainerCode,
    trainerType: trainer.trainerType,
    specialization: trainer.specialization,
    status: trainer.status,
    createdAt: trainer.createdAt.toISOString(),
    updatedAt: trainer.updatedAt ? trainer.updatedAt.toISOString() : null,
    person: trainer.person
      ? {
          firstName: trainer.person.firstName,
          lastName: trainer.person.lastName,
          mobile: trainer.person.mobile,
          email: trainer.person.email,
        }
      : null,
    branch: trainer.branch
      ? {
          id: trainer.branch.id,
          branchName: trainer.branch.branchName,
          branchCode: trainer.branch.branchCode,
        }
      : null,
  }));

  const branches = await prisma.branch.findMany({
    where: {
      isDeleted: false,
      id: allowedBranchIds.length > 0 ? { in: allowedBranchIds } : undefined,
    },
    select: { id: true, branchName: true, branchCode: true },
  });

  const whereBase = {
    isDeleted: false,
    branchId: allowedBranchIds.length > 0 ? { in: filterBranchIds } : undefined,
  };

  const [totalCount, activeCount, inactiveCount, suspendedCount] = await Promise.all([
    prisma.trainerProfile.count({ where: whereBase }),
    prisma.trainerProfile.count({ where: { ...whereBase, status: 'Active' } }),
    prisma.trainerProfile.count({ where: { ...whereBase, status: 'Inactive' } }),
    prisma.trainerProfile.count({ where: { ...whereBase, status: 'Suspended' } }),
  ]);

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <PageHeader
        eyebrow="Module 09"
        title="Trainer Registry"
        description="Search, sort, and maintain trainer profiles with branch-scoped access controls."
        actions={<LinkButton href="/faculty/trainers/new">New trainer</LinkButton>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-5">
        <StatCard
          title="Total Trainers"
          value={totalCount}
          description="Branch-scoped trainers in view"
          icon={<Users className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Active"
          value={activeCount}
          description="Available for scheduling"
          icon={<BadgeCheck className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Inactive"
          value={inactiveCount}
          description="Hidden from active planning"
          icon={<Clock3 className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Suspended"
          value={suspendedCount}
          description="Temporarily unavailable"
          icon={<UserRound className="h-5 w-5" />}
          tone="violet"
        />
      </div>

      <TrainersClientList
        trainers={trainers}
        branches={branches.map((branch) => ({ id: branch.id, name: branch.branchName, code: branch.branchCode }))}
        total={result.total}
        currentPage={page}
        limit={limit}
        defaultSearch={searchParams.q || ''}
        defaultBranchId={searchParams.branchId || ''}
        defaultStatus={searchParams.status || ''}
        defaultTrainerType={searchParams.trainerType || ''}
        defaultSpecialization={searchParams.specialization || ''}
        defaultSortBy={sortBy}
        defaultSortOrder={sortOrder}
      />
    </AdminListPageLayout>
  );
}
