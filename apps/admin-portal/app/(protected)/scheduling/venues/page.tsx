import Link from 'next/link';
import { Edit2, Home, MapPinned, Plus, ShieldAlert } from 'lucide-react';
import {
  AdminListPageLayout,
  Badge,
  Breadcrumbs,
  Button,
  DataTableFilter,
  EmptyState,
  PageHeader,
  Pagination,
  SimpleTooltip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ims/shared-ui';
import { loadVenueBlocksPageData } from '../data';

export const metadata = { title: 'Venue Management | IMS Admin' };
export const dynamic = 'force-dynamic';

function formatDate(date: Date) {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function renderBlockPeriod(startDate: Date, endDate: Date) {
  if (startDate.toDateString() === endDate.toDateString()) {
    return formatDate(startDate);
  }

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

export default async function VenueManagementPage(props: {
  searchParams: Promise<{
    q?: string;
    branchId?: string;
    classroomId?: string;
    status?: 'Active' | 'Cancelled';
    page?: string;
    limit?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const data = await loadVenueBlocksPageData({
    q: searchParams.q,
    branchId: searchParams.branchId,
    classroomId: searchParams.classroomId,
    status: searchParams.status,
    page: searchParams.page ? Number(searchParams.page) : 1,
    limit: searchParams.limit ? Number(searchParams.limit) : 10,
  });

  return (
    <AdminListPageLayout>
      <PageHeader
        eyebrow="Scheduling"
        title="Venue management"
        description="Review blocked venues and maintain classroom or branch restrictions before scheduling sessions."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Scheduling', href: '/scheduling', icon: <MapPinned className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Venues', icon: <ShieldAlert className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
        actions={
          <Link href="/scheduling/venues/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New block
            </Button>
          </Link>
        }
      />

      <div className="space-y-4">
        <DataTableFilter
          searchPlaceholder="Search venue blocks by branch, classroom or reason..."
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { value: 'Active', label: 'Active' },
                { value: 'Cancelled', label: 'Cancelled' },
              ],
            },
            ...(data.branches.length > 0
              ? [
                  {
                    key: 'branchId',
                    label: 'Branch',
                    options: data.branches.map((branch) => ({ value: branch.id, label: branch.branchName })),
                  },
                ]
              : []),
            ...(data.classrooms.length > 0
              ? [
                  {
                    key: 'classroomId',
                    label: 'Classroom',
                    options: data.classrooms.map((classroom) => ({
                      value: classroom.id,
                      label: classroom.classroomName,
                    })),
                  },
                ]
              : []),
          ]}
        />

        {data.totalCount === 0 ? (
          <EmptyState
            icon={<MapPinned className="h-6 w-6" />}
            title="No venue blocks found"
            description="Create a block to prevent scheduling sessions in a room or branch during maintenance, events, or closures."
          />
        ) : (
          <>
            <Table data-testid="venue-blocks-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Block period</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.venueBlocks.map((block) => (
                  <TableRow key={block.id} data-testid={`venue-block-row-${block.id}`}>
                    <TableCell className="text-sm">
                      <div className="font-medium text-[color:var(--ims-ink)]">
                        {renderBlockPeriod(block.blockStartDate, block.blockEndDate)}
                      </div>
                      <div className="text-xs text-[color:var(--ims-muted)]">
                        {block.isFullDay ? 'Full-day block' : 'Timed block'}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium text-[color:var(--ims-ink)]">{block.branch.branchName}</div>
                      <div className="text-xs text-[color:var(--ims-muted)]">
                        {block.classroom?.classroomName ?? 'Branch-wide'}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[color:var(--ims-muted)]">
                      {block.isFullDay ? 'All day' : `${block.startTime} - ${block.endTime}`}
                    </TableCell>
                    <TableCell className="max-w-[14rem]">
                      <div className="truncate font-medium text-[color:var(--ims-ink)]" title={block.reasonCode}>
                        {block.reasonCode}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={block.status === 'Active' ? 'success' : 'muted'}>{block.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <SimpleTooltip content="Edit block" side="top">
                        <Link href={`/scheduling/venues/${block.id}/edit`}>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </Link>
                      </SimpleTooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              totalCount={data.totalCount}
              limit={data.limit}
            />
          </>
        )}
      </div>
    </AdminListPageLayout>
  );
}
