import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
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
    if (values[key]) {
      values[key] = `${values[key]},${value.toString()}`;
    } else {
      values[key] = value.toString();
    }
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

function getFieldErrorFromDomainError(error: any, maps?: ErrorFieldMaps): Record<string, string> {
  if (!maps?.domain) {
    return {};
  }

  const code = error.code || error.errorCode;
  if (!code) {
    return {};
  }

  const fieldName = maps.domain[code];
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

function getFirstFieldName(path: (string | number)[]): string | null {
  if (!path.length) {
    return null;
  }
  return String(path[0]);
}

function getFieldErrorFromZodError(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const fieldName = getFirstFieldName(issue.path);
    if (!fieldName || fieldErrors[fieldName]) {
      continue;
    }
    fieldErrors[fieldName] = issue.message;
  }
  return fieldErrors;
}

export function buildIdentityActionFailure(
  error: unknown,
  fallbackError: string,
  values: Record<string, string>,
  maps?: ErrorFieldMaps,
): IdentityActionFailure {
  if (error instanceof ZodError) {
    return {
      error: fallbackError,
      fieldErrors: getFieldErrorFromZodError(error),
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

  if (error instanceof DomainError || (error instanceof Error && ('errorCode' in error || 'code' in error))) {
    const fieldErrors = getFieldErrorFromDomainError(error, maps);
    return {
      error: error.message,
      fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
      values,
    };
  }

  return {
    error: error instanceof Error ? error.message : fallbackError,
    values,
  };
}
