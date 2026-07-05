'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Activity, Clock3, ExternalLink, Search, ShieldCheck, X } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  EmptyState,
  FormLabel,
  Input,
  ResponsiveDataTable,
} from '@ims/shared-ui';
import { terminateSessionAction } from '../actions';

type SortOrder = 'asc' | 'desc';

interface SessionItem {
  id: string;
  userId: string;
  userEmail: string;
  activeBranchId: string | null;
  status: string;
  expiresAt: string;
  lastActivityAt: string;
  userAgent: string | null;
  ipAddress: string | null;
}

interface SessionsClientListProps {
  sessions: SessionItem[];
  userEmail: string | null;
  userId: string | null;
  initialQuery: string;
  initialSortBy: string;
  initialSortOrder: SortOrder;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function compareText(a: string | null | undefined, b: string | null | undefined) {
  return collator.compare(a ?? '', b ?? '');
}

function getStatusVariant(status: string) {
  return status === 'Active' ? 'success' : 'muted';
}

export function SessionsClientList({
  sessions,
  userEmail,
  userId,
  initialQuery,
  initialSortBy,
  initialSortOrder,
}: SessionsClientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  const currentSortBy = searchParams.get('sortBy') ?? initialSortBy ?? 'lastActivityAt';
  const currentSortOrder = (searchParams.get('sortOrder') as SortOrder | null) ?? initialSortOrder;

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  const handleSearch = () => {
    startTransition(() => {
      updateParams({ query: searchValue || null, page: '1' });
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSort = (field: string) => {
    const nextOrder: SortOrder = currentSortBy === field && currentSortOrder === 'asc' ? 'desc' : 'asc';
    updateParams({ sortBy: field, sortOrder: nextOrder, page: '1' });
  };

  const sortedSessions = [...sessions].sort((left, right) => {
    const direction = currentSortOrder === 'asc' ? 1 : -1;

    switch (currentSortBy) {
      case 'status':
        return compareText(left.status, right.status) * direction;
      case 'ipAddress':
        return compareText(left.ipAddress, right.ipAddress) * direction;
      case 'expiresAt':
        return (new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime()) * direction;
      case 'lastActivityAt':
      default:
        return (new Date(left.lastActivityAt).getTime() - new Date(right.lastActivityAt).getTime()) * direction;
    }
  });

  const columns = [
    {
      header: 'Session',
      render: (item: SessionItem) => <span className="font-mono text-xs text-slate-600">{item.id}</span>,
      headerClassName: 'w-[180px]',
    },
    {
      header: 'Branch',
      render: (item: SessionItem) => <span className="text-sm text-slate-700">{item.activeBranchId ?? 'All Branches'}</span>,
    },
    {
      header: 'Status',
      sortable: true,
      sortDirection: currentSortBy === 'status' ? currentSortOrder : null,
      onSort: () => handleSort('status'),
      render: (item: SessionItem) => <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>,
      headerClassName: 'w-[110px]',
    },
    {
      header: 'Last Activity',
      sortable: true,
      sortDirection: currentSortBy === 'lastActivityAt' ? currentSortOrder : null,
      onSort: () => handleSort('lastActivityAt'),
      render: (item: SessionItem) => <span className="text-sm text-slate-600">{new Date(item.lastActivityAt).toLocaleString()}</span>,
    },
    {
      header: 'Expires',
      sortable: true,
      sortDirection: currentSortBy === 'expiresAt' ? currentSortOrder : null,
      onSort: () => handleSort('expiresAt'),
      render: (item: SessionItem) => <span className="text-sm text-slate-600">{new Date(item.expiresAt).toLocaleString()}</span>,
    },
    {
      header: 'IP Address',
      sortable: true,
      sortDirection: currentSortBy === 'ipAddress' ? currentSortOrder : null,
      onSort: () => handleSort('ipAddress'),
      render: (item: SessionItem) => <span className="text-sm text-slate-600">{item.ipAddress ?? '—'}</span>,
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (item: SessionItem) => (
        <div className="flex items-center justify-end gap-2">
          <form action={terminateSessionAction}>
            <input type="hidden" name="sessionId" value={item.id} />
            <Button type="submit" size="sm" variant="ghost">Terminate</Button>
          </form>
          <Link href={`/iam/users/${item.userId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
      headerClassName: 'text-right w-[180px]',
    },
  ];

  const renderCard = (item: SessionItem) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">{item.id}</p>
            <p className="text-sm font-bold text-[var(--ims-ink)]">{item.activeBranchId ?? 'All Branches'}</p>
          </div>
          <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-card-p text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Last Activity</p>
            <p className="truncate">{new Date(item.lastActivityAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Expires</p>
            <p className="truncate">{new Date(item.expiresAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">IP Address</p>
            <p className="truncate">{item.ipAddress ?? '—'}</p>
          </div>
          <div className="col-span-2">
            <p className="font-semibold text-[var(--ims-muted)]">User Agent</p>
            <p className="line-clamp-2 text-slate-600">{item.userAgent ?? '—'}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0">
        <div className="flex w-full gap-2">
          <form action={terminateSessionAction} className="flex-1">
            <input type="hidden" name="sessionId" value={item.id} />
            <Button type="submit" size="sm" variant="outline" className="w-full">Terminate</Button>
          </form>
          <Link href={`/iam/users/${item.userId}`} className="flex-1">
            <Button size="sm" variant="ghost" className="w-full">Open user</Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="flex items-center gap-2 text-page-title font-bold tracking-tight text-[var(--ims-ink)]">
            <Activity className="h-6 w-6 shrink-0 text-indigo-600 sm:h-8 sm:w-8" />
            Active Sessions
          </h1>
          <p className="max-w-2xl text-sm text-[var(--ims-muted)]">
            Inspect and manage user sessions across the platform.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            User ID or Email
          </FormLabel>
          <div className="relative">
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter user ID or email to inspect sessions..."
              leftIcon={<Search className="h-4 w-4" />}
              className="h-12 pr-10"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue('');
                  updateParams({ query: null });
                }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full text-[color:var(--ims-muted)] transition-colors hover:text-[color:var(--ims-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-end">
          <Button
            onClick={handleSearch}
            disabled={isPending}
            className="h-12 w-full gap-1.5 bg-indigo-600 hover:bg-indigo-700 sm:w-auto sm:px-4"
          >
            <Clock3 className="h-4 w-4" />
            {isPending ? 'Loading...' : 'Load Sessions'}
          </Button>
        </div>
      </div>

      {!searchValue ? (
        <EmptyState
          icon={<Clock3 className="h-6 w-6" />}
          title="No user selected"
          description="Enter a user ID or email to inspect active sessions, or open the user profile screen to manage them from the user context."
        />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<Activity className="h-6 w-6" />}
          title="No sessions found"
          description={`No active sessions were found for ${userEmail || searchValue}.`}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase text-[color:var(--ims-muted)]">
              <Activity className="h-4 w-4" />
              {sessions.length} session(s) for {userEmail || searchValue}
            </h3>
          </div>

          <ResponsiveDataTable
            data={sortedSessions}
            columns={columns}
            renderCard={renderCard}
            keyExtractor={(item) => item.id}
            emptyState={null}
          />
        </>
      )}
    </div>
  );
}
