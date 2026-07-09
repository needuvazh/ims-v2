import { assertPermission } from '../../../../lib/auth-guard';
import { getFacultyTrainerContext } from '../../_lib';
import { TrainerOnboardingForm } from '../_components/trainer-onboarding-form';
import { AdminFormPageLayout, Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { Home, Users, UserPlus } from 'lucide-react';

export const metadata = { title: 'Register New Trainer | IMS Admin' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  userId?: string;
}>;

function pickInitialBranchId(
  branchIds: string[],
  defaultBranchId: string | null,
  activeBranchId: string | null,
  availableBranchIds: string[],
) {
  const candidates = [activeBranchId, defaultBranchId, ...branchIds];
  for (const candidate of candidates) {
    if (candidate && availableBranchIds.includes(candidate)) {
      return candidate;
    }
  }
  return availableBranchIds[0] ?? '';
}

function generateTrainerCode(personId: string, username: string) {
  const usernameSeed =
    username
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 6)
      .toUpperCase() || 'TRAINR';
  const personSeed = personId.replace(/-/g, '').slice(0, 4).toUpperCase();
  const randomSeed = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TR-${usernameSeed}-${personSeed}${randomSeed}`;
}

export default async function NewTrainerPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  await assertPermission('trainer.create');
  await assertPermission('trainer.read');

  const { session, authContext } = await getFacultyTrainerContext();
  const selectedUserId = searchParams.userId ?? session.userId;
  const canSearchUsers = session.permissions.includes('iam.user.read');
  const requiresIdentityRead = selectedUserId !== session.userId;
  const allowedBranchIds = authContext.allowedBranchIds.map((branchId) =>
    String(branchId),
  );

  if (requiresIdentityRead && !canSearchUsers) {
    await assertPermission('iam.user.read');
  }

  const { organizationService, trainerManagementService, userService } =
    await import('../../../../lib/runtime');

  const [branchResult, selectedUser] = await Promise.all([
    organizationService.listBranches({ pageSize: 1000, status: 'Active' }),
    searchParams.userId
      ? selectedUserId === session.userId
        ? userService.getUser(selectedUserId)
        : userService.getUser(selectedUserId, authContext)
      : Promise.resolve(null),
  ]);

  const branchOptions = branchResult.items
    .filter(
      (branch) =>
        allowedBranchIds.length === 0 ||
        allowedBranchIds.includes(String(branch.id)),
    )
    .map((branch) => ({
      id: String(branch.id),
      branchName: branch.branchName,
      branchCode: branch.branchCode,
    }));

  const initialBranchId = selectedUser
    ? pickInitialBranchId(
        (selectedUser.branchIds ?? []).map((branchId: string) =>
          String(branchId),
        ),
        selectedUser.defaultBranchId
          ? String(selectedUser.defaultBranchId)
          : null,
        session.activeBranchId ? String(session.activeBranchId) : null,
        branchOptions.map((branch) => branch.id),
      )
    : (branchOptions.find((branch) => branch.id === allowedBranchIds[0])?.id ??
      branchOptions[0]?.id ??
      '');

  const existingTrainer = selectedUser
    ? await trainerManagementService.findTrainerByPersonId(
        selectedUser.personId,
        authContext,
      )
    : null;
  const generatedTrainerCode = selectedUser
    ? generateTrainerCode(selectedUser.personId, selectedUser.username)
    : null;

  return (
    <AdminFormPageLayout>
      <PageHeader
        title="Register New Trainer"
        backUrl="/faculty/trainers"
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Faculty',
                href: '/faculty/trainers',
                icon: <Users className="h-3.5 w-3.5" />,
              },
              { label: 'Trainers', href: '/faculty/trainers' },
              { label: 'Register', icon: <UserPlus className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />
      <TrainerOnboardingForm
        selectedUser={
          selectedUser
            ? {
                userId: selectedUser.id,
                personId: selectedUser.personId,
                username: selectedUser.username,
                fullName: selectedUser.fullName,
                email: selectedUser.email,
                mobile: selectedUser.phone ?? null,
                status: selectedUser.status,
                defaultBranchId: selectedUser.defaultBranchId ?? null,
                branchIds: selectedUser.branchIds ?? [],
              }
            : null
        }
        selectedUserSearchHint="Search an existing IAM user to begin trainer registration."
        branchOptions={branchOptions}
        initialBranchId={initialBranchId}
        existingTrainer={
          existingTrainer
            ? {
                id: existingTrainer.id,
                trainerCode: existingTrainer.trainerCode,
                status: existingTrainer.status,
                branchName: existingTrainer.branch?.branchName,
                effectiveStartDate: existingTrainer.effectiveStartDate,
                effectiveEndDate: existingTrainer.effectiveEndDate,
              }
            : null
        }
        canSearch={canSearchUsers}
        generatedTrainerCode={generatedTrainerCode}
      />
    </AdminFormPageLayout>
  );
}
