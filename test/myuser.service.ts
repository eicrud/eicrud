import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { CrudAuthService } from '../core/authentication/auth.service';
import { CrudAuthorizationService } from '../core/crud/crud.authorization.service';
import { CrudService } from '../core/crud/crud.service';
import { CmdSecurity, CrudSecurity } from '../core/config/model/CrudSecurity';
import { CrudUserService } from '../core/config/crud-user.service';
import { MyUser } from './entities/MyUser';
import { MyConfigService } from './myconfig.service';
import { ModuleRef } from '@nestjs/core';
import { baseCmds } from '../core/config/crud-user.service';
import { IsString, MaxLength } from 'class-validator';
import { $Transform } from '../core/validation/decorators';
import { CrudContext } from '../core/crud/model/CrudContext';
import { MyProfileService } from './profile.service';

class CallTestCmdDto {
  @IsString()
  @MaxLength(30)
  returnMessage: string;
}

const cmdSecurityMap: Record<string, CmdSecurity> = {
  callTestCmd: {
    dto: CallTestCmdDto,
    rolesRights: {
      guest: {
        async defineCMDAbility(can, cannot, ctx) {
          can('callTestCmd', 'my-user');
        },
      },
    },
  },
  [baseCmds.createAccount.name]: {
    dto: baseCmds.createAccount.dto,
    rolesRights: {
      guest: {
        async defineCMDAbility(can, cannot, ctx) {
          can(baseCmds.createAccount.name, 'my-user', { role: 'user' });
        },
      },
    },
  },
  [baseCmds.logoutEverywhere.name]: {
    dto: baseCmds.logoutEverywhere.dto,
    rolesRights: {
      user: {
        async defineCMDAbility(can, cannot, ctx) {
          can(baseCmds.logoutEverywhere.name, 'my-user', {
            userId: ctx.userId,
          });
        },
      },
    },
  },
  ...[
    baseCmds.sendVerificationEmail,
    baseCmds.verifyEmail,
    baseCmds.sendPasswordResetEmail,
    baseCmds.changePassword,
    baseCmds.resetPassword,
  ].reduce((acc, cmd) => {
    acc[cmd.name] = {
      dto: cmd.dto,
      rolesRights: {
        guest: {
          async defineCMDAbility(can, cannot, ctx) {
            can(cmd.name, 'my-user');
          },
        },
      },
    } as CmdSecurity;
    return acc;
  }, {}),
};

const myUserSecurity = (USER): CrudSecurity => {
  return {
    cmdSecurityMap,

    rolesRights: {
      super_admin: {},
      admin: {},
      trusted_user: {},
      user: {},
      guest: {},
    },
  };
};

@Injectable()
export class MyUserService extends CrudUserService<MyUser> {
  constructor(
    protected moduleRef: ModuleRef,
    protected profileService: MyProfileService,
  ) {
    super(moduleRef, MyUser, myUserSecurity(CrudService.getName(MyUser)));
  }

  async $callTestCmd(dto: CallTestCmdDto, ctx: CrudContext) {
    return await this.profileService.$testCmd(dto, ctx);
  }
}
