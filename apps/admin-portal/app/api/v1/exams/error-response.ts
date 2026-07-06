import { NextResponse } from 'next/server';
import {
  EXAM_RESULT_COMPLETION_ERROR_CODES,
  getHttpStatusCodeForErrorCode,
} from '@ims/exam-result-completion';

export function examResultProblemJson(
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

export function examResultErrorResponse(error: Error) {
  const msg = error.message;
  const errCode = (error as any).code || '';

  const errorCodeMap: Record<string, string> = {
    ERR_EXAM_INVALID_STATE: EXAM_RESULT_COMPLETION_ERROR_CODES.EXAM_INVALID_STATE,
    ERR_EXAM_MARKS_INVALID: EXAM_RESULT_COMPLETION_ERROR_CODES.EXAM_MARKS_INVALID,
    ERR_EXAM_DUPLICATE: EXAM_RESULT_COMPLETION_ERROR_CODES.EXAM_DUPLICATE,
    ERR_RESULT_INVALID_STATE: EXAM_RESULT_COMPLETION_ERROR_CODES.RESULT_INVALID_STATE,
    ERR_RESULT_MARKS_INVALID: EXAM_RESULT_COMPLETION_ERROR_CODES.RESULT_MARKS_INVALID,
    ERR_RESULT_DUPLICATE: EXAM_RESULT_COMPLETION_ERROR_CODES.RESULT_DUPLICATE,
    ERR_COMPLETION_INVALID_STATE: EXAM_RESULT_COMPLETION_ERROR_CODES.COMPLETION_INVALID_STATE,
    ERR_COMPLETION_DUPLICATE: EXAM_RESULT_COMPLETION_ERROR_CODES.COMPLETION_DUPLICATE,
    ERR_COMPLETION_EVIDENCE_STALE: EXAM_RESULT_COMPLETION_ERROR_CODES.COMPLETION_EVIDENCE_STALE,
    ERR_COMPLETION_NO_RULE: EXAM_RESULT_COMPLETION_ERROR_CODES.COMPLETION_NO_RULE,
    ERR_APPROVAL_INVALID_STATE: EXAM_RESULT_COMPLETION_ERROR_CODES.APPROVAL_INVALID_STATE,
    ERR_APPROVAL_STAGE_SEQUENCE: EXAM_RESULT_COMPLETION_ERROR_CODES.APPROVAL_STAGE_SEQUENCE,
    ERR_APPROVAL_ACTOR_INELIGIBLE: EXAM_RESULT_COMPLETION_ERROR_CODES.APPROVAL_ACTOR_INELIGIBLE,
  };

  const code = errorCodeMap[errCode] || errCode || 'EXAM_RESULT_COMPLETION_UNKNOWN';
  const status = getHttpStatusCodeForErrorCode(code as any) || 500;

  let messageEn = msg || 'An unexpected error occurred.';

  if (msg.includes('not found') || msg.includes('Not found')) {
    return examResultProblemJson(404, 'Not found', messageEn, EXAM_RESULT_COMPLETION_ERROR_CODES.EXAM_NOT_FOUND);
  }

  return examResultProblemJson(status, 'Error', messageEn, code);
}
