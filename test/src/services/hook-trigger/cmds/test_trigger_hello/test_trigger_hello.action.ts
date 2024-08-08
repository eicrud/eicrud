import {
  TestTriggerHelloDto,
  TestTriggerHelloReturnDto,
} from './test_trigger_hello.dto';
import { HookTriggerService } from '../../hook-trigger.service';
import { CrudContext, Inheritance } from '@eicrud/core/crud';

export async function test_trigger_hello(
  this: HookTriggerService,
  dto: TestTriggerHelloDto,
  ctx: CrudContext,
  inheritance?: Inheritance,
): Promise<TestTriggerHelloReturnDto> {
  return dto.message;
}
