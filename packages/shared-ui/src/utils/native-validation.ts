import type { FormEvent, InvalidEvent, ReactNode } from 'react';

const DEFAULT_REQUIRED_MESSAGE = 'This field is required.';

function getLabelText(label?: ReactNode) {
  if (typeof label === 'string' || typeof label === 'number') {
    return String(label).trim();
  }

  return '';
}

export function buildRequiredFieldMessage(label?: ReactNode) {
  const labelText = getLabelText(label);
  return labelText ? `${labelText} is required.` : DEFAULT_REQUIRED_MESSAGE;
}

export function validateRequiredInput(
  input: HTMLInputElement | null | undefined,
  label?: ReactNode,
) {
  if (!input) {
    return true;
  }

  if (input.validity.valueMissing) {
    input.setCustomValidity(buildRequiredFieldMessage(label));
    return false;
  }

  input.setCustomValidity('');
  return true;
}

export function clearInputValidation(input: HTMLInputElement | null | undefined) {
  input?.setCustomValidity('');
}

export function createRequiredInputValidationHandlers(label?: ReactNode) {
  return {
    onInvalidCapture(event: InvalidEvent<HTMLInputElement>) {
      validateRequiredInput(event.currentTarget, label);
    },
    onInput(event: FormEvent<HTMLInputElement>) {
      clearInputValidation(event.currentTarget);
    },
  };
}
