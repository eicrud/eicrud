import { PresentCmdDto, PresentCmdReturnDto } from './present_cmd.dto';
import { FakeEmailService } from '../../fake-email.service';
import { CrudContext, Inheritance } from '@eicrud/core/crud';

export async function present_cmd(
  this: FakeEmailService,
  dto: PresentCmdDto,
  ctx: CrudContext,
  inheritance?: Inheritance,
): Promise<PresentCmdReturnDto> {
  throw new Error('Not implemented');
}
