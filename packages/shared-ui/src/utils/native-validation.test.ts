import { describe, expect, it, vi } from 'vitest';
import {
  buildRequiredFieldMessage,
  createRequiredInputValidationHandlers,
  validateRequiredInput,
} from './native-validation';

describe('native validation helpers', () => {
  it('builds a label-specific required message', () => {
    expect(buildRequiredFieldMessage('Email Address')).toBe('Email Address is required.');
  });

  it('falls back to a generic required message when the label is missing', () => {
    expect(buildRequiredFieldMessage()).toBe('This field is required.');
  });

  it('applies and clears a custom required message for invalid inputs', () => {
    const handlers = createRequiredInputValidationHandlers('Password');
    const setCustomValidity = vi.fn();
    const input = {
      validity: { valueMissing: true },
      setCustomValidity,
    } as unknown as HTMLInputElement;

    handlers.onInvalidCapture({
      currentTarget: input,
    } as Parameters<typeof handlers.onInvalidCapture>[0]);
    expect(setCustomValidity).toHaveBeenCalledWith('Password is required.');

    handlers.onInput({ currentTarget: input } as Parameters<typeof handlers.onInput>[0]);
    expect(setCustomValidity).toHaveBeenLastCalledWith('');
  });

  it('validates inputs directly for submit-time reporting', () => {
    const setCustomValidity = vi.fn();
    const input = {
      validity: { valueMissing: true },
      setCustomValidity,
    } as unknown as HTMLInputElement;

    expect(validateRequiredInput(input, 'Email Address')).toBe(false);
    expect(setCustomValidity).toHaveBeenCalledWith('Email Address is required.');
  });
});
