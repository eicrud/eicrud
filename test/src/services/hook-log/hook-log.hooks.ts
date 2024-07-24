import { CrudContext, CrudHooks } from '@eicrud/core/crud';
import { HookLog } from './hook-log.entity';
import { HookLogService } from './hook-log.service';

export class HookLogHooks extends CrudHooks<HookLog> {
  // async beforeCreateHook(this: HookLogService, data: Partial<HookLog>[], ctx: CrudContext) {
  //     // before HookLog creation
  //     return data;
  // }
}

export const hooks = new HookLogHooks();
