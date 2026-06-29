import type { INotificationRepository, NotificationDto } from '../domain/repositories';
import type { INotificationPort } from '../domain/notification-port';

export class NotificationService {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly notificationPort: INotificationPort
  ) {}

  async processPendingNotifications(limit: number = 20): Promise<number> {
    const pending = await this.notificationRepository.listPending(limit);
    let processedCount = 0;

    for (const notif of pending) {
      try {
        await this.dispatchNotification(notif);
        notif.status = 'Sent';
        notif.providerResponse = { success: true, dispatchedAt: new Date().toISOString() };
      } catch (err: any) {
        notif.status = 'Failed';
        notif.providerResponse = { success: false, error: err.message || String(err) };
      }

      await this.notificationRepository.update(notif);
      processedCount++;
    }

    return processedCount;
  }

  async sendNotification(notification: NotificationDto): Promise<NotificationDto> {
    const created = await this.notificationRepository.create(notification);
    try {
      await this.dispatchNotification(created);
      created.status = 'Sent';
      created.providerResponse = { success: true, dispatchedAt: new Date().toISOString() };
    } catch (err: any) {
      created.status = 'Failed';
      created.providerResponse = { success: false, error: err.message || String(err) };
    }

    return this.notificationRepository.update(created);
  }

  private async dispatchNotification(notif: NotificationDto): Promise<void> {
    if (notif.type === 'user.created' || notif.type === 'user.activation_resent') {
      await this.notificationPort.sendActivationEmail(notif.recipientEmail, {
        firstName: notif.recipientEmail.split('@')[0],
        activationLink: notif.metadata?.activationLink || notif.body,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      return;
    }

    if (notif.type === 'user.password_reset_admin' || notif.type === 'user.password_reset_requested') {
      await this.notificationPort.sendPasswordResetEmail(notif.recipientEmail, {
        firstName: notif.recipientEmail.split('@')[0],
        resetLink: notif.metadata?.resetLink || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${notif.metadata?.resetToken || ''}`,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });
      return;
    }

    await this.notificationPort.sendActivationEmail(notif.recipientEmail, {
      firstName: 'User',
      activationLink: notif.body,
      expiresAt: new Date(),
    });
  }
}
