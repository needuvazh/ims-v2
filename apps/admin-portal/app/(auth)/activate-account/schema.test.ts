import { describe, expect, it } from 'vitest';
import { activateAccountSchema } from './schema';

describe('activate account schema', () => {
  it('rejects a missing token', () => {
    expect(activateAccountSchema.safeParse({ token: '' }).success).toBe(false);
  });
});
