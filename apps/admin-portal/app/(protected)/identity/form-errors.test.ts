import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { DomainError } from '@ims/shared-kernel';
import { buildIdentityActionFailure } from './form-errors';

describe('identity form error mapping', () => {
  it('maps domain duplicate errors to the configured field', () => {
    const failure = buildIdentityActionFailure(
      new DomainError('conflict', 'A user with that email already exists.'),
      'Failed to create user.',
      { email: 'admin@ims.com' },
      { domain: { conflict: 'email' } },
    );

    expect(failure.error).toBe('A user with that email already exists.');
    expect(failure.fieldErrors?.email).toBe('A user with that email already exists.');
  });

  it('maps prisma unique constraint errors to the configured field message', () => {
    const error = Object.create(Prisma.PrismaClientKnownRequestError.prototype) as Prisma.PrismaClientKnownRequestError;
    error.code = 'P2002';
    error.meta = { target: ['roleCode'] };

    const failure = buildIdentityActionFailure(
      error,
      'Failed to create role.',
      { roleCode: 'SUPER_ADMIN' },
      {
        prisma: { roleCode: 'roleCode' },
        prismaMessages: { roleCode: 'Role code already exists. Please use a different role code.' },
      },
    );

    expect(failure.error).toBe('This value already exists. Please use a different value.');
    expect(failure.fieldErrors?.roleCode).toBe('Role code already exists. Please use a different role code.');
  });
});
