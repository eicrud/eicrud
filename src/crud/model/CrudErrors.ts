

export class CrudError {
    message: string;
    code: number;

    constructor(message: string, code: number){
        this.message = message;
        this.code = code;
    }

    str(data?): string{
        return this.message + " " + data?.toString() + " [crd_" + this.code + "]";
    }
}

export class CrudErrors {
    static readonly CAPTCHA_REQUIRED = new CrudError("Captcha required", 1);
    static readonly TIMED_OUT = new CrudError("Account locked. Please wait until", 2);
    static readonly TOO_MANY_LOGIN_ATTEMPTS = new CrudError("Too many login attempts. Please wait", 3);
    static readonly TOKEN_MISMATCH = new CrudError("Token revokedCount mismatch", 4);
    static readonly INVALID_CREDENTIALS = new CrudError("Invalid credentials", 5);
    static readonly EMAIL_ALREADY_SENT = new CrudError("Email already sent, check your spam folder or try again later", 6);
    static readonly TOKEN_EXPIRED = new CrudError("Token expired", 7);
    static readonly TWOFA_REQUIRED = new CrudError("2FA required", 8);
    static readonly USER_NOT_FOUND = new CrudError("User not found", 9);
    static readonly VALIDATION_ERROR = new CrudError("Validation error", 10);
    static readonly PASSWORD_TOO_LONG = new CrudError("Password too long", 11);

    parseErrorCode(str: string): number {
        return parseInt(str.split("[crd_")[1]);
    }

}