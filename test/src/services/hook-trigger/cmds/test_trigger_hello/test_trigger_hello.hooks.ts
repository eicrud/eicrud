import { CrudContext, CrudService, CmdHooks } from '@eicrud/core/crud';
import { test_trigger_hello } from './test_trigger_hello.action';
import {
  TestTriggerHelloDto,
  TestTriggerHelloReturnDto,
} from './test_trigger_hello.dto';
import { logHook } from '../../hook-trigger.hooks';

export class test_trigger_helloHooks extends CmdHooks<
  TestTriggerHelloDto,
  TestTriggerHelloReturnDto
> {
  async beforeControllerHook(
    dto: TestTriggerHelloDto,
    ctx: CrudContext,
  ): Promise<TestTriggerHelloDto> {
    // before test_trigger_hello (entry controller)
    await logHook(ctx.getCurrentService() as any, dto, 'before', 'cmd', ctx);
    dto.message = dto.message + '!';
    return dto;
  }

  async afterControllerHook(
    dto: TestTriggerHelloDto,
    result: TestTriggerHelloReturnDto,
    ctx: CrudContext,
  ): Promise<TestTriggerHelloReturnDto> {
    // after test_trigger_hello (entry controller)
    await logHook(ctx.getCurrentService() as any, dto, 'after', 'cmd', ctx);

    result = 'hello ' + result;
    return result;
  }

  async errorControllerHook(
    dto: TestTriggerHelloDto,
    error: any,
    ctx: CrudContext,
  ): Promise<any> {
    // on test_trigger_hello error (entry controller)
    await logHook(ctx.getCurrentService() as any, dto, 'error', 'cmd', ctx);

    return Promise.resolve();
  }
}

export const hooks = new test_trigger_helloHooks();
