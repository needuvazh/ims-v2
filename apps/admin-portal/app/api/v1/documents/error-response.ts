import { NextResponse } from 'next/server';

export function documentProblemJson(
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

export function documentErrorResponse(error: Error) {
  const msg = error.message;

  let status = 500;
  if (msg === 'DOC_NOT_FOUND' || msg === 'DOC_OWNER_NOT_FOUND' || msg.includes('not found')) {
    status = 404;
  } else if (msg === 'DOC_BRANCH_SCOPE_DENIED') {
    status = 403;
  } else if (msg === 'DOC_BRANCH_MISMATCH' || msg === 'DOC_REJECT_REMARKS_REQUIRED') {
    status = 400;
  }

  return documentProblemJson(
    status,
    'Document Error',
    msg || 'An unexpected error occurred.',
    msg || 'DOCUMENT_UNKNOWN'
  );
}
