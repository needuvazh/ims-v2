import { PrismaClient, Prisma } from '@prisma/client';
import { Prisma as PrismaTypes } from '@prisma/client';

export interface DomainEventPayload {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export class PrismaOutboxPublisher {
  constructor(private readonly prisma: PrismaClient) {}

  async publish(event: DomainEventPayload, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;

    await client.outboxEvent.create({
      data: {
        id: crypto.randomUUID(),
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: JSON.parse(JSON.stringify(event.payload)) as PrismaTypes.InputJsonValue,
        availableAt: event.occurredAt,
        status: 'Pending',
        attempts: 0,
      },
    });
  }

  async publishMany(events: DomainEventPayload[], tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;

    if (events.length === 0) return;

    await client.outboxEvent.createMany({
      data: events.map((event) => ({
        id: crypto.randomUUID(),
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: JSON.parse(JSON.stringify(event.payload)) as PrismaTypes.InputJsonValue,
        availableAt: event.occurredAt,
        status: 'Pending',
        attempts: 0,
      })),
    });
  }
}

export async function publishOutboxEvent(
  prisma: PrismaClient,
  event: DomainEventPayload,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const publisher = new PrismaOutboxPublisher(prisma);
  await publisher.publish(event, tx);
}
