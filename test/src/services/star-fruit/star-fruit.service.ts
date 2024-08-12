import { ModuleRef } from '@nestjs/core';
import { StarFruit } from './star-fruit.entity';
import { Injectable } from '@nestjs/common';
import { getSecurity } from './star-fruit.security';
import { CrudService, Inheritance, CrudContext } from '@eicrud/core/crud';
import { serviceCmds } from './cmds';
import { hooks } from './star-fruit.hooks';

@Injectable()
export class StarFruitService extends CrudService<StarFruit> {
  constructor(protected moduleRef: ModuleRef) {
    const serviceName = CrudService.getName(StarFruit);
    super(moduleRef, StarFruit, getSecurity(serviceName), { hooks });
  }

  // GENERATED START - do not remove
}
