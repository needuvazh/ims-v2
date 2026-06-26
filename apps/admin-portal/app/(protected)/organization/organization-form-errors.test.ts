import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { DomainError } from '@ims/shared-kernel';
import { buildOrganizationActionFailure } from './organization-form-errors';

describe('organization form error mapping', () => {
  it('maps zod validation issues to field errors', () => {
    const schema = z.object({
      instituteCode: z.string().min(2, 'Institute Code is required.'),
    });

    const parsed = schema.safeParse({ instituteCode: '' });
    expect(parsed.success).toBe(false);

    const failure = buildOrganizationActionFailure(
      parsed.error,
      'Failed to create institute.',
      { instituteCode: '' },
    );

    expect(failure.error).toBe('Failed to create institute.');
    expect(failure.fieldErrors?.instituteCode).toBe('Institute Code is required.');
  });

  it('maps domain duplicate errors to the specific field', () => {
    const failure = buildOrganizationActionFailure(
      new DomainError('branch_code_already_exists', 'Branch with code BR-01 already exists.'),
      'Failed to create branch.',
      { branchCode: 'BR-01' },
      {
        domain: { branch_code_already_exists: 'branchCode' },
      },
    );

    expect(failure.error).toBe('Branch with code BR-01 already exists.');
    expect(failure.fieldErrors?.branchCode).toBe('Branch with code BR-01 already exists.');
  });

  it('maps prisma duplicate errors to the configured field message', () => {
    const error = Object.create(Prisma.PrismaClientKnownRequestError.prototype) as any;
    error.code = 'P2002';
    error.meta = { target: ['instituteCode'] };

    const failure = buildOrganizationActionFailure(
      error,
      'Failed to create institute.',
      { instituteCode: 'IMS' },
      {
        prisma: { instituteCode: 'instituteCode' },
        prismaMessages: {
          instituteCode: 'Institute Code already exists. Please use a different Institute Code.',
        },
      },
    );

    expect(failure.error).toBe('This value already exists. Please use a different value.');
    expect(failure.fieldErrors?.instituteCode).toBe(
      'Institute Code already exists. Please use a different Institute Code.',
    );
  });
});
