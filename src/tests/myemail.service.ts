import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { CrudService } from "../crud/crud.service";
import { CrudSecurity } from "../crud/model/CrudSecurity";
import { EmailService } from "../email/email.service";
import { FakeEmail } from "./entities/FakeEmail";
import { MyConfigService } from "./myconfig.service";
import { ModuleRef } from "@nestjs/core";


const emailSecurity: CrudSecurity = {

}

@Injectable()
export class MyEmailService extends CrudService<FakeEmail> implements EmailService {
    constructor(
        protected moduleRef: ModuleRef
    ) {
        super(moduleRef, FakeEmail, emailSecurity);
    }
    sendVerificationEmail(to: string, token: string): Promise<any> {
        const email: Partial<FakeEmail> = {
            to,
            message: token,
            type: 'verification',
        }
        return this.$create(email, null);
    }
    sendTwoFactorEmail(to: string, code: string): Promise<any> {
        const email: Partial<FakeEmail> = {
            to,
            message: code,
            type: 'twoFactor',
        }
        return this.$create(email, null);
    }
    sendPasswordResetEmail(to: string, token: string): Promise<any> {
        const email: Partial<FakeEmail> = {
            to,
            message: token,
            type: 'passwordReset',
        }
        return this.$create(email, null);
    }
}