import { NextResponse } from 'next/server';

export function problemJson(
  type: string,
  status: number,
  title: string,
  detail: string,
  errorCode: string,
  invalidFields?: Array<{ field: string; message: string }>,
) {
  return NextResponse.json(
    {
      type,
      title,
      status,
      detail,
      errorCode,
      invalidFields,
    },
    { status },
  );
}

export function zodInvalidFields(
  issues: Array<{ path: (string | number)[]; message: string }>,
) {
  return issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
}
