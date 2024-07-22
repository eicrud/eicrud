import { ModuleRef } from '@nestjs/core';
import { DragonFruit } from './dragon-fruit.entity';
import { Injectable } from '@nestjs/common';
import { getSecurity } from './dragon-fruit.security';
import { CrudService } from '@eicrud/core/crud';
import { serviceCmds } from './cmds';
import { CrudContext } from '@eicrud/core/crud';

@Injectable()
export class DragonFruitService extends CrudService<DragonFruit> {
  constructor(protected moduleRef: ModuleRef) {
    const serviceName = CrudService.getName(DragonFruit);
    super(moduleRef, DragonFruit, getSecurity(serviceName));
  }

  // GENERATED START - do not remove
}
