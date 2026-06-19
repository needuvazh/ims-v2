import bcrypt from 'bcryptjs';
import { encodeSession, type Session } from '@ims/shared-auth';
import { DomainError } from '@ims/shared-kernel';
import type { UserWithCredentials } from '../domain/user';
import { signInCommandSchema, type SignInCommand } from '../domain/user';

export interface AuthUserRepository {
  findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null>;
  recordLastLogin(userId: string): Promise<void>;
}

export type SignInResult = {
  sessionToken: string;
  session: Session;
};

/**
 * AuthService — handles credential verification and session issuance.
 * Business rules:
 *  - Inactive or Draft users cannot sign in.
 *  - Locked users cannot sign in (must be unlocked by admin).
 *  - Invalid credentials: always throw a generic error to prevent user enumeration.
 */
export class AuthService {
  constructor(private readonly userRepository: AuthUserRepository) {}

  async signIn(command: SignInCommand): Promise<SignInResult> {
    const validated = signInCommandSchema.parse(command);

    const user = await this.userRepository.findByEmailWithCredentials(validated.email);

    // Generic error — do not reveal whether email exists.
    const invalidError = new DomainError('unauthorized', 'Invalid email or password.');

    if (!user) throw invalidError;

    if (user.status === 'Inactive' || user.status === 'Draft') {
      throw new DomainError('forbidden', 'Your account is not active. Contact your administrator.');
    }

    if (user.status === 'Locked') {
      throw new DomainError('forbidden', 'Your account is locked. Contact your administrator.');
    }

    const passwordMatch = await bcrypt.compare(validated.password, user.passwordHash);
    if (!passwordMatch) throw invalidError;

    await this.userRepository.recordLastLogin(user.id);

    const session: Session = {
      userId: user.id,
      displayName: user.fullName,
      roles: user.roles,
      permissions: user.permissions,
      activeBranchId: null,
    };

    const sessionToken = await encodeSession(session);

    return { sessionToken, session };
  }

  static async hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, 12);
  }

  static async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
