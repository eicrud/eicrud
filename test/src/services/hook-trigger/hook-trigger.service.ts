import {
  TestTriggerHelloDto,
  TestTriggerHelloReturnDto,
} from './cmds/test_trigger_hello/test_trigger_hello.dto';
import { TestTriggerDto } from './cmds/test_trigger/test_trigger.dto';
import { ModuleRef } from '@nestjs/core';
import { HookTrigger } from './hook-trigger.entity';
import { Injectable } from '@nestjs/common';
import { getSecurity } from './hook-trigger.security';
import { CrudService, Inheritance } from '@eicrud/core/crud';
import { serviceCmds } from './cmds';
import { CrudContext } from '@eicrud/core/crud';
import { hooks } from './hook-trigger.hooks';
import { HookLogService } from '../hook-log/hook-log.service';

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
  async $test_trigger_hello(
    dto: TestTriggerHelloDto,
    ctx: CrudContext,
    inheritance?: Inheritance,
  ) {
    return serviceCmds.test_trigger_hello.action.call(
      this,
      dto,
      ctx,
      inheritance,
    );
  }

  async $test_trigger(
    dto: TestTriggerDto,
    ctx: CrudContext,
    inheritance?: any,
  ) {
    return serviceCmds.test_trigger.action.call(this, dto, ctx, inheritance);
  }
}
