import { Inject, forwardRef } from "@nestjs/common";
import { CrudService } from "../crud/crud.service";
import { CrudSecurity } from "../crud/model/CrudSecurity";
import { EmailService } from "../email/email.service";
import { FakeEmail } from "./entities/FakeEmail";
import { MyConfigService } from "./myconfig.service";
import { ModuleRef } from "@nestjs/core";


const emailSecurity: CrudSecurity = {

}

export class MyEmailService extends CrudService<FakeEmail> implements EmailService {
    constructor(
        protected moduleRef: ModuleRef
    ) {
        super(moduleRef, FakeEmail, emailSecurity);
    }
    sendVerificationEmail(to: string, token: string): Promise<any> {
        throw new Error("Method not implemented.");
    }
    sendTwoFactorEmail(to: string, code: string): Promise<any> {
        throw new Error("Method not implemented.");
    }
    sendPasswordResetEmail(to: string, token: string): Promise<any> {
        throw new Error("Method not implemented.");
    }
}