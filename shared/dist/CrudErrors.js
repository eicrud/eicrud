export class CrudError {
    message;
    code;
    constructor(message, code) {
        this.message = message;
        this.code = code;
    }
    str(data) {
        const obj = {
            message: this.message,
            code: this.code,
            data: data
        };
        return JSON.stringify(obj);
    }
}
export class CrudErrors {
    static CAPTCHA_REQUIRED = new CrudError("Captcha required", 1);
    static TIMED_OUT = new CrudError("Account locked. Please wait until", 2);
    static TOO_MANY_LOGIN_ATTEMPTS = new CrudError("Too many login attempts. Please wait", 3);
    static TOKEN_MISMATCH = new CrudError("Token revokedCount mismatch", 4);
    static INVALID_CREDENTIALS = new CrudError("Invalid credentials", 5);
    static EMAIL_ALREADY_SENT = new CrudError("Email already sent, check your spam folder or try again later", 6);
    static TOKEN_EXPIRED = new CrudError("Token expired", 7);
    static TWOFA_REQUIRED = new CrudError("2FA required", 8);
    static USER_NOT_FOUND = new CrudError("User not found", 9);
    static VALIDATION_ERROR = new CrudError("Validation error", 10);
    static PASSWORD_TOO_LONG = new CrudError("Password too long", 11);
    static IN_REQUIRED_LENGTH = new CrudError("In query max id length", 12);
    static MAX_BATCH_SIZE_EXCEEDED = new CrudError("Max batch size exceeded", 13);
}
//# sourceMappingURL=CrudErrors.js.map