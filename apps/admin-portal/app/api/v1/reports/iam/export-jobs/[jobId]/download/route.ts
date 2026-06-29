import { NextResponse } from 'next/server';
import { DomainError, type Uuid } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { assertPermission } from '../../../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../../../lib/observability';

function problemJson(status: number, title: string, detail: string, errorCode: string) {
  return NextResponse.json({ type: 'https://ims.local/problems/export-job-download', title, status, detail, errorCode }, { status });
}

export async function GET(request: Request, context: any) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = await context.params;
    try {
      await assertPermission('iam.user.read');
      const { exportJobRepository } = await import('../../../../../../../lib/runtime');
      const job = await exportJobRepository.findById(params.jobId as Uuid);
      if (!job) return problemJson(404, 'Export job not found', 'Export job does not exist.', 'IAM-SYS-001');
      if (!job.fileUrl) return problemJson(409, 'Export not ready', 'The export file is not available yet.', 'IAM-EXPORT-NOT-READY');

      const response = NextResponse.json({ data: { fileUrl: job.fileUrl } }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/reports/iam/export-jobs/:jobId/download', method: request.method, status: 'success' });
      logger.info('api.exportJobs.download.succeeded', { status: 'success', exportJobId: params.jobId });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Export download failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Export download failed', error.message, error.code.toUpperCase());
      logger.error('api.exportJobs.download.failed', { status: 'failed', error: error as Error, exportJobId: params.jobId });
      return problemJson(500, 'Export download failed', 'Unable to download export at this time.', 'IAM-EXPORT-DOWNLOAD-FAILED');
    }
  }, { route: '/api/v1/reports/iam/export-jobs/:jobId/download' });
}
