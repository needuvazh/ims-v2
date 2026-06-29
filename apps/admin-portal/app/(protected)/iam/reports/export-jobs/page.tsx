import React from 'react';
import Link from 'next/link';
import { Breadcrumbs, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ims/shared-ui';
import { Download, FileClock } from 'lucide-react';
import { getSession } from '../../../../lib/auth-guard';

export const metadata = { title: 'Export Jobs | IMS Admin' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ jobId?: string }>;

export default async function IamExportJobsPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const jobId = resolved.jobId?.trim() ?? '';
  const session = await getSession();
  const { exportJobRepository } = await import('../../../../lib/runtime');

  const recentJobs = await exportJobRepository.listByUser(session.userId as never);
  const selectedJob = jobId ? await exportJobRepository.findById(jobId as never) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Reports"
        title="Export Jobs"
        description="Review export status and open completed files."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'IAM', href: '/iam' }, { label: 'Reports', href: '/iam/reports' }, { label: 'Export Jobs' }]} />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileClock className="h-5 w-5" /> Look up a job</CardTitle>
          <CardDescription>Paste an export job id to inspect the current status and download link.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row" action="/iam/reports/export-jobs" method="get">
            <Input name="jobId" label="Export Job ID" placeholder="Paste job id" defaultValue={jobId} />
            <Button type="submit" className="sm:mt-8">Find job</Button>
          </form>
        </CardContent>
      </Card>

      {selectedJob ? (
        <Card>
          <CardHeader>
            <CardTitle>Selected Job</CardTitle>
            <CardDescription>{selectedJob.reportType} export created on {new Date(selectedJob.createdAt).toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={selectedJob.status === 'Done' ? 'success' : selectedJob.status === 'Failed' ? 'error' : 'warning'}>{selectedJob.status}</Badge>
              <span className="font-mono text-xs text-[color:var(--ims-muted)]">{selectedJob.id}</span>
            </div>
            <p>File: {selectedJob.fileUrl ?? 'Not ready yet'}</p>
            {selectedJob.fileUrl ? (
              <Link href={`/api/v1/reports/iam/export-jobs/${selectedJob.id}/download`} className="inline-flex items-center gap-2 font-semibold text-[color:var(--ims-brass)] hover:underline">
                <Download className="h-4 w-4" /> Download export
              </Link>
            ) : (
              <p className="text-[color:var(--ims-muted)]">The download link appears when processing completes.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Recent export jobs</CardTitle>
          <CardDescription>{recentJobs.length} export job(s) requested by the current user.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Report</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{new Date(job.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{job.reportType}</TableCell>
                  <TableCell><Badge variant={job.status === 'Done' ? 'success' : job.status === 'Failed' ? 'error' : 'warning'}>{job.status}</Badge></TableCell>
                  <TableCell>{job.fileUrl ? 'Ready' : 'Pending'}</TableCell>
                  <TableCell>
                    <Link href={{ pathname: '/iam/reports/export-jobs', query: { jobId: job.id } }} className="font-semibold text-[color:var(--ims-brass)] hover:underline">Inspect</Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
