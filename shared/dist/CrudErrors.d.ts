export declare class CrudError {
    message: string;
    code: number;
    constructor(message: string, code: number);
    str(data?: any): string;
}
export declare class CrudErrors {
    static readonly CAPTCHA_REQUIRED: CrudError;
    static readonly TIMED_OUT: CrudError;
    static readonly TOO_MANY_LOGIN_ATTEMPTS: CrudError;
    static readonly TOKEN_MISMATCH: CrudError;
    static readonly INVALID_CREDENTIALS: CrudError;
    static readonly EMAIL_ALREADY_SENT: CrudError;
    static readonly TOKEN_EXPIRED: CrudError;
    static readonly TWOFA_REQUIRED: CrudError;
    static readonly USER_NOT_FOUND: CrudError;
    static readonly VALIDATION_ERROR: CrudError;
    static readonly PASSWORD_TOO_LONG: CrudError;
    static readonly IN_REQUIRED_LENGTH: CrudError;
    static readonly MAX_BATCH_SIZE_EXCEEDED: CrudError;
}
