import { Injectable } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { CrudService, CrudContext, Inheritance } from "@eicrud/core/crud";
import { Email } from "./email.entity";
import { getSecurity } from "./email.security";
import { EmailService as BaseEmailService, CrudUser } from "@eicrud/core/config";

@Injectable()
export class EmailService extends CrudService<Email> implements BaseEmailService {
    constructor(
        protected moduleRef: ModuleRef
    ) {
        const serviceName = CrudService.getName(Email);
        super(moduleRef, Email, getSecurity(serviceName));
    }

    sendVerificationEmail(to: string, token: string, ctx: CrudContext): Promise<any> {
        console.log('Sending verification email to', to, 'with token', token);
        return Promise.resolve();
    }

    sendTwoFactorEmail(to: string, code: string, ctx: CrudContext): Promise<any> {
        console.log('Sending two factor email to', to, 'with code', code);
        return Promise.resolve();
    }
    
    sendPasswordResetEmail(to: string, token: string, ctx: CrudContext): Promise<any> {
        console.log('Sending password reset email to', to, 'with token', token);
        return Promise.resolve();
    }

    sendAccountCreationEmail(to: string, user: CrudUser, ctx: CrudContext): Promise<any> {
        console.log('Sending account creation email to', to);
        return Promise.resolve();
    }
}