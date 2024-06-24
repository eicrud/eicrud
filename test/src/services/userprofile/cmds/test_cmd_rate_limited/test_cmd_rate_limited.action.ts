import { ModuleRef } from '@nestjs/core';
import Test_cmd_rate_limitedDto from './test_cmd_rate_limited.dto';
import { UserProfileService } from '../../userprofile.service';
import { CrudContext } from '@eicrud/core/crud';

export async function test_cmd_rate_limited(
  dto: Test_cmd_rate_limitedDto,
  service: UserProfileService,
  ctx: CrudContext,
  inheritance?: any,
) {
  let res = dto?.sub?.subfield || dto.returnMessage;
  return Promise.resolve(res);
}
