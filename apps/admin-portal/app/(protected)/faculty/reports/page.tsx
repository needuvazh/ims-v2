import { Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from '@ims/shared-ui';
import { getFacultyTrainerContext } from '../_lib';

export const metadata = { title: 'Faculty Reports | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function FacultyReportsPage(props: { searchParams: Promise<{ reportCode?: string; branchId?: string; status?: string }> }) {
  const searchParams = await props.searchParams;
  const { authContext } = await getFacultyTrainerContext();
  const { trainerManagementService } = await import('../../../lib/runtime');
  const result = await trainerManagementService.listReports(
    searchParams.reportCode ?? 'trainer.roster',
    { branchId: searchParams.branchId, status: searchParams.status },
    { page: 1, pageSize: 20 },
    authContext,
  );
  const rows = result.items as Array<{
    trainerId: string;
    displayNameEn: string;
    trainerCode: string;
    branchName?: string | null;
    branchCode?: string | null;
  }>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 09"
        title="Faculty Reports"
        description="Branch-aware operational views for roster coverage, authorizations, availability, utilization references, and compensation coverage."
      />

      <Card>
        <CardHeader>
          <CardTitle>Report output</CardTitle>
          <CardDescription>{result.total} row(s) available for the selected report code.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((item) => (
            <div key={item.trainerId} className="rounded-2xl border border-[color:var(--ims-border)] p-4 text-sm">
              <p className="font-semibold text-[color:var(--ims-ink)]">{item.displayNameEn}</p>
              <p className="text-[color:var(--ims-muted)]">{item.trainerCode} · {item.branchName ?? item.branchCode}</p>
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-[color:var(--ims-muted)]">No report rows were returned.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
