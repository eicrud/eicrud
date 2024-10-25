import { CrudContext, CrudHooks } from '@eicrud/core/crud';
import { StarFruit } from './star-fruit.entity';
import { StarFruitService } from './star-fruit.service';
import { FindResponseDto } from '@eicrud/shared/interfaces';

export class StarFruitHooks extends CrudHooks<StarFruit> {
  override async beforeCreateHook(
    this: StarFruitService,
    data: Partial<StarFruit>[],
    ctx: CrudContext,
  ): Promise<Partial<StarFruit>[]> {
    // before StarFruit creation

    return data;
  }

  override async afterCreateHook(
    this: StarFruitService,
    result: any[],
    data: Partial<StarFruit>[],
    ctx: CrudContext,
  ): Promise<StarFruit[]> {
    // after StarFruit creation

    return result;
  }

  override async beforeReadHook(
    this: StarFruitService,
    query: Partial<StarFruit>,
    ctx: CrudContext,
  ): Promise<Partial<StarFruit>> {
    // before StarFruit read

    return query;
  }

  override async afterReadHook(
    this: StarFruitService,
    result,
    query: Partial<StarFruit>,
    ctx: CrudContext,
  ): Promise<FindResponseDto<StarFruit>> {
    // after StarFruit read

    return result;
  }

  override async beforeUpdateHook(
    this: StarFruitService,
    updates: { query: Partial<StarFruit>; data: Partial<StarFruit> }[],
    ctx: CrudContext,
  ): Promise<{ query: Partial<StarFruit>; data: Partial<StarFruit> }[]> {
    // before StarFruit update

    return updates;
  }

  override async afterUpdateHook(
    this: StarFruitService,
    results: any[],
    updates: { query: Partial<StarFruit>; data: Partial<StarFruit> }[],
    ctx: CrudContext,
  ): Promise<any[]> {
    // after StarFruit update

    return results;
  }

  override async beforeDeleteHook(
    this: StarFruitService,
    query: Partial<StarFruit>,
    ctx: CrudContext,
  ): Promise<Partial<StarFruit>> {
    // before StarFruit delete

    return query;
  }

  override async afterDeleteHook(
    this: StarFruitService,
    result: any,
    query: Partial<StarFruit>,
    ctx: CrudContext,
  ): Promise<any> {
    // after StarFruit delete

    return result;
  }

  override async errorControllerHook(
    this: StarFruitService,
    error: any,
    ctx: CrudContext,
  ): Promise<any> {
    //after StarFruit error
  }
}

export const hooks = new StarFruitHooks();
