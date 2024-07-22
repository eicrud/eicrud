import { ModuleRef } from '@nestjs/core';
import { TestCmdRateLimitedDto } from './test_cmd_rate_limited.dto';
import { UserProfileService } from '../../user-profile.service';
import { CrudContext } from '@eicrud/core/crud';

export async function test_cmd_rate_limited(
  dto: TestCmdRateLimitedDto,
  service: UserProfileService,
  ctx: CrudContext,
  inheritance?: any,
) {
  let res = dto?.sub?.subfield || dto.returnMessage;
  return Promise.resolve(res);
}
