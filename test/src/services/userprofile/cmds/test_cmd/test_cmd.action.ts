import { ModuleRef } from '@nestjs/core';
import { Test_cmdDto } from './test_cmd.dto';
import { UserProfileService } from '../../userprofile.service';
import { CrudContext } from '@eicrud/core/crud';

export async function test_cmd(
  dto: Test_cmdDto,
  service: UserProfileService,
  ctx: CrudContext,
  inheritance?: any,
) {
  let res = dto?.sub?.subfield || dto.returnMessage;
  return res;
}
