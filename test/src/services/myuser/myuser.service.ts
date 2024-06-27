import { CallTestCmdDto } from './cmds/call_test_cmd/call_test_cmd.dto';
import { ModuleRef } from '@nestjs/core';
import { MyUser } from './myuser.entity';
import { Injectable } from '@nestjs/common';
import { getSecurity } from './myuser.security';
import { CrudService } from '@eicrud/core/crud';
import { serviceCmds } from './cmds';
import { CrudContext } from '@eicrud/core/crud';
import { CrudUser, CrudUserService } from '@eicrud/core/config';
import { UserProfileService } from '../userprofile/userprofile.service';

@Injectable()
export class MyUserService extends CrudUserService<MyUser> {
  constructor(
    protected moduleRef: ModuleRef,
    public profileService: UserProfileService,
  ) {
    const serviceName = CrudService.getName(MyUser);
    super(moduleRef, MyUser, getSecurity(serviceName));
  }

  override async addToComputedTrust(
    user: CrudUser,
    trust: number,
    ctx: CrudContext,
  ): Promise<number> {
    if (user.role === 'trusted_user') {
      trust += 100;
    }
    return trust;
  }

  // GENERATED START - do not remove
  async $call_test_cmd(
    dto: CallTestCmdDto,
    ctx: CrudContext,
    inheritance?: any,
  ) {
    return await serviceCmds.call_test_cmd.action(dto, this, ctx, inheritance);
  }
}
