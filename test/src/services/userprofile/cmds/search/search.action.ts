import { ModuleRef } from '@nestjs/core';
import SearchDto from './search.dto';
import { UserProfileService } from '../../userprofile.service';
import { CrudContext } from '@eicrud/core/crud';
import UserProfile from '../../userprofile.entity';

export async function search(
  dto: SearchDto,
  service: UserProfileService,
  ctx: CrudContext,
  inheritance?: any,
) {
  const query: Partial<UserProfile> = {
    userName: new RegExp(dto.userNameLike, 'i') as any,
  };

  if (dto.type) {
    query.type = dto.type as any;
  }

  const fakeCtx: CrudContext = {
    ...ctx,
    query,
    data: null,
    origin: 'crud',
    method: 'GET',
  };

  await this.crudAuthorization.authorize(fakeCtx, this.security);

  return this.$find(query, fakeCtx, inheritance);
}
