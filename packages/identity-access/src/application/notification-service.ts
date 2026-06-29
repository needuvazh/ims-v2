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
        if (notif.type === 'user.created' || notif.type === 'user.activation_resent') {
          await this.notificationPort.sendActivationEmail(notif.recipientEmail, {
            firstName: notif.recipientEmail.split('@')[0], // fallback display name
            activationLink: notif.metadata?.activationLink || '',
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour default
          });
        } else if (notif.type === 'user.password_reset_admin' || notif.type === 'user.password_reset_requested') {
          await this.notificationPort.sendPasswordResetEmail(notif.recipientEmail, {
            firstName: notif.recipientEmail.split('@')[0],
            resetLink: notif.metadata?.resetLink || '',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins default
          });
        } else {
          // General generic message log / sending activation email for other types
          await this.notificationPort.sendActivationEmail(notif.recipientEmail, {
            firstName: 'User',
            activationLink: notif.body,
            expiresAt: new Date(),
          });
        }

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
}
