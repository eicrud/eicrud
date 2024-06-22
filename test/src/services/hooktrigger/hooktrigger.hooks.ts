import { CrudContext, CrudHooks } from '@eicrud/core/crud';
import { HookTrigger } from './hooktrigger.entity';
import { HookTriggerService } from './hooktrigger.service';
import { HookLog, HookPos, HookType } from '../hooklog/hooklog.entity';

export async function logHook(
  service: HookTriggerService,
  data,
  position: HookPos,
  type: HookType,
  ctx: CrudContext,
) {
  const arrData = Array.isArray(data) ? data : [data];
  const logs: Partial<HookLog>[] = [];
  for (const d of arrData) {
    const log: Partial<HookLog> = {
      message: d.message || d.originalMessage,
      hookPosition: position,
      hookType: type,
    };
    logs.push(log);
  }
  await service.hookLogService.$createBatch(logs, ctx);
}

export class HookTriggerHooks extends CrudHooks<HookTrigger> {
  override async $beforeCreateHook(
    this: HookTriggerService,
    data: Partial<HookTrigger>[],
    ctx: CrudContext,
  ) {
    // before HookTrigger creation
    for (const d of data) {
      d.originalMessage = d.message;
      d.message = d.message + ' - hooked';
    }
    await logHook(this, data, 'before', 'create', ctx);
    return data;
  }

  override async $afterCreateHook(
    this: HookTriggerService,
    result: any[],
    data: Partial<HookTrigger>[],
    ctx: CrudContext,
  ) {
    await logHook(this, data, 'after', 'create', ctx);

    // after HookTrigger creation
    result.forEach((r) => {
      r.message = 'replaced in hook';
    });
    return result;
  }

  override async $beforeReadHook(
    this: HookTriggerService,
    query: Partial<HookTrigger>,
    ctx: CrudContext,
  ) {
    // before HookTrigger read

    await logHook(this, query, 'before', 'read', ctx);

    if (query.message)
      query.message = query.message?.replace('replace Query with ', '');
    if (query.originalMessage)
      query.originalMessage = query.originalMessage?.replace(
        'replace Query with ',
        '',
      );
    return query;
  }

  override async $afterReadHook(
    this: HookTriggerService,
    result,
    query: Partial<HookTrigger>,
    ctx: CrudContext,
  ) {
    await logHook(this, query, 'after', 'read', ctx);

    // after HookTrigger read
    result = { result, hooked: true };

    return result;
  }

  override async $beforeUpdateHook(
    this: HookTriggerService,
    updates: { query: Partial<HookTrigger>; data: Partial<HookTrigger> }[],
    ctx: CrudContext,
  ) {
    // before HookTrigger update
    await logHook(this, updates, 'before', 'update', ctx);

    for (const u of updates) {
      u.data.originalMessage = u.data.message;
      u.data.message = u.data.message + ' - hooked';
    }

    return updates;
  }

  override async $afterUpdateHook(
    this: HookTriggerService,
    results: any[],
    updates: { query: Partial<HookTrigger>; data: Partial<HookTrigger> }[],
    ctx: CrudContext,
  ) {
    // after HookTrigger update
    await logHook(this, updates, 'after', 'update', ctx);

    results = { results, hooked: true } as any;

    return results;
  }

  override async $beforeRemoveHook(
    this: HookTriggerService,
    queries: Partial<HookTrigger>[],
    ctx: CrudContext,
  ) {
    // before HookTrigger remove

    await logHook(this, queries, 'before', 'delete', ctx);

    for (const q of queries) {
      q.message = q.message.replace('replace Query with ', '');
    }

    return queries;
  }

  override async $afterRemoveHook(
    this: HookTriggerService,
    result: any,
    queries: Partial<HookTrigger>[],
    ctx: CrudContext,
  ) {
    // after HookTrigger remove
    await logHook(this, queries, 'after', 'delete', ctx);

    result = { result, hooked: true };

    return result;
  }

  override async errorControllerHook(
    this: HookTriggerService,
    error: Error,
    ctx: CrudContext,
  ): Promise<any> {
    //after HookTrigger error
    await logHook(this, error, 'error', 'crud', ctx);

    return Promise.resolve();
  }
}

export const hooks = new HookTriggerHooks();
