import { z } from 'zod';

export type ActionFailure = {
  success: false;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  status?: 'DUPLICATE_LEAD_DETECTED' | 'VALIDATION_ERROR' | 'DOMAIN_ERROR' | 'SYSTEM_ERROR';
  duplicateRefId?: string;
};

export function buildCrmActionFailure(error: any): ActionFailure {
  if (error instanceof z.ZodError) {
    return {
      success: false,
      status: 'VALIDATION_ERROR',
      fieldErrors: error.flatten().fieldErrors,
      error: 'Please fix the errors in the form.',
    };
  }

  const message = error?.message || 'An unknown error occurred';

  if (message.includes('ERR_CRM_DUPLICATE_LEAD_DETECTED')) {
    return {
      success: false,
      status: 'DUPLICATE_LEAD_DETECTED',
      error: 'A lead or inquiry with this contact information already exists.',
    };
  }

  // Handle Prisma unique constraint violations (P2002)
  if (error?.code === 'P2002') {
    const target = error.meta?.target || [];
    const fieldErrors: Record<string, string[]> = {};
    if (target.includes('email')) {
      fieldErrors.email = ['A record with this email already exists.'];
    }
    if (target.includes('mobile') || target.includes('phone')) {
      fieldErrors.phone = ['A record with this phone number already exists.'];
    }
    return {
      success: false,
      status: 'VALIDATION_ERROR',
      fieldErrors,
      error: 'A record with this unique information already exists.',
    };
  }

  if (message.includes('ERR_CRM_BRANCH_SCOPE_VIOLATION') || message.includes('ERR_CRM_ASSIGNED_LEAD_SCOPE_VIOLATION')) {
    return {
      success: false,
      status: 'DOMAIN_ERROR',
      error: 'You do not have permission to perform this action in this branch context.',
    };
  }

  if (message.includes('ERR_CRM_WON_PRECONDITIONS_MISSED')) {
    return {
      success: false,
      status: 'DOMAIN_ERROR',
      error: 'Cannot convert lead. Missing preconditions (e.g., email, date of birth, or identity documents).',
    };
  }

  return {
    success: false,
    status: 'SYSTEM_ERROR',
    error: message,
  };
}
