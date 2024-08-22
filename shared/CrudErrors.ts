export class CrudError {
  message: string;
  code: number;

  constructor(message: string, code: number) {
    this.message = message;
    this.code = code;
  }

  str(data?): string {
    const obj = {
      message: this.message,
      code: this.code,
      data: data,
    };
    return JSON.stringify(obj);
  }
}

export class CrudErrors {
  static readonly CAPTCHA_REQUIRED = new CrudError('Captcha required', 1);
  static readonly TIMED_OUT = new CrudError(
    'Account locked. Please wait until',
    2,
  );
  static readonly TOO_MANY_LOGIN_ATTEMPTS = new CrudError(
    'Too many login attempts. Please wait',
    3,
  );
  static readonly TOKEN_MISMATCH = new CrudError(
    'Token rvkd count mismatch',
    4,
  );
  static readonly INVALID_CREDENTIALS = new CrudError('Invalid credentials', 5);
  static readonly EMAIL_ALREADY_SENT = new CrudError(
    'Email already sent, check your spam folder or try again later',
    6,
  );
  static readonly TOKEN_EXPIRED = new CrudError('Token expired', 7);
  static readonly TWOFA_REQUIRED = new CrudError('2FA required', 8);
  static readonly USER_NOT_FOUND = new CrudError('User not found', 9);
  static readonly VALIDATION_ERROR = new CrudError('Validation error', 10);
  static readonly PASSWORD_TOO_LONG = new CrudError('Password too long', 11);
  static readonly IN_REQUIRED_LENGTH = new CrudError(
    'In query max id length',
    12,
  );
  static readonly MAX_BATCH_SIZE_EXCEEDED = new CrudError(
    'Max batch size exceeded',
    13,
  );
  static readonly WAIT_UNTIL = new CrudError('Wait until', 14);
  static readonly MAX_ITEMS_IN_DB = new CrudError('Too many items in DB.', 15);
  static readonly EMAIL_ALREADY_TAKEN = new CrudError(
    'An account with this email already exists.',
    16,
  );
  static readonly GET_METHOD_NOT_ALLOWED = new CrudError(
    'GET method not allowed.',
    17,
  );
  static readonly ENTITY_NOT_FOUND = new CrudError('Entity not found', 18);
}

export interface MaxBatchSizeExceededDto {
  maxBatchSize: number;
  batchSize: number;
  field?: string;
}
