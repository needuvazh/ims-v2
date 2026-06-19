export type DomainErrorCode =
  | 'invalid_value'
  | 'not_found'
  | 'conflict'
  | 'unauthorized'
  | 'forbidden';

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
