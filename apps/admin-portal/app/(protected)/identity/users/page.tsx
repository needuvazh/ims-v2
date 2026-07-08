import { AdminListPageLayout } from '@ims/shared-ui';
import { loadIdentityData } from '../shared-data';
import { UsersClientList } from './_components/users-client-list';

export const metadata = { title: 'IAM Users | IMS Admin' };
export const dynamic = 'force-dynamic';

type SortOrder = 'asc' | 'desc';
type SortField =
  | 'fullName'
  | 'branchName'
  | 'roleName'
  | 'userType'
  | 'status'
  | 'lastLoginAt';

function parsePageValue(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function compareText(left: string, right: string, order: SortOrder) {
  const comparison = left.localeCompare(right, undefined, {
    sensitivity: 'base',
  });
  return order === 'asc' ? comparison : -comparison;
}

function compareDate(
  left: string | null,
  right: string | null,
  order: SortOrder,
) {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return order === 'asc' ? leftTime - rightTime : rightTime - leftTime;
}

export default async function IdentityUsersPage(props: {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    q?: string;
    status?: string;
    type?: string;
    branchId?: string;
    roleId?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const data = await loadIdentityData();

  const page = parsePageValue(searchParams.page, 1);
  const limit = parsePageValue(searchParams.limit, 10);
  const q = (searchParams.q || '').trim().toLowerCase();
  const statusFilter = searchParams.status || '';
  const typeFilter = searchParams.type || '';
  const branchFilter = searchParams.branchId || '';
  const roleFilter = searchParams.roleId || '';
  const sortBy = (searchParams.sortBy as SortField | undefined) || 'fullName';
  const sortOrder: SortOrder =
    searchParams.sortOrder === 'desc' ? 'desc' : 'asc';

  const branchById = new Map<string, string>(
    data.branches.map((branch) => [String(branch.id), branch.branchName]),
  );
  const roleById = new Map<string, string>(
    data.roles.map((role: any) => [String(role.id), role.roleName]),
  );

  const users = data.users.map((user: any) => {
    const branchNames = (user.dataScopes ?? []).some(
      (scope: { scopeType: string }) => scope.scopeType === 'All',
    )
      ? ['All Branches']
      : (user.dataScopes ?? [])
          .filter(
            (scope: { scopeType: string; branchId?: string | null }) =>
              scope.scopeType === 'Branch' && scope.branchId,
          )
          .map((scope: { branchId?: string | null }) =>
            scope.branchId
              ? (branchById.get(scope.branchId as string) ??
                String(scope.branchId))
              : 'Branch',
          );

    const roleNames = (user.roleSummaries ?? [])
      .map((role: { roleName: string }) => role.roleName)
      .filter(Boolean);

    return {
      id: String(user.id),
      fullName: String(user.fullName || user.username || 'Unknown user'),
      email: String(user.email || 'No email'),
      phone: user.phone ? String(user.phone) : null,
      userType: String(user.userType || 'Student'),
      status: String(user.status || 'Unknown'),
      lastLoginAt: user.lastLoginAt
        ? new Date(user.lastLoginAt).toISOString()
        : null,
      branchNames,
      roleNames,
    };
  });

  let filteredUsers = users;

  if (q) {
    filteredUsers = filteredUsers.filter((user) => {
      const haystack = [
        user.fullName,
        user.email,
        user.phone ?? '',
        user.id,
        user.userType,
        user.status,
        ...user.branchNames,
        ...user.roleNames,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  if (statusFilter) {
    filteredUsers = filteredUsers.filter(
      (user) => user.status === statusFilter,
    );
  }

  if (typeFilter) {
    filteredUsers = filteredUsers.filter(
      (user) => user.userType === typeFilter,
    );
  }

  if (branchFilter) {
    const selectedBranchName = branchById.get(branchFilter);
    filteredUsers = filteredUsers.filter(
      (user) =>
        user.branchNames.includes('All Branches') ||
        (selectedBranchName
          ? user.branchNames.includes(selectedBranchName)
          : false),
    );
  }

  if (roleFilter) {
    const selectedRoleName = roleById.get(roleFilter);
    filteredUsers = filteredUsers.filter((user) =>
      selectedRoleName ? user.roleNames.includes(selectedRoleName) : false,
    );
  }

  filteredUsers = [...filteredUsers].sort((left, right) => {
    switch (sortBy) {
      case 'branchName':
        return compareText(
          left.branchNames.join(' '),
          right.branchNames.join(' '),
          sortOrder,
        );
      case 'roleName':
        return compareText(
          left.roleNames.join(' '),
          right.roleNames.join(' '),
          sortOrder,
        );
      case 'userType':
        return compareText(left.userType, right.userType, sortOrder);
      case 'status':
        return compareText(left.status, right.status, sortOrder);
      case 'lastLoginAt':
        return compareDate(left.lastLoginAt, right.lastLoginAt, sortOrder);
      case 'fullName':
      default:
        return compareText(left.fullName, right.fullName, sortOrder);
    }
  });

  const totalCount = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * limit;
  const paginatedUsers = filteredUsers.slice(offset, offset + limit);

  const stats = {
    total: users.length,
    active: users.filter((user) => user.status === 'Active').length,
    pending: users.filter((user) => user.status === 'PendingActivation').length,
    locked: users.filter((user) => user.status === 'Locked').length,
  };

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <UsersClientList
        users={paginatedUsers}
        totalCount={totalCount}
        currentPage={currentPage}
        limit={limit}
        stats={stats}
        branches={data.branches.map((branch: any) => ({
          id: String(branch.id),
          name: branch.branchName,
        }))}
        roles={data.roles.map((role: any) => ({
          id: String(role.id),
          name: role.roleName,
        }))}
        currentSearch={searchParams.q || ''}
        currentStatus={statusFilter}
        currentType={typeFilter}
        currentBranchId={branchFilter}
        currentRoleId={roleFilter}
        currentSortBy={sortBy}
        currentSortOrder={sortOrder}
      />
    </AdminListPageLayout>
  );
}
