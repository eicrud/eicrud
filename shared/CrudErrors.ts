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
    for (const key in data) {
      obj.message = obj.message.replace(`{${key}}`, data[key]);
    }
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
    'An account with this username already exists.',
    16,
  );
  static readonly GET_METHOD_NOT_ALLOWED = new CrudError(
    'GET method not allowed.',
    17,
  );
  static readonly ENTITY_NOT_FOUND = new CrudError('Entity not found', 18);
  //PAYLOAD_MUST_BE_ARRAY
  static readonly PAYLOAD_MUST_BE_ARRAY = new CrudError(
    'Payload must be an array',
    19,
  );
  static readonly ID_OVERRIDE_NOT_SET = new CrudError(
    'Id is not empty and allowIdOverride is not set',
    20,
  );
  static readonly CANNOT_UPDATE_ID = new CrudError(
    'Cannot update id field',
    21,
  );
  static readonly ID_FIELD_IS_REQUIRED_FOR_SAVE = new CrudError(
    'Id field is required for saveBatch',
    22,
  );
  static readonly FIELD_SIZE_IS_TOO_BIG = new CrudError(
    'Field ({problemField}) size is too big. Add a @$MaxSize decorator on the field or increase defaultMaxSize.',
    23,
  );
  static readonly ARRAY_LENGTH_IS_TOO_BIG = new CrudError(
    'Array ({problemField}) length is too big. Add a @$MaxArLength decorator on the field or increase defaultMaxArLength.',
    24,
  );
}

export interface MaxBatchSizeExceededDto {
  maxBatchSize: number;
  batchSize: number;
  field?: string;
}
