import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError } from '@ims/shared-kernel';
import { IamError } from '@ims/identity-access';
import { assertPermission } from '../../../../../lib/auth-guard';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../../../lib/observability';

const exportSchema = z.object({
  format: z.enum(['CSV', 'XLSX', 'PDF']).default('CSV'),
  filters: z.record(z.any()).default({}),
});

function problemJson(status: number, title: string, detail: string, errorCode: string, invalidFields?: Array<{ field: string; message: string }>) {
  return NextResponse.json({ type: 'https://ims.local/problems/audit-export', title, status, detail, errorCode, invalidFields }, { status });
}

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    let payload: unknown;
    try { payload = await request.json(); } catch {
      payload = {};
    }
    const parsed = exportSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(400, 'Invalid request body', 'Export request is invalid.', 'IAM-VAL-AUDIT-EXPORT-INVALID_BODY', parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message })));
    }

    try {
      const session = await assertPermission('iam.audit.read');
      const { exportJobRepository } = await import('../../../../../lib/runtime');
      const job = await exportJobRepository.create({
        id: crypto.randomUUID() as import('@ims/shared-kernel').Uuid,
        reportType: 'audit-trail',
        requestedBy: session.userId,
        branchId: session.activeBranchId,
        filters: parsed.data.filters,
        format: parsed.data.format,
        status: 'Pending',
        fileUrl: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = NextResponse.json({ data: { job } }, { status: 202 });
      applyObservabilityResponseHeaders(response.headers, request.headers, { route: '/api/v1/audit/export', method: request.method, status: 'success' });
      logger.info('api.audit.export.succeeded', { status: 'success', exportJobId: job.id });
      return response;
    } catch (error) {
      if (error instanceof IamError) return problemJson(error.statusCode, 'Audit export failed', error.messageEn, error.errorCode);
      if (error instanceof DomainError) return problemJson(400, 'Audit export failed', error.message, error.code.toUpperCase());
      logger.error('api.audit.export.failed', { status: 'failed', error: error as Error });
      return problemJson(500, 'Audit export failed', 'Unable to create audit export at this time.', 'IAM-AUDIT-EXPORT-FAILED');
    }
  }, { route: '/api/v1/audit/export' });
}
