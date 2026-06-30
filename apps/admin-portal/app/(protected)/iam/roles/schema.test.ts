import { describe, it, expect } from 'vitest';
import { createRoleFormSchema, updateRoleFormSchema } from './schema';

describe('IAM Role form validation schema', () => {
  const validRole = {
    roleCode: 'TEACHER',
    roleName: 'Teacher',
    description: 'Instructs courses and batches.',
    status: 'Active',
    effectiveStartDate: '2026-06-30',
    effectiveEndDate: '2026-12-31',
  };

  it('validates a correct role creation payload', () => {
    const result = createRoleFormSchema.safeParse(validRole);
    expect(result.success).toBe(true);
  });

  it('fails role creation when roleCode has invalid characters', () => {
    const result = createRoleFormSchema.safeParse({
      ...validRole,
      roleCode: 'teacher-role',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe('roleCode');
    }
  });

  it('fails role creation when roleName is too short', () => {
    const result = createRoleFormSchema.safeParse({
      ...validRole,
      roleName: 'T',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe('roleName');
    }
  });

  it('fails when effectiveEndDate is before effectiveStartDate', () => {
    const result = createRoleFormSchema.safeParse({
      ...validRole,
      effectiveStartDate: '2026-06-30',
      effectiveEndDate: '2026-06-29',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe('effectiveEndDate');
      expect(result.error.issues[0].message).toBe('Effective End Date must be after or equal to Start Date.');
    }
  });

  it('validates a correct update payload without roleCode', () => {
    const updatePayload = {
      ...validRole,
    };
    delete (updatePayload as any).roleCode;
    const result = updateRoleFormSchema.safeParse(updatePayload);
    expect(result.success).toBe(true);
  });
});
