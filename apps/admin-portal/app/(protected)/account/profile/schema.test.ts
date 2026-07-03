import { describe, expect, it } from 'vitest';
import { updateProfileFormSchema } from './schema';

describe('updateProfileFormSchema', () => {
  it('accepts the editable profile fields used by the portal form', () => {
    const parsed = updateProfileFormSchema.safeParse({
      fullName: 'Fatima Al-Balushi',
      phone: '+96899112233',
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects a too-short full name', () => {
    const parsed = updateProfileFormSchema.safeParse({
      fullName: 'A',
      phone: '+96899112233',
    });

    expect(parsed.success).toBe(false);
  });
});
