export class AttendanceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'AttendanceError';
  }
}

export function attendanceNotFound(code: string, message: string) {
  return new AttendanceError(code, message, 404);
}

export function attendanceConflict(code: string, message: string) {
  return new AttendanceError(code, message, 409);
}

export function attendanceForbidden(code: string, message: string) {
  return new AttendanceError(code, message, 403);
}

export function attendancePrecondition(code: string, message: string) {
  return new AttendanceError(code, message, 412);
}

