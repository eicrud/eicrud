import { ModuleRef } from '@nestjs/core';
import { SearchDto } from './search.dto';
import { MelonService } from '../../melon.service';
import { CrudContext } from '@eicrud/core/crud';
import { FindResponseDto } from '@eicrud/shared/interfaces';
import { Melon } from '../../melon.entity';

export async function search(
  this: MelonService,
  dto: SearchDto,
  service: MelonService,
  ctx: CrudContext,
  inheritance?: any,
): Promise<FindResponseDto<Melon>> {
  const query: Partial<Melon> = {};

  if (dto.nameLike) {
    query.name = new RegExp(dto.nameLike, 'i') as any;
  }

  if (dto.ownerEmail) {
    query.ownerEmail = dto.ownerEmail;
  }

  const fakeCtx: CrudContext = {
    ...ctx,
    query,
    data: null,
    origin: 'crud',
    method: 'GET',
  };

  await this.crudAuthorization.authorize(fakeCtx, this.security);
  const opOpts = ctx.originOptions ? { options: ctx.originOptions } : undefined;
  if (dto.ids) {
    return this.$findIn(dto.ids, query, fakeCtx, opOpts, inheritance);
  }
  return this.$find(query, fakeCtx, opOpts, inheritance);
}
