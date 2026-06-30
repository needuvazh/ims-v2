import { describe, it, expect } from 'vitest';
import { createUserFormSchema, updateUserFormSchema } from './schema';

describe('IAM User form validation schema', () => {
  const validUser = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    mobile: '+96812345678',
    status: 'Active',
    roleIds: ['11111111-1111-1111-1111-111111111111'],
    branchIds: ['22222222-2222-2222-2222-222222222222'],
    defaultBranchId: '22222222-2222-2222-2222-222222222222',
  };

  it('validates a correct user creation payload', () => {
    const result = createUserFormSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it('fails user creation when email is invalid', () => {
    const result = createUserFormSchema.safeParse({
      ...validUser,
      email: 'invalid-email',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe('email');
    }
  });

  it('fails user creation when firstName is too short', () => {
    const result = createUserFormSchema.safeParse({
      ...validUser,
      firstName: 'J',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe('firstName');
    }
  });

  it('fails user creation when mobile phone is invalid format', () => {
    const result = createUserFormSchema.safeParse({
      ...validUser,
      mobile: '123',
    });
    expect(result.success).toBe(false);
  });

  it('fails when default branch is not in branchIds', () => {
    const result = createUserFormSchema.safeParse({
      ...validUser,
      defaultBranchId: '33333333-3333-3333-3333-333333333333',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe('defaultBranchId');
      expect(result.error.issues[0].message).toBe('Default branch must be one of the selected branches.');
    }
  });

  it('fails when effectiveEndDate is before effectiveStartDate', () => {
    const result = createUserFormSchema.safeParse({
      ...validUser,
      effectiveStartDate: '2026-06-30',
      effectiveEndDate: '2026-06-29',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe('effectiveEndDate');
      expect(result.error.issues[0].message).toBe('Effective End Date must be after or equal to Start Date.');
    }
  });

  it('validates a correct update payload without email', () => {
    const updatePayload = {
      ...validUser,
    };
    delete (updatePayload as any).email;
    const result = updateUserFormSchema.safeParse(updatePayload);
    expect(result.success).toBe(true);
  });
});
