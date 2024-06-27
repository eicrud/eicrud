import { ModuleRef } from '@nestjs/core';
import { HookLog } from './hooklog.entity';
import { Injectable } from '@nestjs/common';
import { getSecurity } from './hooklog.security';
import { CrudService } from '@eicrud/core/crud';
import { serviceCmds } from './cmds';
import { CrudContext } from '@eicrud/core/crud';
import { hooks } from './hooklog.hooks';

@Injectable()
export class HookLogService extends CrudService<HookLog> {
  constructor(protected moduleRef: ModuleRef) {
    const serviceName = CrudService.getName(HookLog);
    super(moduleRef, HookLog, getSecurity(serviceName), { hooks });
  }

  // GENERATED START - do not remove
}
