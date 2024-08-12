import { CrudContext, CrudService, CmdHooks } from '@eicrud/core/crud';
import { test_trigger } from '../test_trigger/test_trigger.action';
import { TestTriggerDto } from '../test_trigger/test_trigger.dto';
import { logHook } from '../../hook-trigger.hooks';

export class test_triggerHooks extends CmdHooks<TestTriggerDto, any> {
  async beforeControllerHook(
    dto: TestTriggerDto,
    ctx: CrudContext,
  ): Promise<any> {
    // before test_trigger (entry controller)
    await logHook(ctx.getCurrentService() as any, dto, 'before', 'cmd', ctx);

    return dto;
  }

  async afterControllerHook(
    dto: TestTriggerDto,
    result: any,
    ctx: CrudContext,
  ): Promise<any> {
    // after test_trigger (entry controller)
    await logHook(ctx.getCurrentService() as any, dto, 'after', 'cmd', ctx);

    return result;
  }

  async errorControllerHook(
    dto: TestTriggerDto,
    error: any,
    ctx: CrudContext,
  ): Promise<any> {
    // on test_trigger error (entry controller)
    await logHook(ctx.getCurrentService() as any, dto, 'error', 'cmd', ctx);

    return Promise.resolve();
  }
}

export const hooks = new test_triggerHooks();
