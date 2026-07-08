import { AdminListPageLayout } from '@ims/shared-ui';
import { loadVenueBlocksPageData } from '../data';
import { VenuesClientList } from './_components/venues-client-list';

export const metadata = { title: 'Venue Management | IMS Admin' };
export const dynamic = 'force-dynamic';

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

  const mappedBlocks = data.venueBlocks.map((block) => ({
    id: block.id,
    blockStartDate: block.blockStartDate.toISOString(),
    blockEndDate: block.blockEndDate.toISOString(),
    isFullDay: block.isFullDay,
    startTime: block.startTime,
    endTime: block.endTime,
    reasonCode: block.reasonCode,
    status: block.status as 'Active' | 'Cancelled',
    branch: {
      id: block.branch.id,
      branchName: block.branch.branchName,
    },
    classroom: block.classroom
      ? {
          id: block.classroom.id,
          classroomName: block.classroom.classroomName,
        }
      : null,
  }));

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <VenuesClientList
        venueBlocks={mappedBlocks}
        branches={data.branches}
        classrooms={data.classrooms}
        total={data.totalCount}
        currentPage={data.page}
        kpis={data.kpis}
      />
    </AdminListPageLayout>
  );
}
