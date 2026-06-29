import type { PrismaClient } from '@prisma/client';
import type { INotificationRepository, NotificationDto } from '@ims/identity-access';
import type { Uuid } from '@ims/shared-kernel';

export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapNotification(row: any): NotificationDto {
    return {
      id: row.id as Uuid,
      type: row.type,
      recipientUserId: row.recipientUserId as Uuid,
      recipientEmail: row.recipientEmail,
      subject: row.subject,
      body: row.body,
      status: row.status as NotificationDto['status'],
      metadata: row.metadata,
      providerResponse: row.providerResponse,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async create(notification: NotificationDto): Promise<NotificationDto> {
    const row = await this.prisma.notification.create({
      data: {
        id: notification.id,
        type: notification.type,
        recipientUserId: notification.recipientUserId,
        recipientEmail: notification.recipientEmail,
        subject: notification.subject,
        body: notification.body,
        status: notification.status,
        metadata: notification.metadata || undefined,
        providerResponse: notification.providerResponse || undefined,
      },
    });
    return this.mapNotification(row);
  }

  async update(notification: NotificationDto): Promise<NotificationDto> {
    const row = await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: notification.status,
        providerResponse: notification.providerResponse || undefined,
      },
    });
    return this.mapNotification(row);
  }

  async findById(id: Uuid): Promise<NotificationDto | null> {
    const row = await this.prisma.notification.findUnique({
      where: { id },
    });
    return row ? this.mapNotification(row) : null;
  }

  async listPending(limit: number): Promise<NotificationDto[]> {
    const rows = await this.prisma.notification.findMany({
      where: { status: 'Pending' },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.mapNotification(r));
  }
}
