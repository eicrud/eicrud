import SearchDto from './cmds/search/search.dto';
import Test_cmd_rate_limitedDto from './cmds/test_cmd_rate_limited/test_cmd_rate_limited.dto';
import CanCannotCmdDto from './cmds/can_cannot_cmd/can_cannot_cmd.dto';
import Test_cmdDto from './cmds/test_cmd/test_cmd.dto';
import { ModuleRef } from '@nestjs/core';
import UserProfile from './userprofile.entity';
import { Injectable } from '@nestjs/common';
import { getSecurity } from './userprofile.security';
import { CrudService } from '@eicrud/core/crud';
import { serviceCmds } from './cmds';
import { CrudContext } from '@eicrud/core/crud';

@Injectable()
export class UserProfileService extends CrudService<UserProfile> {
  constructor(protected moduleRef: ModuleRef) {
    const serviceName = CrudService.getName(UserProfile);
    super(moduleRef, UserProfile, getSecurity(serviceName));
  }

  // GENERATED START - do not remove
  async $search(dto: SearchDto, ctx: CrudContext, inheritance?: any) {
    return await serviceCmds.search.action(dto, this, ctx, inheritance);
  }

  async $test_cmd_rate_limited(
    dto: Test_cmd_rate_limitedDto,
    ctx: CrudContext,
    inheritance?: any,
  ) {
    return await serviceCmds.test_cmd_rate_limited.action(
      dto,
      this,
      ctx,
      inheritance,
    );
  }

  async $can_cannot_cmd(
    dto: CanCannotCmdDto,
    ctx: CrudContext,
    inheritance?: any,
  ) {
    return await serviceCmds.can_cannot_cmd.action(dto, this, ctx, inheritance);
  }

  async $test_cmd(dto: Test_cmdDto, ctx: CrudContext, inheritance?: any) {
    return await serviceCmds.test_cmd.action(dto, this, ctx, inheritance);
  }
}
