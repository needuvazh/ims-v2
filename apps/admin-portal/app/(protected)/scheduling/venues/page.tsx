import Link from 'next/link';
import { Home, MapPinned, Plus, ShieldAlert } from 'lucide-react';
import {
  AdminListPageLayout,
  Breadcrumbs,
  Button,
  DataTableFilter,
  PageHeader,
} from '@ims/shared-ui';
import { loadVenueManagementData } from '../data';
import { VenueManagementClient } from '../_components/venue-management-client';

export const metadata = { title: 'Venue Management | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function VenueManagementPage(props: {
  searchParams: Promise<{
    q?: string;
    branchId?: string;
    classroomId?: string;
    status?: 'Active' | 'Cancelled';
  }>;
}) {
  const searchParams = await props.searchParams;
  const data = await loadVenueManagementData(searchParams);

  return (
    <AdminListPageLayout>
      <PageHeader
        eyebrow="Scheduling"
        title="Venue management"
        description="Protect classrooms and branches with hard time blocks before conflicts are published."
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
          <Link href="#create-venue-block">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New block
            </Button>
          </Link>
        }
      />

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

      <div id="create-venue-block">
        <VenueManagementClient
          branches={data.branches}
          classrooms={data.classrooms}
          venueBlocks={data.venueBlocks.map((block) => ({
            ...block,
            blockDate: block.blockDate.toISOString(),
          }))}
          defaultBranchId={data.selectedBranchId ?? data.branches[0]?.id ?? null}
        />
      </div>
    </AdminListPageLayout>
  );
}
