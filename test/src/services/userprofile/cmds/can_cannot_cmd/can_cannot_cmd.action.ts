import { ModuleRef } from '@nestjs/core';
import CanCannotCmdDto from './can_cannot_cmd.dto';
import { UserProfileService } from '../../userprofile.service';
import { CrudContext } from '@eicrud/core/crud';

export default async function can_cannot_cmd(
  dto: CanCannotCmdDto,
  service: UserProfileService,
  ctx: CrudContext,
  inheritance?: any,
) {
  let res = dto?.sub?.subfield || dto.returnMessage;
  return Promise.resolve(res);
}
