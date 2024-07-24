import { ModuleRef } from '@nestjs/core';
import { GhostCmdDto, GhostCmdReturnDto } from './ghost_cmd.dto';
import { SuperclientTestExcludeService } from '../../superclient-test-exclude.service';
import { CrudContext, Inheritance } from '@eicrud/core/crud';

export async function ghost_cmd(
  this: SuperclientTestExcludeService,
  dto: GhostCmdDto,
  ctx: CrudContext,
  inheritance?: Inheritance,
): Promise<GhostCmdReturnDto> {
  throw new Error('Not implemented');
}
