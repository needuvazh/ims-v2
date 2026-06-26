/**
 * Domain port for password reset notifications.
 * AuthService depends on this interface — concrete adapters live in infrastructure.
 *
 * Phase 1: ConsolePasswordResetPort (dev-safe stub in apps/admin-portal/app/lib/)
 * Phase 2: EmailPasswordResetPort (SMTP / SaaS email provider)
 */
export interface PasswordResetNotificationPort {
  /**
   * Deliver the password reset link to the user.
   * Implementations must NEVER log the rawResetUrl in structured logs.
   * The raw token is embedded in resetUrl — treat it as a secret.
   */
  sendPasswordResetLink(params: {
    toEmail: string;
    resetUrl: string;
  }): Promise<void>;
}
