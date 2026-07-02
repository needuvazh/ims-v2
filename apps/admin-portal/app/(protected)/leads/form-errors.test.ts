import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildCrmActionFailure } from './form-errors';

describe('buildCrmActionFailure', () => {
  it('should flatten ZodError', () => {
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: 'invalid' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const failure = buildCrmActionFailure(result.error);
      expect(failure.success).toBe(false);
      expect(failure.status).toBe('VALIDATION_ERROR');
      expect(failure.fieldErrors?.email).toContain('Invalid email');
    }
  });

  it('should handle ERR_CRM_DUPLICATE_LEAD_DETECTED', () => {
    const error = new Error('ERR_CRM_DUPLICATE_LEAD_DETECTED');
    const failure = buildCrmActionFailure(error);
    expect(failure.success).toBe(false);
    expect(failure.status).toBe('DUPLICATE_LEAD_DETECTED');
    expect(failure.error).toContain('A lead or inquiry with this contact information already exists');
  });

  it('should handle ERR_CRM_INVALID_STAGE_TRANSITION in convert context', () => {
    const error = new Error('ERR_CRM_INVALID_STAGE_TRANSITION');
    const failure = buildCrmActionFailure(error, 'convert');
    expect(failure.success).toBe(false);
    expect(failure.status).toBe('DOMAIN_ERROR');
    expect(failure.error).toBe("Only leads in the 'Qualified' stage can be converted to an admission.");
  });

  it('should handle ERR_CRM_INVALID_STAGE_TRANSITION in stage context', () => {
    const error = new Error('ERR_CRM_INVALID_STAGE_TRANSITION');
    const failure = buildCrmActionFailure(error, 'stage');
    expect(failure.success).toBe(false);
    expect(failure.status).toBe('DOMAIN_ERROR');
    expect(failure.error).toBe('Forbidden stage transition. Pipeline rules violated.');
  });

  it('should handle general errors as SYSTEM_ERROR', () => {
    const error = new Error('Something went wrong');
    const failure = buildCrmActionFailure(error);
    expect(failure.success).toBe(false);
    expect(failure.status).toBe('SYSTEM_ERROR');
    expect(failure.error).toBe('Something went wrong');
  });
});
