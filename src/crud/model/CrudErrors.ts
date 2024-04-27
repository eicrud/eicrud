

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
    static readonly CAPTCHA_REQUIRED = new CrudError("User not found", 1);
    static readonly TIMED_OUT = new CrudError("Account locked. Please wait until", 2);
    static readonly TOO_MANY_LOGIN_ATTEMPTS = new CrudError("Too many login attempts. Please wait", 3);
    static readonly TOKEN_MISMATCH = new CrudError("Token revokedCount mismatch", 4);
    static readonly INVALID_CREDENTIALS = new CrudError("Invalid credentials", 5);

    parseErrorCode(str: string): number {
        return parseInt(str.split("[crd_")[1]);
    }

}