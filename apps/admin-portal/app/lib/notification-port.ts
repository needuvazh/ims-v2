/**
 * Phase 1 stub for PasswordResetNotificationPort.
 *
 * In development:  Prints the reset link to stdout so developers can use it.
 * In production:  Logs a warning only — email provider not yet configured.
 *
 * IMPORTANT: The reset URL contains a raw token — this stub only logs the
 * full URL when NODE_ENV !== 'production'. In production the token is never
 * written to any log sink until a real email provider is injected (Phase 2).
 *
 * Replace this with an SMTP / SendGrid / Postmark adapter in Phase 2.
 */
import type { PasswordResetNotificationPort } from '@ims/identity-access';

export class ConsolePasswordResetPort implements PasswordResetNotificationPort {
  async sendPasswordResetLink({
    toEmail,
    resetUrl,
  }: {
    toEmail: string;
    resetUrl: string;
  }): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      // Phase 1: Email provider not yet integrated.
      // The reset link is NOT delivered in production until Phase 2.
      // Log only non-sensitive metadata.
      console.warn(
        JSON.stringify({
          level: 'warn',
          event: 'identity.password_reset_email_not_sent',
          reason: 'Email provider not configured (Phase 1).',
          timestamp: new Date().toISOString(),
        }),
      );
      return;
    }

    // Development only — safe to print the full link to local stdout.
    // This output never reaches a log aggregator in local dev.
    process.stdout.write(
      [
        '',
        '════════════════════════════════════════════════════════',
        '[DEV] Password Reset Link Generated',
        `  To:  ${toEmail}`,
        `  URL: ${resetUrl}`,
        '════════════════════════════════════════════════════════',
        '',
      ].join('\n'),
    );
  }
}
