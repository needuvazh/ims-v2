import { AdminListPageLayout } from '@ims/shared-ui';
import { loadOrganizationData } from '@/app/(protected)/organization/shared-data';
import { InstitutesClientList } from './_components/institutes-client-list';

export const metadata = { title: 'Institutes - Organization | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function InstitutesPage(props: {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    q?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const data = await loadOrganizationData();

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <InstitutesClientList
        institutes={data.institutes.map((inst) => ({
          id: inst.id,
          instituteCode: inst.instituteCode,
          instituteName: inst.instituteName,
          registrationNumber: inst.registrationNumber,
          taxNumber: inst.taxNumber,
          primaryEmail: inst.primaryEmail,
          primaryPhone: inst.primaryPhone,
          website: inst.website,
          country: inst.country,
          status: inst.status,
        }))}
        initialSearch={searchParams.q || ''}
        initialStatus={searchParams.status || ''}
        initialSortBy={searchParams.sortBy || 'instituteName'}
        initialSortOrder={searchParams.sortOrder === 'desc' ? 'desc' : 'asc'}
        initialPage={parseInt(searchParams.page || '1', 10) || 1}
        initialLimit={parseInt(searchParams.limit || '10', 10) || 10}
      />
    </AdminListPageLayout>
  );
}
