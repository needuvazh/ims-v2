import type { Dispatch, SetStateAction } from 'react';

type ValidatedControl = HTMLInputElement | HTMLSelectElement;

export function getFieldValidationMessage(
  control: ValidatedControl,
  label: string,
  type?: string,
): string {
  if (control.validity.valueMissing) {
    return `${label} is required.`;
  }

  if ('type' in control && control.validity.typeMismatch) {
    if (type === 'email') {
      return `Please enter a valid ${label.toLowerCase()}.`;
    }

    if (type === 'url') {
      return `Please enter a valid ${label.toLowerCase()}.`;
    }

    return `Please enter a valid ${label.toLowerCase()}.`;
  }

  if (control.validity.patternMismatch) {
    return `${label} cannot be empty.`;
  }

  if ('type' in control && control.validity.rangeUnderflow) {
    const input = control as HTMLInputElement;
    return `${label} must be at least ${input.min}.`;
  }

  if ('type' in control && control.validity.rangeOverflow) {
    const input = control as HTMLInputElement;
    return `${label} must be at most ${input.max}.`;
  }

  if ('type' in control && control.validity.badInput) {
    return `Please enter a valid ${label.toLowerCase()}.`;
  }

  return control.validationMessage || `${label} is invalid.`;
}

export function clearErrorField(
  setFieldErrors: Dispatch<SetStateAction<Record<string, string>>>,
  fieldName: string,
) {
  setFieldErrors((prev) => {
    if (!prev[fieldName]) {
      return prev;
    }

    const next = { ...prev };
    delete next[fieldName];
    return next;
  });
}
