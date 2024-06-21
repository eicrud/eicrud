import TestTriggerDto from './cmds/test_trigger/test_trigger.dto';
import { ModuleRef } from '@nestjs/core';
import { HookTrigger } from './hooktrigger.entity';
import { Injectable } from '@nestjs/common';
import { getSecurity } from './hooktrigger.security';
import { CrudService } from '@eicrud/core/crud';
import { serviceCmds } from './cmds';
import { CrudContext } from '@eicrud/core/crud';
import { hooks } from './hooktrigger.hooks';
import { HookLogService } from '../hooklog/hooklog.service';

@Injectable()
export class HookTriggerService extends CrudService<HookTrigger> {
  constructor(
    protected moduleRef: ModuleRef,
    public hookLogService: HookLogService,
  ) {
    const serviceName = CrudService.getName(HookTrigger);
    super(moduleRef, HookTrigger, getSecurity(serviceName), { hooks });
  }

  // GENERATED START - do not remove
  async $test_trigger(
    dto: TestTriggerDto,
    ctx: CrudContext,
    inheritance?: any,
  ) {
    return serviceCmds.test_trigger.action.call(this, dto, ctx, inheritance);
  }
}
