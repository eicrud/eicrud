import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { CrudService } from '../core/crud/crud.service';
import { CrudSecurity } from '../core/config/model/CrudSecurity';
import { EmailService } from '../core/config/crud-email.service';
import { FakeEmail } from './entities/FakeEmail';
import { MyConfigService } from './myconfig.service';
import { ModuleRef } from '@nestjs/core';
import { CrudContext } from '@eicrud/core/crud';

const emailSecurity: CrudSecurity = {};

@Injectable()
export class MyEmailService
  extends CrudService<FakeEmail>
  implements EmailService
{
  constructor(protected moduleRef: ModuleRef) {
    super(moduleRef, FakeEmail, emailSecurity);
  }
  sendAccountCreationEmail(
    to: string,
    user: any,
    ctx: CrudContext,
  ): Promise<any> {
    const email: Partial<FakeEmail> = {
      to,
      message: 'Welcome!',
      type: 'accountCreation',
    };
    return this.$create(email, null);
  }

  sendVerificationEmail(
    to: string,
    token: string,
    ctx: CrudContext,
  ): Promise<any> {
    const email: Partial<FakeEmail> = {
      to,
      message: token,
      type: 'emailVerification',
    };
    return this.$create(email, null);
  }
  sendTwoFactorEmail(to: string, code: string, ctx: CrudContext): Promise<any> {
    const email: Partial<FakeEmail> = {
      to,
      message: code,
      type: 'twoFactor',
    };
    return this.$create(email, null);
  }
  sendPasswordResetEmail(
    to: string,
    token: string,
    ctx: CrudContext,
  ): Promise<any> {
    const email: Partial<FakeEmail> = {
      to,
      message: token,
      type: 'passwordReset',
    };
    return this.$create(email, null);
  }
}
