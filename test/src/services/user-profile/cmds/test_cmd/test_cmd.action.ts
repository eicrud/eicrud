import { ModuleRef } from '@nestjs/core';
import { TestCmdDto } from './test_cmd.dto';
import { UserProfileService } from '../../user-profile.service';
import { CrudContext } from '@eicrud/core/crud';

export async function test_cmd(
  dto: TestCmdDto,
  service: UserProfileService,
  ctx: CrudContext,
  inheritance?: any,
) {
  let res = dto?.sub?.subfield || dto.returnMessage;
  return res;
}
