import {
  PresentCmdDto,
  PresentCmdReturnDto,
} from './cmds/present_cmd/present_cmd.dto';
import { ModuleRef } from '@nestjs/core';
import { Picture } from './picture.entity';
import { Injectable } from '@nestjs/common';
import { getSecurity } from './picture.security';
import { CrudService, Inheritance } from '@eicrud/core/crud';
import { serviceCmds } from './cmds';
import { CrudContext } from '@eicrud/core/crud';

@Injectable()
export class PictureService extends CrudService<Picture> {
  constructor(protected moduleRef: ModuleRef) {
    const serviceName = CrudService.getName(Picture);
    super(moduleRef, Picture, getSecurity(serviceName));
  }

  // GENERATED START - do not remove
  async $present_cmd(
    dto: PresentCmdDto,
    ctx: CrudContext,
    inheritance?: Inheritance,
  ) {
    return serviceCmds.present_cmd.action.call(this, dto, ctx, inheritance);
  }
}
