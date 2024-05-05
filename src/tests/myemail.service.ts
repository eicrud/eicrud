import { Inject, forwardRef } from "@nestjs/common";
import { CrudService } from "../crud/crud.service";
import { CrudSecurity } from "../crud/model/CrudSecurity";
import { EmailService } from "../email/email.service";
import { FakeEmail } from "./entities/FakeEmail";
import { MyConfigService } from "./myconfig.service";


const emailSecurity: CrudSecurity = {

}

export class MyEmailService extends CrudService<FakeEmail> implements EmailService {
    constructor(
        @Inject(forwardRef(() => MyConfigService))
        protected crudConfig: MyConfigService,
    ) {
        super(crudConfig, FakeEmail, emailSecurity);
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