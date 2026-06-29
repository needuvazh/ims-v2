import argon2 from 'argon2';

export interface PasswordPolicyConfig {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecial: boolean;
  historyCount: number;
}

export const DEFAULT_PASSWORD_POLICY_CONFIG: PasswordPolicyConfig = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecial: true,
  historyCount: 10,
};

export class PasswordPolicy {
  constructor(private readonly config: PasswordPolicyConfig = DEFAULT_PASSWORD_POLICY_CONFIG) {}

  public isCompliant(password: string): boolean {
    if (password.length < this.config.minLength) {
      return false;
    }
    if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
      return false;
    }
    if (this.config.requireLowercase && !/[a-z]/.test(password)) {
      return false;
    }
    if (this.config.requireNumbers && !/[0-9]/.test(password)) {
      return false;
    }
    if (this.config.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
      return false;
    }
    // No whitespace only
    if (/^\s*$/.test(password)) {
      return false;
    }
    return true;
  }

  public async isReused(password: string, hashedHistory: string[]): Promise<boolean> {
    // History count check limit
    const historyToCheck = hashedHistory.slice(0, this.config.historyCount);
    for (const hash of historyToCheck) {
      try {
        if (await argon2.verify(hash, password)) {
          return true;
        }
      } catch (err) {
        // Safe fallback or ignore decryption error
      }
    }
    return false;
  }

  public async hash(password: string): Promise<string> {
    return argon2.hash(password);
  }

  public async verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }
}
