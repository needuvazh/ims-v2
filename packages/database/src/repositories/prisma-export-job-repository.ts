import type { PrismaClient } from '@prisma/client';
import type { IExportJobRepository, ExportJobDto } from '@ims/identity-access';
import type { Uuid } from '@ims/shared-kernel';

export class PrismaExportJobRepository implements IExportJobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapJob(row: any): ExportJobDto {
    return {
      id: row.id as Uuid,
      reportType: row.reportType,
      requestedBy: row.requestedBy as Uuid,
      branchId: row.branchId as Uuid | null,
      filters: row.filters,
      format: row.format as ExportJobDto['format'],
      status: row.status as ExportJobDto['status'],
      fileUrl: row.fileUrl,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async create(job: ExportJobDto): Promise<ExportJobDto> {
    const row = await this.prisma.exportJob.create({
      data: {
        id: job.id,
        reportType: job.reportType,
        requestedBy: job.requestedBy,
        branchId: job.branchId,
        filters: job.filters || undefined,
        format: job.format,
        status: job.status,
      },
    });
    return this.mapJob(row);
  }

  async update(job: ExportJobDto): Promise<ExportJobDto> {
    const row = await this.prisma.exportJob.update({
      where: { id: job.id },
      data: {
        status: job.status,
        fileUrl: job.fileUrl,
        errorMessage: job.errorMessage,
      },
    });
    return this.mapJob(row);
  }

  async findById(id: Uuid): Promise<ExportJobDto | null> {
    const row = await this.prisma.exportJob.findUnique({
      where: { id },
    });
    return row ? this.mapJob(row) : null;
  }

  async listByUser(userId: Uuid): Promise<ExportJobDto[]> {
    const rows = await this.prisma.exportJob.findMany({
      where: { requestedBy: userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.mapJob(r));
  }
}
