import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { DomainError } from '@ims/shared-kernel';
import { buildIdentityActionFailure, extractFormValues } from './form-errors';

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

  it('maps generic errors with errorCode (like IamError) to the configured field', () => {
    class MockIamError extends Error {
      errorCode: string;
      constructor(errorCode: string, message: string) {
        super(message);
        this.errorCode = errorCode;
      }
    }
    const failure = buildIdentityActionFailure(
      new MockIamError('IAM-VAL-001', 'Email already exists'),
      'Failed to create user.',
      { email: 'admin@ims.com' },
      { domain: { 'IAM-VAL-001': 'email' } },
    );

    expect(failure.error).toBe('Email already exists');
    expect(failure.fieldErrors?.email).toBe('Email already exists');
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

  it('extracts form values correctly, concatenating duplicate keys (like checkboxes) with commas', () => {
    const formData = new FormData();
    formData.append('username', 'john_doe');
    formData.append('roles', 'admin');
    formData.append('roles', 'trainer');
    formData.append('roles', 'counselor');

    const result = extractFormValues(formData);
    expect(result.username).toBe('john_doe');
    expect(result.roles).toBe('admin,trainer,counselor');
  });
});
