import { ModuleRef } from '@nestjs/core';
import { SearchDto } from './search.dto';
import { UserProfileService } from '../../user-profile.service';
import { CrudContext, CrudService, Inheritance } from '@eicrud/core/crud';
import { UserProfile } from '../../user-profile.entity';

export async function search(
  this: CrudService<UserProfile>,
  dto: SearchDto,
  service: UserProfileService,
  ctx: CrudContext,
  inheritance?: Inheritance,
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

  return this.$find(query, fakeCtx);
}
