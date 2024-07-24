import { GhostCmdDto, GhostCmdReturnDto } from './ghost_cmd.dto';
import { FakeEmailService } from '../../fake-email.service';
import { CrudContext, Inheritance } from '@eicrud/core/crud';

export async function ghost_cmd(
  this: FakeEmailService,
  dto: GhostCmdDto,
  ctx: CrudContext,
  inheritance?: Inheritance,
): Promise<GhostCmdReturnDto> {
  throw new Error('Not implemented');
}
