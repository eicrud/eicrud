import { CrudContext, CrudHooks } from '@eicrud/core/crud';
import { Token } from './token.entity';
import { TokenService } from './token.service';
import {
  DeleteResponseDto,
  FindResponseDto,
  PatchResponseDto,
} from '@eicrud/shared/interfaces';

export class TokenHooks extends CrudHooks<Token> {
  override async beforeCreateHook(
    this: TokenService,
    data: Partial<Token>[],
    ctx: CrudContext,
  ): Promise<Partial<Token>[]> {
    // before Token creation

    return data;
  }

  override async afterCreateHook(
    this: TokenService,
    result: Token[],
    data: Partial<Token>[],
    ctx: CrudContext,
  ): Promise<Token[]> {
    // after Token creation

    return result;
  }

  override async errorCreateHook(
    this: TokenService,
    data: Partial<Token>[],
    ctx: CrudContext,
    error: any,
  ): Promise<any> {
    // error Token creation

    return null;
  }

  override async beforeReadHook(
    this: TokenService,
    query: Partial<Token>,
    ctx: CrudContext,
  ): Promise<Partial<Token>> {
    // before Token read

    return query;
  }

  override async afterReadHook(
    this: TokenService,
    result: FindResponseDto<Token>,
    query: Partial<Token>,
    ctx: CrudContext,
  ): Promise<FindResponseDto<Token>> {
    // after Token read

    return result;
  }

  override async errorReadHook(
    this: TokenService,
    query: Partial<Token>,
    ctx: CrudContext,
    error: any,
  ): Promise<any> {
    // error Token read

    return null;
  }

  override async beforeUpdateHook(
    this: TokenService,
    updates: {
      query: Partial<Token>;
      data: Partial<Token>;
    }[],
    ctx: CrudContext,
  ): Promise<{ query: Partial<Token>; data: Partial<Token> }[]> {
    // before Token update

    return updates;
  }

  override async afterUpdateHook(
    this: TokenService,
    results: PatchResponseDto<Token>[],
    updates: {
      query: Partial<Token>;
      data: Partial<Token>;
    }[],
    ctx: CrudContext,
  ): Promise<PatchResponseDto<Token>[]> {
    // after Token update

    return results;
  }

  override async errorUpdateHook(
    this: TokenService,
    updates: {
      query: Partial<Token>;
      data: Partial<Token>;
    }[],
    ctx: CrudContext,
    error: any,
  ): Promise<any> {
    // error Token update

    return null;
  }

  override async beforeDeleteHook(
    this: TokenService,
    query: Partial<Token>,
    ctx: CrudContext,
  ): Promise<Partial<Token>> {
    // before Token delete

    return query;
  }

  override async afterDeleteHook(
    this: TokenService,
    result: DeleteResponseDto<Token>,
    query: Partial<Token>,
    ctx: CrudContext,
  ): Promise<DeleteResponseDto<Token>> {
    // after Token delete

    return result;
  }

  override async errorDeleteHook(
    this: TokenService,
    query: Partial<Token>,
    ctx: CrudContext,
    error: any,
  ): Promise<any> {
    // error Token delete

    return null;
  }

  override async errorControllerHook(
    this: TokenService,
    error: any,
    ctx: CrudContext,
  ): Promise<any> {
    //after Token error
  }
}

export const hooks = new TokenHooks();
