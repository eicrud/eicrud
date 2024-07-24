import { ModuleRef } from '@nestjs/core';
import { HookLog } from './hook-log.entity';
import { Injectable } from '@nestjs/common';
import { getSecurity } from './hook-log.security';
import { CrudService } from '@eicrud/core/crud';
import { serviceCmds } from './cmds';
import { CrudContext } from '@eicrud/core/crud';
import { hooks } from './hook-log.hooks';

@Injectable()
export class HookLogService extends CrudService<HookLog> {
  constructor(protected moduleRef: ModuleRef) {
    const serviceName = CrudService.getName(HookLog);
    super(moduleRef, HookLog, getSecurity(serviceName), { hooks });
  }

  // GENERATED START - do not remove
}
