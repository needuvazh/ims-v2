export interface INotificationPort {
  sendActivationEmail(
    recipientEmail: string,
    activationData: { firstName: string; activationLink: string; expiresAt: Date }
  ): Promise<void>;

  sendPasswordResetEmail(
    recipientEmail: string,
    resetData: { firstName: string; expiresAt: Date }
  ): Promise<void>;

  sendAccountLockedNotification(
    adminEmails: string[],
    userData: { displayName: string; failedAttempts: number; lockedUntil: Date }
  ): Promise<void>;

  sendRoleAssignedNotification(
    recipientEmail: string,
    roleData: { roleName: string }
  ): Promise<void>;

  sendBranchAssignedNotification(
    recipientEmail: string,
    branchData: { branchName: string }
  ): Promise<void>;
}
