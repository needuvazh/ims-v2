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
  | 'session_revoked'
  | 'invalid_reset_token'
  | 'institute_already_exists'
  | 'institute_code_already_exists'
  | 'branch_code_already_exists'
  | 'department_code_already_exists'
  | 'classroom_name_already_exists'
  | 'branch_cannot_be_deleted'
  | 'referenced_organization_cannot_be_deleted'
  | 'inactive_branch_cannot_be_used'
  | 'inactive_department_cannot_be_used'
  | 'inactive_classroom_cannot_be_used'
  | 'invalid_effective_date_range';

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
