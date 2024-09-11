import {
  MsLinkQuery,
  CrudContext,
  CrudHooks,
  CrudService,
} from '@eicrud/core/crud';
import { HookTrigger } from './hook-trigger.entity';
import { HookTriggerService } from './hook-trigger.service';
import { HookLog, HookPos, HookType } from '../hook-log/hook-log.entity';
import { FindResponseDto } from '@eicrud/shared/interfaces';

export async function logHook(
  service: HookTriggerService,
  data,
  position: HookPos,
  type: HookType,
  ctx: CrudContext,
  query?: MsLinkQuery,
  args?: any[],
) {
  if (
    position != 'error' &&
    (data?.throwError ||
      data?.[0]?.throwError ||
      data?.[0]?.query?.throwError ||
      args?.[1]?.throwError ||
      args?.[0]?.throwError)
  ) {
    return;
  }

  if (!data) {
    data = {
      message:
        args[0].message ||
        args[0].originalMessage ||
        args[1].message ||
        args[1].originalMessage,
    };
  }

  const arrData = Array.isArray(data) ? data : [data];
  const logs: Partial<HookLog>[] = [];
  for (const idx in arrData) {
    const d = arrData[idx];

    const log: Partial<HookLog> = {
      message:
        d.message ||
        d.originalMessage ||
        d.data.message ||
        d.data.originalMessage,
      hookPosition: position,
      hookType: type,
      length: d.setLen || d.status || parseInt(idx),
    };
    if (query) log.MsLinkQuery = query;
    logs.push(log);
  }
  await service.hookLogService.$createBatch(logs, ctx);
}

export class HookTriggerHooks extends CrudHooks<HookTrigger> {
  override async beforeCreateHook(
    this: HookTriggerService,
    data: Partial<HookTrigger>[],
    ctx: CrudContext,
  ) {
    for (const d of data) {
      if (d.throwError) {
        throw new Error('Error in hook');
      }
    }

    await logHook(this, data, 'before', 'create', ctx);

    // before HookTrigger creation
    for (const d of data) {
      d.originalMessage = d.message;
      d.message = d.message + ' - hooked';
    }
    return data;
  }

  override async afterCreateHook(
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

  override async errorCreateHook(
    this: HookTriggerService,
    data: Partial<HookTrigger>[],
    ctx: CrudContext,
    error: any,
  ): Promise<HookTrigger[]> {
    // after HookTrigger error
    await logHook(this, data, 'error', 'create', ctx);

    return true as any;
  }

  override async beforeReadHook(
    this: HookTriggerService,
    query: Partial<HookTrigger>,
    ctx: CrudContext,
  ) {
    // before HookTrigger read
    if (query.throwError) {
      throw new Error('Error in hook');
    }

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

  override async afterReadHook(
    this: HookTriggerService,
    result: FindResponseDto<HookTrigger>,
    query: Partial<HookTrigger>,
    ctx: CrudContext,
  ): Promise<FindResponseDto<HookTrigger>> {
    await logHook(this, query, 'after', 'read', ctx);

    // after HookTrigger read
    for (const r in result.data) {
      result.data[r] = { result: result.data[r], hooked: 'read' } as any;
    }

    return result;
  }

  override async errorReadHook(
    this: HookTriggerService,
    query: Partial<HookTrigger>,
    ctx: CrudContext,
    error: any,
  ): Promise<FindResponseDto<HookTrigger>> {
    //after HookTrigger error
    await logHook(this, query, 'error', 'read', ctx);

    return true as any;
  }

  override async beforeUpdateHook(
    this: HookTriggerService,
    updates: { query: Partial<HookTrigger>; data: Partial<HookTrigger> }[],
    ctx: CrudContext,
  ) {
    for (const u of updates) {
      if (u.query.throwError || u.data.throwError) {
        throw new Error('Error in hook');
      }
    }

    // before HookTrigger update
    await logHook(this, updates, 'before', 'update', ctx);

    for (const u of updates) {
      u.data.originalMessage = u.data.message;
      u.data.message = u.data.message + ' - hooked';
    }

    return updates;
  }

  override async afterUpdateHook(
    this: HookTriggerService,
    results: any[],
    updates: { query: Partial<HookTrigger>; data: Partial<HookTrigger> }[],
    ctx: CrudContext,
  ) {
    // after HookTrigger update
    await logHook(this, updates, 'after', 'update', ctx);

    for (const r in results) {
      if (results[r]?.message) {
        results[r].message = 'replaced in hook (update)';
      } else {
        results[r] = 'replaced in hook (update)';
      }
    }

    return results;
  }

  override async errorUpdateHook(
    this: HookTriggerService,
    updates: { query: Partial<HookTrigger>; data: Partial<HookTrigger> }[],
    ctx: CrudContext,
    error: any,
  ): Promise<any[]> {
    // after HookTrigger error
    await logHook(this, updates, 'error', 'update', ctx);

    return true as any;
  }

  override async beforeDeleteHook(
    this: HookTriggerService,
    queries: Partial<HookTrigger>,
    ctx: CrudContext,
  ) {
    // before HookTrigger remove
    for (const q of [queries]) {
      if (q.throwError) {
        throw new Error('Error in hook');
      }
    }

    await logHook(this, queries, 'before', 'delete', ctx);

    for (const q of [queries]) {
      if (q.message) q.message = q.message.replace('replace Query with ', '');
      if (q.originalMessage)
        q.originalMessage = q.originalMessage.replace(
          'replace Query with ',
          '',
        );
    }

    return queries;
  }

  override async afterDeleteHook(
    this: HookTriggerService,
    result: any,
    queries: Partial<HookTrigger>,
    ctx: CrudContext,
  ) {
    // after HookTrigger remove
    await logHook(this, queries, 'after', 'delete', ctx);

    result = 5311373;

    return result;
  }

  override async errorDeleteHook(
    this: HookTriggerService,
    queries: Partial<HookTrigger>,
    ctx: CrudContext,
    error: any,
  ): Promise<any> {
    // after HookTrigger error
    await logHook(this, queries, 'error', 'delete', ctx);

    return true;
  }

  override async errorControllerHook(
    this: HookTriggerService,
    error: any,
    ctx: CrudContext,
  ): Promise<any> {
    //after HookTrigger error
    await logHook(this, error, 'error', 'crud', ctx);

    if (error.status == 403) {
      return true;
    }

    return Promise.resolve();
  }
}

export const hooks = new HookTriggerHooks();
