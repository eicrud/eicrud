import { PingCmdDto, PingCmdReturnDto } from './cmds/ping_cmd/ping_cmd.dto';
import { ModuleRef } from '@nestjs/core';
import { SuperclientTest } from './superclient-test.entity';
import { Injectable } from '@nestjs/common';
import { getSecurity } from './superclient-test.security';
import { CrudService, Inheritance, CrudContext } from '@eicrud/core/crud';
import { serviceCmds } from './cmds';
import { hooks } from './superclient-test.hooks';

@Injectable()
export class SuperclientTestService extends CrudService<SuperclientTest> {
  constructor(protected moduleRef: ModuleRef) {
    const serviceName = CrudService.getName(SuperclientTest);
    super(moduleRef, SuperclientTest, getSecurity(serviceName), { hooks });
  }

  // GENERATED START - do not remove
  async $ping_cmd(
    dto: PingCmdDto,
    ctx: CrudContext,
    inheritance?: Inheritance,
  ) {
    return serviceCmds.ping_cmd.action.call(this, dto, ctx, inheritance);
  }
}
