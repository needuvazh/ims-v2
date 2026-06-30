import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
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

      const filePath = job.fileUrl.startsWith('file://') ? job.fileUrl.substring(7) : job.fileUrl;
      let fileBuffer: Buffer;
      try {
        fileBuffer = await fs.readFile(filePath);
      } catch (err) {
        logger.error('api.exportJobs.download.file_missing', { status: 'failed', error: err as Error, details: { filePath } } as any);
        return problemJson(404, 'Export file not found', 'The exported file could not be found on the server.', 'IAM-EXPORT-FILE-MISSING');
      }

      const extension = filePath.split('.').pop() || 'csv';
      let contentType = 'text/csv';
      if (extension === 'xlsx') {
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (extension === 'pdf') {
        contentType = 'application/pdf';
      }

      const response = new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${job.reportType}-${job.id}.${extension}"`,
        },
      });

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
