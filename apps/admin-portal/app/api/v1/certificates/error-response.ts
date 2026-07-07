import { NextResponse } from 'next/server';
import { ErrorCodes } from '@ims/certificates';

export function certificateProblemJson(
  status: number,
  title: string,
  detail: string,
  errorCode: string,
  invalidFields?: Array<{ field: string; message: string }>,
) {
  return NextResponse.json(
    {
      success: false,
      errorCode,
      messageEnglish: detail,
      statusCode: status,
      invalidFields,
    },
    { status },
  );
}

export function certificateErrorResponse(error: Error) {
  const msg = error.message;
  const errCode = (error as any).code || '';

  let status = 500;
  if (errCode === ErrorCodes.CERTIFICATE_NOT_FOUND || errCode === ErrorCodes.ENROLLMENT_NOT_FOUND || msg.includes('not found')) {
    status = 404;
  } else if (
    errCode === ErrorCodes.PERMISSION_DENIED ||
    errCode === ErrorCodes.BRANCH_SCOPE_DENIED
  ) {
    status = 403;
  } else if (
    errCode === ErrorCodes.UNAUTHENTICATED
  ) {
    status = 401;
  } else if (
    errCode === ErrorCodes.COMPLETION_NOT_APPROVED ||
    errCode === ErrorCodes.PAYMENT_VALIDATION_FAILED ||
    errCode === ErrorCodes.DUPLICATE_ACTIVE_CERTIFICATE ||
    errCode === ErrorCodes.INVALID_STATE_TRANSITION ||
    errCode === ErrorCodes.VERSION_CONFLICT ||
    errCode === ErrorCodes.REISSUE_REQUEST_ALREADY_OPEN ||
    errCode === ErrorCodes.REISSUE_NOT_APPROVED ||
    errCode === ErrorCodes.REVOCATION_REASON_REQUIRED
  ) {
    status = 400;
  }

  return certificateProblemJson(status, 'Certificate Error', msg || 'An unexpected error occurred.', errCode || 'CERTIFICATE_UNKNOWN');
}
