import { TestCmdGetDto, TestCmdGetReturnDto } from './test_cmd_get.dto';
import { UserProfileService } from '../../user-profile.service';
import { CrudContext, Inheritance } from '@eicrud/core/crud';

export async function test_cmd_get(
  this: UserProfileService,
  dto: TestCmdGetDto,
  ctx: CrudContext,
  inheritance?: Inheritance,
): Promise<TestCmdGetReturnDto> {
  let res = dto.returnMessage || 'Not found';
  return res;
}
