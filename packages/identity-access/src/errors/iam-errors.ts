export class IamError extends Error {
  constructor(
    public readonly errorCode: string,
    public readonly statusCode: number,
    public readonly messageEn: string,
    public readonly messageAr: string,
    public readonly details?: any
  ) {
    super(messageEn);
    this.name = 'IamError';
    Object.setPrototypeOf(this, IamError.prototype);
  }

  public toJSON() {
    return {
      errorCode: this.errorCode,
      statusCode: this.statusCode,
      messageEn: this.messageEn,
      messageAr: this.messageAr,
      details: this.details,
    };
  }
}

export const IAM_ERRORS = {
  // Validation Errors
  'IAM-VAL-001': {
    statusCode: 400,
    messageEn: 'Email already exists',
    messageAr: 'البريد الإلكتروني موجود بالفعل',
  },
  'IAM-VAL-002': {
    statusCode: 400,
    messageEn: 'Mobile already exists',
    messageAr: 'رقم الجوال موجود بالفعل',
  },
  'IAM-VAL-003': {
    statusCode: 400,
    messageEn: 'Username already exists',
    messageAr: 'اسم المستخدم موجود بالفعل',
  },
  'IAM-VAL-004': {
    statusCode: 400,
    messageEn: 'Invalid email format',
    messageAr: 'تنسيق البريد الإلكتروني غير صحيح',
  },
  'IAM-VAL-005': {
    statusCode: 400,
    messageEn: 'Invalid password format',
    messageAr: 'تنسيق كلمة المرور غير صحيح',
  },
  'IAM-VAL-006': {
    statusCode: 400,
    messageEn: 'Passwords do not match',
    messageAr: 'كلمات المرور غير متطابقة',
  },
  'IAM-VAL-007': {
    statusCode: 400,
    messageEn: 'Branch required',
    messageAr: 'الفرع مطلوب',
  },
  'IAM-VAL-008': {
    statusCode: 400,
    messageEn: 'Role required',
    messageAr: 'الدور مطلوب',
  },
  'IAM-VAL-009': {
    statusCode: 400,
    messageEn: 'Password has been reused recently',
    messageAr: 'تم إعادة استخدام كلمة المرور مؤخراً',
  },
  'IAM-VAL-010': {
    statusCode: 400,
    messageEn: 'Cannot archive a system role',
    messageAr: 'لا يمكن أرشفة دور النظام',
  },

  // Authentication Errors
  'IAM-AUTH-001': {
    statusCode: 401,
    messageEn: 'Invalid credentials.',
    messageAr: 'بيانات الاعتماد غير صالحة',
  },
  'IAM-AUTH-002': {
    statusCode: 401,
    messageEn: 'Account locked',
    messageAr: 'الحساب مغلق',
  },
  'IAM-AUTH-003': {
    statusCode: 401,
    messageEn: 'Account suspended',
    messageAr: 'الحساب معلق',
  },
  'IAM-AUTH-004': {
    statusCode: 401,
    messageEn: 'Password expired. Please change your password.',
    messageAr: 'انتهت صلاحية كلمة المرور. يرجى تغيير كلمة المرور الخاصة بك.',
  },
  'IAM-AUTH-005': {
    statusCode: 401,
    messageEn: 'Session expired',
    messageAr: 'انتهت صلاحية الجلسة',
  },
  'IAM-AUTH-006': {
    statusCode: 401,
    messageEn: 'Invalid refresh token',
    messageAr: 'رمز التحديث غير صالح',
  },
  'IAM-AUTH-007': {
    statusCode: 401,
    messageEn: 'Access token expired',
    messageAr: 'انتهت صلاحية رمز الوصول',
  },
  'IAM-AUTH-008': {
    statusCode: 401,
    messageEn: 'Maximum concurrent sessions reached.',
    messageAr: 'تم الوصول إلى الحد الأقصى للجلسات المتزامنة.',
  },

  // Authorization Errors
  'IAM-AUTHZ-001': {
    statusCode: 403,
    messageEn: 'Permission denied',
    messageAr: 'تم رفض الإذن',
  },
  'IAM-AUTHZ-002': {
    statusCode: 403,
    messageEn: 'Branch access denied',
    messageAr: 'تم رفض الوصول إلى الفرع',
  },
  'IAM-AUTHZ-003': {
    statusCode: 403,
    messageEn: 'Dashboard access denied',
    messageAr: 'تم رفض الوصول إلى لوحة القيادة',
  },
  'IAM-AUTHZ-004': {
    statusCode: 403,
    messageEn: 'Report access denied',
    messageAr: 'تم رفض الوصول إلى التقرير',
  },

  // System Errors
  'IAM-SYS-001': {
    statusCode: 500,
    messageEn: 'Unexpected server error',
    messageAr: 'خطأ غير متوقع في الخادم',
  },
  'IAM-SYS-002': {
    statusCode: 502,
    messageEn: 'Email service unavailable',
    messageAr: 'خدمة البريد الإلكتروني غير متوفرة',
  },
  'IAM-SYS-003': {
    statusCode: 503,
    messageEn: 'Database unavailable',
    messageAr: 'قاعدة البيانات غير متوفرة',
  },
  'IAM-SYS-004': {
    statusCode: 504,
    messageEn: 'Audit service unavailable',
    messageAr: 'خدمة التدقيق غير متوفرة',
  },
} as const;

export type IamErrorCode = keyof typeof IAM_ERRORS;

export function createIamError(code: IamErrorCode, details?: any): IamError {
  const errorMeta = IAM_ERRORS[code];
  return new IamError(
    code,
    errorMeta.statusCode,
    errorMeta.messageEn,
    errorMeta.messageAr,
    details
  );
}
