import {
  PresentCmdDto,
  PresentCmdReturnDto,
} from './cmds/present_cmd/present_cmd.dto';
import { GhostCmdDto, GhostCmdReturnDto } from './cmds/ghost_cmd/ghost_cmd.dto';
import { ModuleRef } from '@nestjs/core';
import { FakeEmail } from './fake-email.entity';
import { Injectable } from '@nestjs/common';
import { getSecurity } from './fake-email.security';
import { CrudService, Inheritance } from '@eicrud/core/crud';
import { serviceCmds } from './cmds';
import { CrudContext } from '@eicrud/core/crud';
import { EmailService } from '@eicrud/core/config';
import { get } from 'http';

@Injectable()
export class FakeEmailService
  extends CrudService<FakeEmail>
  implements EmailService
{
  constructor(protected moduleRef: ModuleRef) {
    const serviceName = CrudService.getName(FakeEmail);
    super(moduleRef, FakeEmail, getSecurity(serviceName));
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

  // GENERATED START - do not remove
  async $present_cmd(
    dto: PresentCmdDto,
    ctx: CrudContext,
    inheritance?: Inheritance,
  ) {
    return serviceCmds.present_cmd.action.call(this, dto, ctx, inheritance);
  }

  async $ghost_cmd(
    dto: GhostCmdDto,
    ctx: CrudContext,
    inheritance?: Inheritance,
  ) {
    return serviceCmds.ghost_cmd.action.call(this, dto, ctx, inheritance);
  }
}
