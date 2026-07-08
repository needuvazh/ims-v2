'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Clock3,
  Eye,
  Lock,
  Search,
  Shield,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  EmptyState,
  FormLabel,
  Input,
  Pagination,
  ResponsiveDataTable,
  Select,
  StatCard,
} from '@ims/shared-ui';

type SortOrder = 'asc' | 'desc';
type SortField =
  | 'fullName'
  | 'branchName'
  | 'roleName'
  | 'userType'
  | 'status'
  | 'lastLoginAt';

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  userType: string;
  status: string;
  lastLoginAt: string | null;
  branchNames: string[];
  roleNames: string[];
};

type UserOption = { id: string; name: string };

type UsersClientListProps = {
  users: UserRow[];
  totalCount: number;
  currentPage: number;
  limit: number;
  stats: {
    total: number;
    active: number;
    pending: number;
    locked: number;
  };
  branches: UserOption[];
  roles: UserOption[];
  currentSearch: string;
  currentStatus: string;
  currentType: string;
  currentBranchId: string;
  currentRoleId: string;
  currentSortBy: SortField;
  currentSortOrder: SortOrder;
};

const userTypeOptions = [
  { value: 'Owner', label: 'Owner' },
  { value: 'Admin', label: 'Admin' },
  { value: 'BranchManager', label: 'Branch Manager' },
  { value: 'Counselor', label: 'Counselor' },
  { value: 'Trainer', label: 'Trainer' },
  { value: 'Accountant', label: 'Accountant' },
  { value: 'AcademicCoordinator', label: 'Academic Coordinator' },
  { value: 'Management', label: 'Management' },
  { value: 'Student', label: 'Student' },
];

const statusOptions = [
  { value: 'PendingActivation', label: 'Pending Activation' },
  { value: 'Active', label: 'Active' },
  { value: 'Locked', label: 'Locked' },
  { value: 'Suspended', label: 'Suspended' },
  { value: 'Archived', label: 'Archived' },
];

