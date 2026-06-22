export type DomainErrorCode =
  | 'invalid_value'
  | 'not_found'
  | 'conflict'
  | 'unauthorized'
  | 'forbidden'
  | 'precondition_failed'
  | 'inactive_user_cannot_login'
  | 'locked_user_cannot_login'
  | 'role_assigned_to_active_users'
  | 'permission_not_active'
  | 'branch_scope_violation'
  | 'counselor_scope_violation'
  | 'session_expired'
  | 'session_revoked';

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
