import { ModuleRef } from '@nestjs/core';
import { Picture } from './picture.entity';
import { Injectable } from '@nestjs/common';
import { getSecurity } from './picture.security';
import { CrudService } from '@eicrud/core/crud';
import { serviceCmds } from './cmds';
import { CrudContext } from '@eicrud/core/crud';

@Injectable()
export class PictureService extends CrudService<Picture> {
  constructor(protected moduleRef: ModuleRef) {
    const serviceName = CrudService.getName(Picture);
    super(moduleRef, Picture, getSecurity(serviceName));
  }

  // GENERATED START - do not remove
}
