import { createWriteStream } from 'fs';
import { mkdir, access } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { finished } from 'stream/promises';
import { prisma } from '@ims/database';
import { createStructuredLogger } from '@ims/observability';

type ExportJobRecord = {
  id: string;
  reportType: string;
  requestedBy: string;
  branchId: string | null;
  filters: unknown;
  format: 'CSV' | 'XLSX' | 'PDF';
  status: 'Pending' | 'Processing' | 'Done' | 'Failed';
  fileUrl: string | null;
  errorMessage: string | null;
};

type ExportRow = Record<string, string | number | boolean | null>;

const logger = createStructuredLogger({});

function toCsvValue(value: string | number | boolean | null): string {
  if (value === null) return '';
  const text = String(value);
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsv(rows: ExportRow[]): string {
  if (rows.length === 0) {
    return 'empty\n';
  }

  const headers = Object.keys(rows[0] ?? {});
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => toCsvValue(row[header] ?? null)).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function normalizeBranchFilter(branchId: string | null): string | undefined {
  return branchId ?? undefined;
}

async function readRows(job: ExportJobRecord): Promise<ExportRow[]> {
  const branchId = normalizeBranchFilter(job.branchId);

  switch (job.reportType) {
    case 'user-directory': {
      const users = await prisma.user.findMany({
        where: branchId
          ? {
              OR: [{ defaultBranchId: branchId }, { branchAccess: { some: { branchId, status: 'Active' } } }],
            }
          : undefined,
        include: {
          person: true,
          roles: { include: { role: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      });

      return users.map((user) => ({
        userId: user.id,
        username: user.username,
        email: user.email,
        status: user.status,
        fullName: `${user.person.firstName} ${user.person.lastName}`.trim(),
        mobile: user.person.mobile,
        defaultBranchId: user.defaultBranchId,
        roles: user.roles.map((role) => role.role.roleName).join(' | '),
      }));
    }
    case 'login-history':
    case 'failed-logins': {
      const history = await prisma.loginHistory.findMany({
        where: {
          ...(branchId ? { branchId } : {}),
          ...(job.reportType === 'failed-logins' ? { status: 'Failure' } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      });

      return history.map((entry) => ({
        loginHistoryId: entry.id,
        attemptedEmail: entry.attemptedEmail,
        userId: entry.userId,
        branchId: entry.branchId,
        status: entry.status,
        failureReason: entry.failureReason,
        createdAt: entry.createdAt.toISOString(),
      }));
    }
    case 'roles': {
      const roles = await prisma.role.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5000,
      });

      return roles.map((role) => ({
        roleId: role.id,
        roleCode: role.roleCode,
        roleName: role.roleName,
        status: role.status,
        isSystemRole: role.isSystemRole,
      }));
    }
    case 'permission-matrix': {
      const permissions = await prisma.permission.findMany({
        orderBy: { permissionCode: 'asc' },
        take: 5000,
      });

      return permissions.map((permission) => ({
        permissionId: permission.id,
        permissionCode: permission.permissionCode,
        permissionType: permission.permissionType,
        status: permission.status,
      }));
    }
    case 'branch-access': {
      const access = await prisma.userBranchAccess.findMany({
        where: branchId ? { branchId } : undefined,
        orderBy: { createdAt: 'desc' },
        take: 5000,
      });

      return access.map((entry) => ({
        accessId: entry.id,
        userId: entry.userId,
        branchId: entry.branchId,
        status: entry.status,
        isDefault: entry.isDefault,
        includeChildBranches: entry.includeChildBranches,
      }));
    }
    case 'sessions': {
      const sessions = await prisma.userSession.findMany({
        where: {
          ...(branchId ? { activeBranchId: branchId } : {}),
          status: 'Active',
        },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      });

      return sessions.map((session) => ({
        sessionId: session.id,
        userId: session.userId,
        activeBranchId: session.activeBranchId,
        status: session.status,
        expiresAt: session.expiresAt.toISOString(),
      }));
    }
    case 'audit-trail': {
      const audits = await prisma.auditLog.findMany({
        where: branchId ? { branchId } : undefined,
        orderBy: { performedAt: 'desc' },
        take: 5000,
      });

      return audits.map((entry) => ({
        auditId: entry.id,
        module: entry.module,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        performedBy: entry.performedBy,
        performedAt: entry.performedAt.toISOString(),
        branchId: entry.branchId,
        reason: entry.reason,
      }));
    }
    default:
      return [{ reportType: job.reportType, requestedBy: job.requestedBy, branchId: job.branchId, status: 'unsupported-report-type' }];
  }
}

export class ExportService {
  async export(job: ExportJobRecord): Promise<{ fileUrl: string }> {
    const rows = await readRows(job);
    const exportDir = join(tmpdir(), 'ims-exports');
    await mkdir(exportDir, { recursive: true });

    const extension = job.format.toLowerCase();
    const filePath = join(exportDir, `${job.id}.${extension}`);
    const stream = createWriteStream(filePath, { encoding: 'utf8' });

    stream.write(`# IMS export: ${job.reportType}\n`);
    stream.write(`# format: ${job.format}\n`);
    stream.write(`# requestedBy: ${job.requestedBy}\n`);
    stream.write(`# branchId: ${job.branchId ?? 'all'}\n`);
    stream.write(buildCsv(rows));
    stream.end();

    await finished(stream);

    try {
      await access(filePath);
    } catch (error) {
      logger.error('export.file.missing', { status: 'failed', error: error as Error, entityId: job.id, entityType: job.reportType });
      throw error;
    }

    return { fileUrl: `file://${filePath}` };
  }
}
