import type { INotificationPort } from '../domain/notification-port';

export class DummyNotificationProvider implements INotificationPort {
  async sendActivationEmail(
    recipientEmail: string,
    activationData: { firstName: string; activationLink: string; expiresAt: Date }
  ): Promise<void> {
    console.log(`
=========================================
[EMAIL NOTIFICATION: ACTIVATION]
To: ${recipientEmail}
Subject: Welcome to ASTI IMS
Dear ${activationData.firstName},
Please activate your account by clicking the link below:
 ${activationData.activationLink}
This link will expire at: ${activationData.expiresAt.toISOString()}
=========================================
`);
  }

  async sendPasswordResetEmail(
    recipientEmail: string,
    resetData: { firstName: string; resetLink: string; expiresAt: Date }
  ): Promise<void> {
    console.log(`
=========================================
[EMAIL NOTIFICATION: PASSWORD RESET]
To: ${recipientEmail}
Subject: Password Reset Request
Dear ${resetData.firstName},
A password reset has been requested for your account. Reset here:
 ${resetData.resetLink}
This link will expire at: ${resetData.expiresAt.toISOString()}
=========================================
`);
  }

  async sendAccountLockedNotification(
    adminEmails: string[],
    userData: { displayName: string; failedAttempts: number; lockedUntil: Date }
  ): Promise<void> {
    console.warn(`
=========================================
[ALERT NOTIFICATION: ACCOUNT LOCKED]
Recipients: ${adminEmails.join(', ')}
Subject: Security Alert: Account Locked
The account for user '${userData.displayName}' has been locked due to ${userData.failedAttempts} failed login attempts.
Lockout expires at: ${userData.lockedUntil.toISOString()}
=========================================
`);
  }

  async sendRoleAssignedNotification(
    recipientEmail: string,
    roleData: { roleName: string }
  ): Promise<void> {
    console.log(`
=========================================
[EMAIL NOTIFICATION: ROLE ASSIGNED]
To: ${recipientEmail}
Subject: Role Assigned
You have been assigned the role: ${roleData.roleName}
=========================================
`);
  }

  async sendBranchAssignedNotification(
    recipientEmail: string,
    branchData: { branchName: string }
  ): Promise<void> {
    console.log(`
=========================================
[EMAIL NOTIFICATION: BRANCH ASSIGNED]
To: ${recipientEmail}
Subject: Branch Scope Assigned
You have been granted access to branch: ${branchData.branchName}
=========================================
`);
  }
}