export function UsersClientList({
  users,
  totalCount,
  currentPage,
  limit,
  stats,
  branches,
  roles,
  currentSearch,
  currentStatus,
  currentType,
  currentBranchId,
  currentRoleId,
  currentSortBy,
  currentSortOrder,
}: UsersClientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const [searchValue, setSearchValue] = useState(currentSearch);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const nextSearch = searchParams.get('q') || '';
    setSearchValue((current) =>
      current === nextSearch ? current : nextSearch,
    );
  }, [searchParams]);

  useEffect(() => {
    const currentSearchParam = searchParams.get('q') || '';
    if (searchValue === currentSearchParam) {
      return;
    }

    const timeout = setTimeout(() => {
      updateParams({ q: searchValue || null, page: '1' });
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchParams, searchValue, updateParams]);

  const handleSort = (field: SortField) => {
    const nextOrder: SortOrder =
      currentSortBy === field && currentSortOrder === 'asc' ? 'desc' : 'asc';
    updateParams({ sortBy: field, sortOrder: nextOrder, page: '1' });
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Locked':
      case 'Archived':
        return 'error';
      case 'PendingActivation':
        return 'warning';
      case 'Suspended':
        return 'muted';
      default:
        return 'outline';
    }
  };

  const renderBranchBadges = (branchNames: string[]) => {
    if (branchNames.length === 0) {
      return <Badge variant="muted">All Branches</Badge>;
    }

    return branchNames.map((branchName) => (
      <Badge
        key={branchName}
        variant={branchName === 'All Branches' ? 'default' : 'muted'}
      >
        {branchName}
      </Badge>
    ));
  };

  const renderRoleBadges = (roleNames: string[]) => {
    if (roleNames.length === 0) {
      return <span className="text-[color:var(--ims-muted)]">No roles</span>;
    }

    const visibleRoles = roleNames.slice(0, 3);

    return (
      <>
        {visibleRoles.map((roleName) => (
          <Badge key={roleName} variant="default">
            {roleName}
          </Badge>
        ))}
        {roleNames.length > visibleRoles.length && (
          <Badge variant="muted">
            +{roleNames.length - visibleRoles.length} more
          </Badge>
        )}
      </>
    );
  };

  const columns = [
    {
      header: 'User',
      sortable: true,
      sortDirection: currentSortBy === 'fullName' ? currentSortOrder : null,
      onSort: () => handleSort('fullName'),
      render: (user: UserRow) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar fallback={user.fullName} size="sm" />
          <div className="min-w-0">
            <div className="truncate font-semibold text-[color:var(--ims-ink)]">
              {user.fullName}
            </div>
            <div className="truncate text-xs text-[color:var(--ims-muted)]">
              {user.email}
            </div>
            <div className="truncate text-[10px] text-[color:var(--ims-muted)]">
              {user.phone ?? 'No phone'}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Branch',
      sortable: true,
      sortDirection: currentSortBy === 'branchName' ? currentSortOrder : null,
      onSort: () => handleSort('branchName'),
      render: (user: UserRow) => (
        <div className="flex flex-wrap gap-1.5">
          {renderBranchBadges(user.branchNames)}
        </div>
      ),
      className: 'max-w-[220px]',
    },
    {
      header: 'Roles',
      sortable: true,
      sortDirection: currentSortBy === 'roleName' ? currentSortOrder : null,
      onSort: () => handleSort('roleName'),
      render: (user: UserRow) => (
        <div className="flex flex-wrap gap-1.5">
          {renderRoleBadges(user.roleNames)}
        </div>
      ),
      className: 'max-w-[220px]',
    },
    {
      header: 'Type',
      sortable: true,
      sortDirection: currentSortBy === 'userType' ? currentSortOrder : null,
      onSort: () => handleSort('userType'),
      render: (user: UserRow) => (
        <span className="text-[color:var(--ims-muted)]">{user.userType}</span>
      ),
    },
    {
      header: 'Status',
      sortable: true,
      sortDirection: currentSortBy === 'status' ? currentSortOrder : null,
      onSort: () => handleSort('status'),
      render: (user: UserRow) => (
        <Badge variant={statusVariant(user.status)}>{user.status}</Badge>
      ),
      headerClassName: 'w-[140px]',
    },
    {
      header: 'Last Login',
      sortable: true,
      sortDirection: currentSortBy === 'lastLoginAt' ? currentSortOrder : null,
      onSort: () => handleSort('lastLoginAt'),
      render: (user: UserRow) => (
        <span className="text-xs text-[color:var(--ims-muted)]">
          {user.lastLoginAt
            ? new Date(user.lastLoginAt).toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })
            : 'Never'}
        </span>
      ),
      headerClassName: 'w-[170px]',
    },
    {
      header: 'Actions',
      render: (user: UserRow) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/iam/users/${user.id}`)}
          title="View user"
        >
          <ArrowRight className="h-4 w-4 text-slate-500 hover:text-indigo-600" />
        </Button>
      ),
      className: 'text-right',
      headerClassName: 'w-[96px] text-right',
    },
  ];

  const renderCard = (user: UserRow) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-3">
              <Avatar fallback={user.fullName} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[var(--ims-ink)]">
                  {user.fullName}
                </p>
                <p className="truncate text-xs text-[var(--ims-muted)]">
                  {user.email}
                </p>
              </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">
              {user.userType}
            </p>
          </div>
          <Badge variant={statusVariant(user.status)}>{user.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-card-p">
        <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Branch</p>
            <div className="flex flex-wrap gap-1.5">
              {renderBranchBadges(user.branchNames)}
            </div>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Roles</p>
            <div className="flex flex-wrap gap-1.5">
              {renderRoleBadges(user.roleNames)}
            </div>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <p className="font-semibold text-[var(--ims-muted)]">Last login</p>
            <p className="text-[color:var(--ims-ink)]">
              {user.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'Never'}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-[11px]"
          onClick={() => router.push(`/iam/users/${user.id}`)}
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" /> View Details
        </Button>
      </CardFooter>
    </Card>
  );

  const hasVisibleFilters = useMemo(
    () =>
      Boolean(
        currentSearch ||
        currentStatus ||
        currentType ||
        currentBranchId ||
        currentRoleId,
      ),
    [currentBranchId, currentRoleId, currentSearch, currentStatus, currentType],
  );

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-page-title flex items-center gap-2 font-bold tracking-tight text-[var(--ims-ink)]">
            <Shield className="h-6 w-6 shrink-0 text-indigo-600 sm:h-8 sm:w-8" />
            IAM Users
          </h1>
          <p className="mt-1 text-sm text-[var(--ims-muted)]">
            Manage users, branch access, and role assignments.
          </p>
        </div>
        <Link href="/iam/users/create">
          <Button className="h-10 w-10 shrink-0 gap-0 px-0 sm:w-auto sm:px-4">
            <UserPlus className="h-4 w-4 sm:mr-2" />
            <span className="sr-only sm:not-sr-only">Add User</span>
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-5">
        <StatCard
          title="Total Users"
          value={stats.total}
          description="Visible in your branch scope"
          icon={<Users className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Active"
          value={stats.active}
          description="Currently active accounts"
          icon={<UserCheck className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Pending Activation"
          value={stats.pending}
          description="Accounts waiting for setup"
          icon={<Clock3 className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Locked"
          value={stats.locked}
          description="Accounts requiring attention"
          icon={<Lock className="h-5 w-5" />}
          tone="rose"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-6">
        <div className="min-w-0 xl:col-span-2">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Search
          </FormLabel>
          <div className="relative">
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search by name, email, phone, role..."
              leftIcon={<Search className="h-4 w-4" />}
              className="h-12 pr-10"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue('');
                  updateParams({ q: null, page: '1' });
                }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full text-[color:var(--ims-muted)] transition-colors hover:text-[color:var(--ims-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Branch
          </FormLabel>
          <Select
            value={currentBranchId}
            onChange={(event) =>
              updateParams({ branchId: event.target.value, page: '1' })
            }
            options={[
              { value: '', label: 'All Branches' },
              ...branches.map((branch) => ({
                value: branch.id,
                label: branch.name,
              })),
            ]}
            className="h-12"
            placeholder="All Branches"
          />
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Status
          </FormLabel>
          <Select
            value={currentStatus}
            onChange={(event) =>
              updateParams({ status: event.target.value, page: '1' })
            }
            options={[{ value: '', label: 'All Statuses' }, ...statusOptions]}
            className="h-12"
            placeholder="All Statuses"
          />
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Type
          </FormLabel>
          <Select
            value={currentType}
            onChange={(event) =>
              updateParams({ type: event.target.value, page: '1' })
            }
            options={[{ value: '', label: 'All Types' }, ...userTypeOptions]}
            className="h-12"
            placeholder="All Types"
          />
        </div>

        <div className="min-w-0 xl:col-span-1">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Role
          </FormLabel>
          <Select
            value={currentRoleId}
            onChange={(event) =>
              updateParams({ roleId: event.target.value, page: '1' })
            }
            options={[
              { value: '', label: 'All Roles' },
              ...roles.map((role) => ({ value: role.id, label: role.name })),
            ]}
            className="h-12"
            placeholder="All Roles"
          />
        </div>
      </div>

      {hasVisibleFilters && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--ims-muted)]">
          <span className="font-semibold uppercase tracking-[0.18em]">
            Active filters
          </span>
          {currentSearch && <Badge variant="muted">Search</Badge>}
          {currentBranchId && <Badge variant="muted">Branch</Badge>}
          {currentStatus && <Badge variant="muted">Status</Badge>}
          {currentType && <Badge variant="muted">Type</Badge>}
          {currentRoleId && <Badge variant="muted">Role</Badge>}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() =>
              updateParams({
                q: null,
                status: null,
                type: null,
                branchId: null,
                roleId: null,
                page: '1',
              })
            }
          >
            Clear all
          </Button>
        </div>
      )}

      <ResponsiveDataTable
        data={users}
        columns={columns}
        renderCard={renderCard}
        keyExtractor={(user) => user.id}
        emptyState={
          <EmptyState
            icon={<Shield className="h-6 w-6" />}
            title="No users found"
            description="No users match the current search or filter criteria."
          />
        }
      />

      {totalPages > 1 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          limit={limit}
        />
      )}
    </div>
  );
}
