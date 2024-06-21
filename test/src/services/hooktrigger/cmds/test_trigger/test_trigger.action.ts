import { ModuleRef } from '@nestjs/core';
import { TestTriggerDto } from './test_trigger.dto';
import { HookTriggerService } from '../../hooktrigger.service';
import { CrudContext } from '@eicrud/core/crud';

export async function test_trigger(
  this: HookTriggerService,
  dto: TestTriggerDto,
  ctx: CrudContext,
  inheritance?: any,
) {}
