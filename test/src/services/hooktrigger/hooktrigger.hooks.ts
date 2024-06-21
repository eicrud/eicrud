import { CrudContext, CrudHooks } from '@eicrud/core/crud';
import { HookTrigger } from './hooktrigger.entity';
import { HookTriggerService } from './hooktrigger.service';

export class HookTriggerHooks extends CrudHooks<HookTrigger> {
  async beforeCreateHook(
    this: HookTriggerService,
    data: Partial<HookTrigger>[],
    ctx: CrudContext,
  ) {
    // before HookTrigger creation

    return data;
  }

  async afterCreateHook(
    this: HookTriggerService,
    result: any[],
    data: Partial<HookTrigger>[],
    ctx: CrudContext,
  ) {
    // after HookTrigger creation

    return result;
  }

  async beforeReadHook(
    this: HookTriggerService,
    query: Partial<HookTrigger>,
    ctx: CrudContext,
  ) {
    // before HookTrigger read

    return query;
  }

  async afterReadHook(
    this: HookTriggerService,
    result,
    query: Partial<HookTrigger>,
    ctx: CrudContext,
  ) {
    // after HookTrigger read

    return result;
  }

  async beforeUpdateHook(
    this: HookTriggerService,
    updates: { query: Partial<HookTrigger>; data: Partial<HookTrigger> }[],
    ctx: CrudContext,
  ) {
    // before HookTrigger update

    return updates;
  }

  async afterUpdateHook(
    this: HookTriggerService,
    results: any[],
    updates: { query: Partial<HookTrigger>; data: Partial<HookTrigger> }[],
    ctx: CrudContext,
  ) {
    // after HookTrigger update

    return results;
  }

  async beforeRemoveHook(
    this: HookTriggerService,
    queries: Partial<HookTrigger>[],
    ctx: CrudContext,
  ) {
    // before HookTrigger remove

    return queries;
  }

  async afterRemoveHook(
    this: HookTriggerService,
    result: any,
    queries: Partial<HookTrigger>[],
    ctx: CrudContext,
  ) {
    // after HookTrigger remove

    return result;
  }

  async errorControllerHook(
    this: HookTriggerService,
    error: Error,
    ctx: CrudContext,
  ): Promise<any> {
    //after HookTrigger error

    return Promise.resolve();
  }
}

export const hooks = new HookTriggerHooks();
