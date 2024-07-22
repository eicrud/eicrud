import { PingCmdDto, PingCmdReturnDto } from './ping_cmd.dto';
import { SuperclientTestService } from '../../superclient-test.service';
import { CrudContext, Inheritance } from '@eicrud/core/crud';

export async function ping_cmd(
  this: SuperclientTestService,
  dto: PingCmdDto,
  ctx: CrudContext,
  inheritance?: Inheritance,
): Promise<PingCmdReturnDto> {
  return 'ping_cmd';
}
