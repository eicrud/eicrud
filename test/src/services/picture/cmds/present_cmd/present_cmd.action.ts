import { PresentCmdDto, PresentCmdReturnDto } from './present_cmd.dto';
import { PictureService } from '../../picture.service';
import { CrudContext, Inheritance } from '@eicrud/core/crud';

export async function present_cmd(
  this: PictureService,
  dto: PresentCmdDto,
  ctx: CrudContext,
  inheritance?: Inheritance,
): Promise<PresentCmdReturnDto> {
  throw new Error('Not implemented');
}
