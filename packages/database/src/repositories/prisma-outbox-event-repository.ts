import type { PrismaClient } from '@prisma/client';
import type { IOutboxEventRepository, OutboxEventDto } from '@ims/identity-access';
import type { Uuid } from '@ims/shared-kernel';

export class PrismaOutboxEventRepository implements IOutboxEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapEvent(row: any): OutboxEventDto {
    return {
      id: row.id as Uuid,
      eventType: row.eventType,
      payload: row.payload,
      status: row.status as OutboxEventDto['status'],
      createdAt: row.createdAt,
      processedAt: row.processedAt,
      retryCount: row.attempts,
    };
  }

  async publish(event: OutboxEventDto): Promise<OutboxEventDto> {
    const row = await this.prisma.outboxEvent.create({
      data: {
        id: event.id,
        eventType: event.eventType,
        aggregateType: 'iam',
        aggregateId: event.id,
        payload: event.payload || {},
        status: event.status,
        availableAt: event.createdAt || new Date(),
        attempts: event.retryCount,
        createdAt: event.createdAt || new Date(),
      },
    });
    return this.mapEvent(row);
  }

  async claimPending(limit: number): Promise<OutboxEventDto[]> {
    const rows = await this.prisma.outboxEvent.findMany({
      where: { status: 'Pending' },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.mapEvent(r));
  }

  async update(event: OutboxEventDto): Promise<OutboxEventDto> {
    const row = await this.prisma.outboxEvent.update({
      where: { id: event.id },
      data: {
        status: event.status,
        processedAt: event.processedAt,
        attempts: event.retryCount,
      },
    });
    return this.mapEvent(row);
  }

  async markProcessed(id: Uuid): Promise<OutboxEventDto> {
    const row = await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: 'Processed',
        processedAt: new Date(),
      },
    });
    return this.mapEvent(row);
  }

  async markFailed(id: Uuid, lastError?: string | null): Promise<OutboxEventDto> {
    const row = await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: 'Failed',
        lastError: lastError ?? null,
        attempts: { increment: 1 },
      },
    });
    return this.mapEvent(row);
  }
}
