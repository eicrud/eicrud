import { ModuleRef } from '@nestjs/core';
import { TestTriggerDto } from './test_trigger.dto';
import { HookTriggerService } from '../../hooktrigger.service';
import { CrudContext } from '@eicrud/core/crud';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

export async function test_trigger(
  this: HookTriggerService,
  dto: TestTriggerDto,
  ctx: CrudContext,
  inheritance?: any,
) {
  if (dto.message == '400') {
    throw new BadRequestException('error 400');
  }

  throw new ForbiddenException('error 403');
}
