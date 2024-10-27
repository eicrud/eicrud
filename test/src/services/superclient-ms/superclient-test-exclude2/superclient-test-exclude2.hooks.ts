import { CrudContext, CrudHooks } from '@eicrud/core/crud';
import { SuperclientTestExclude2 } from './superclient-test-exclude2.entity';
import { SuperclientTestExclude2Service } from './superclient-test-exclude2.service';
import { FindResponseDto } from '@eicrud/shared/interfaces';

export class SuperclientTestExclude2Hooks extends CrudHooks<SuperclientTestExclude2> {
  override async beforeCreateHook(
    this: SuperclientTestExclude2Service,
    data: Partial<SuperclientTestExclude2>[],
    ctx: CrudContext,
  ): Promise<Partial<SuperclientTestExclude2>[]> {
    // before SuperclientTestExclude2 creation

    return data;
  }

  override async afterCreateHook(
    this: SuperclientTestExclude2Service,
    result: any[],
    data: Partial<SuperclientTestExclude2>[],
    ctx: CrudContext,
  ): Promise<SuperclientTestExclude2[]> {
    // after SuperclientTestExclude2 creation

    return result;
  }

  override async beforeReadHook(
    this: SuperclientTestExclude2Service,
    query: Partial<SuperclientTestExclude2>,
    ctx: CrudContext,
  ): Promise<Partial<SuperclientTestExclude2>> {
    // before SuperclientTestExclude2 read

    return query;
  }

  override async afterReadHook(
    this: SuperclientTestExclude2Service,
    result,
    query: Partial<SuperclientTestExclude2>,
    ctx: CrudContext,
  ): Promise<FindResponseDto<SuperclientTestExclude2>> {
    // after SuperclientTestExclude2 read

    return result;
  }

  override async beforeUpdateHook(
    this: SuperclientTestExclude2Service,
    updates: {
      query: Partial<SuperclientTestExclude2>;
      data: Partial<SuperclientTestExclude2>;
    }[],
    ctx: CrudContext,
  ): Promise<
    {
      query: Partial<SuperclientTestExclude2>;
      data: Partial<SuperclientTestExclude2>;
    }[]
  > {
    // before SuperclientTestExclude2 update

    return updates;
  }

  override async afterUpdateHook(
    this: SuperclientTestExclude2Service,
    results: any[],
    updates: {
      query: Partial<SuperclientTestExclude2>;
      data: Partial<SuperclientTestExclude2>;
    }[],
    ctx: CrudContext,
  ): Promise<any[]> {
    // after SuperclientTestExclude2 update

    return results;
  }

  override async beforeDeleteHook(
    this: SuperclientTestExclude2Service,
    query: Partial<SuperclientTestExclude2>,
    ctx: CrudContext,
  ): Promise<Partial<SuperclientTestExclude2>> {
    // before SuperclientTestExclude2 delete

    return query;
  }

  override async afterDeleteHook(
    this: SuperclientTestExclude2Service,
    result: any,
    query: Partial<SuperclientTestExclude2>,
    ctx: CrudContext,
  ): Promise<any> {
    // after SuperclientTestExclude2 delete

    return result;
  }

  override async errorControllerHook(
    this: SuperclientTestExclude2Service,
    error: any,
    ctx: CrudContext,
  ): Promise<any> {
    //after SuperclientTestExclude2 error
  }
}

export const hooks = new SuperclientTestExclude2Hooks();
