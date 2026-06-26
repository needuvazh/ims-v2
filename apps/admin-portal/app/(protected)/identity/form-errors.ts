import { Prisma } from '@prisma/client';
import { DomainError } from '@ims/shared-kernel';

export type IdentityActionFailure = {
  error: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

type ErrorFieldMaps = {
  domain?: Record<string, string>;
  prisma?: Record<string, string>;
  prismaMessages?: Record<string, string>;
};

export function extractFormValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  formData.forEach((value, key) => {
    values[key] = value.toString();
  });
  return values;
}

function getPrismaTargetFields(error: Prisma.PrismaClientKnownRequestError): string[] {
  const target = error.meta?.target;

  if (Array.isArray(target)) {
    return target.map((value) => String(value));
  }

  if (typeof target === 'string') {
    return [target];
  }

  return [];
}

function getFieldErrorFromDomainError(error: DomainError, maps?: ErrorFieldMaps): Record<string, string> {
  if (!maps?.domain) {
    return {};
  }

  const fieldName = maps.domain[error.code];
  if (!fieldName) {
    return {};
  }

  return { [fieldName]: error.message };
}

function getFieldErrorFromPrismaError(
  error: Prisma.PrismaClientKnownRequestError,
  maps?: ErrorFieldMaps,
): Record<string, string> {
  if (error.code !== 'P2002' || !maps?.prisma) {
    return {};
  }

  for (const targetField of getPrismaTargetFields(error)) {
    const mappedField = maps.prisma[targetField];
    if (mappedField) {
      const message = maps.prismaMessages?.[targetField]
        ?? 'This value already exists. Please use a different value.';
      return { [mappedField]: message };
    }
  }

  return {};
}

export function buildIdentityActionFailure(
  error: unknown,
  fallbackError: string,
  values: Record<string, string>,
  maps?: ErrorFieldMaps,
): IdentityActionFailure {
  if (error instanceof DomainError) {
    const fieldErrors = getFieldErrorFromDomainError(error, maps);
    return {
      error: error.message,
      fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
      values,
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const fieldErrors = getFieldErrorFromPrismaError(error, maps);
    if (Object.keys(fieldErrors).length > 0) {
      return {
        error: 'This value already exists. Please use a different value.',
        fieldErrors,
        values,
      };
    }
  }

  return {
    error: fallbackError,
    values,
  };
}
