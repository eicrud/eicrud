import { GhostCmdDto, GhostCmdReturnDto } from './cmds/ghost_cmd/ghost_cmd.dto';
import { ModuleRef } from '@nestjs/core';
import { SuperclientTestExclude } from './superclient-test-exclude.entity';
import { Injectable } from '@nestjs/common';
import { getSecurity } from './superclient-test-exclude.security';
import { CrudService, Inheritance, CrudContext } from '@eicrud/core/crud';
import { serviceCmds } from './cmds';
import { hooks } from './superclient-test-exclude.hooks';

@Injectable()
export class SuperclientTestExcludeService extends CrudService<SuperclientTestExclude> {
  constructor(protected moduleRef: ModuleRef) {
    const serviceName = CrudService.getName(SuperclientTestExclude);
    super(moduleRef, SuperclientTestExclude, getSecurity(serviceName), {
      hooks,
    });
  }

  // GENERATED START - do not remove
  async $ghost_cmd(
    dto: GhostCmdDto,
    ctx: CrudContext,
    inheritance?: Inheritance,
  ) {
    return serviceCmds.ghost_cmd.action.call(this, dto, ctx, inheritance);
  }
}
