import { CrudContext, CrudHooks } from '@eicrud/core/crud';
import { SuperclientTest } from './superclient-test.entity';
import { SuperclientTestService } from './superclient-test.service';
import { FindResponseDto } from '@eicrud/shared/interfaces';

export class SuperclientTestHooks extends CrudHooks<SuperclientTest> {
  override async beforeCreateHook(
    this: SuperclientTestService,
    data: Partial<SuperclientTest>[],
    ctx: CrudContext,
  ): Promise<Partial<SuperclientTest>[]> {
    // before SuperclientTest creation

    return data;
  }

  override async afterCreateHook(
    this: SuperclientTestService,
    result: any[],
    data: Partial<SuperclientTest>[],
    ctx: CrudContext,
  ): Promise<SuperclientTest[]> {
    // after SuperclientTest creation

    return result;
  }

  override async beforeReadHook(
    this: SuperclientTestService,
    query: Partial<SuperclientTest>,
    ctx: CrudContext,
  ): Promise<Partial<SuperclientTest>> {
    // before SuperclientTest read

    return query;
  }

  override async afterReadHook(
    this: SuperclientTestService,
    result,
    query: Partial<SuperclientTest>,
    ctx: CrudContext,
  ): Promise<FindResponseDto<SuperclientTest>> {
    // after SuperclientTest read

    return result;
  }

  override async beforeUpdateHook(
    this: SuperclientTestService,
    updates: {
      query: Partial<SuperclientTest>;
      data: Partial<SuperclientTest>;
    }[],
    ctx: CrudContext,
  ): Promise<
    { query: Partial<SuperclientTest>; data: Partial<SuperclientTest> }[]
  > {
    // before SuperclientTest update

    return updates;
  }

  override async afterUpdateHook(
    this: SuperclientTestService,
    results: any[],
    updates: {
      query: Partial<SuperclientTest>;
      data: Partial<SuperclientTest>;
    }[],
    ctx: CrudContext,
  ): Promise<any[]> {
    // after SuperclientTest update

    return results;
  }

  override async beforeDeleteHook(
    this: SuperclientTestService,
    query: Partial<SuperclientTest>,
    ctx: CrudContext,
  ): Promise<Partial<SuperclientTest>> {
    // before SuperclientTest delete

    return query;
  }

  override async afterDeleteHook(
    this: SuperclientTestService,
    result: any,
    query: Partial<SuperclientTest>,
    ctx: CrudContext,
  ): Promise<any> {
    // after SuperclientTest delete

    return result;
  }

  override async errorControllerHook(
    this: SuperclientTestService,
    error: any,
    ctx: CrudContext,
  ): Promise<any> {
    //after SuperclientTest error
  }
}

export const hooks = new SuperclientTestHooks();
