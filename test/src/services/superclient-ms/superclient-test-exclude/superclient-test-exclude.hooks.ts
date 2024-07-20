import { CrudContext, CrudHooks } from '@eicrud/core/crud';
import { SuperclientTestExclude } from './superclient-test-exclude.entity';
import { SuperclientTestExcludeService } from './superclient-test-exclude.service';
import { FindResponseDto } from '@eicrud/shared/interfaces';

export class SuperclientTestExcludeHooks extends CrudHooks<SuperclientTestExclude> {
  override async beforeCreateHook(
    this: SuperclientTestExcludeService,
    data: Partial<SuperclientTestExclude>[],
    ctx: CrudContext,
  ): Promise<Partial<SuperclientTestExclude>[]> {
    // before SuperclientTestExclude creation

    return data;
  }

  override async afterCreateHook(
    this: SuperclientTestExcludeService,
    result: any[],
    data: Partial<SuperclientTestExclude>[],
    ctx: CrudContext,
  ): Promise<SuperclientTestExclude[]> {
    // after SuperclientTestExclude creation

    return result;
  }

  override async beforeReadHook(
    this: SuperclientTestExcludeService,
    query: Partial<SuperclientTestExclude>,
    ctx: CrudContext,
  ): Promise<Partial<SuperclientTestExclude>> {
    // before SuperclientTestExclude read

    return query;
  }

  override async afterReadHook(
    this: SuperclientTestExcludeService,
    result,
    query: Partial<SuperclientTestExclude>,
    ctx: CrudContext,
  ): Promise<FindResponseDto<SuperclientTestExclude>> {
    // after SuperclientTestExclude read

    return result;
  }

  override async beforeUpdateHook(
    this: SuperclientTestExcludeService,
    updates: {
      query: Partial<SuperclientTestExclude>;
      data: Partial<SuperclientTestExclude>;
    }[],
    ctx: CrudContext,
  ): Promise<
    {
      query: Partial<SuperclientTestExclude>;
      data: Partial<SuperclientTestExclude>;
    }[]
  > {
    // before SuperclientTestExclude update

    return updates;
  }

  override async afterUpdateHook(
    this: SuperclientTestExcludeService,
    results: any[],
    updates: {
      query: Partial<SuperclientTestExclude>;
      data: Partial<SuperclientTestExclude>;
    }[],
    ctx: CrudContext,
  ): Promise<any[]> {
    // after SuperclientTestExclude update

    return results;
  }

  override async beforeDeleteHook(
    this: SuperclientTestExcludeService,
    query: Partial<SuperclientTestExclude>,
    ctx: CrudContext,
  ): Promise<Partial<SuperclientTestExclude>> {
    // before SuperclientTestExclude delete

    return query;
  }

  override async afterDeleteHook(
    this: SuperclientTestExcludeService,
    result: any,
    query: Partial<SuperclientTestExclude>,
    ctx: CrudContext,
  ): Promise<number> {
    // after SuperclientTestExclude delete

    return result;
  }

  override async errorControllerHook(
    this: SuperclientTestExcludeService,
    error: any,
    ctx: CrudContext,
  ): Promise<any> {
    //after SuperclientTestExclude error
  }
}

export const hooks = new SuperclientTestExcludeHooks();
