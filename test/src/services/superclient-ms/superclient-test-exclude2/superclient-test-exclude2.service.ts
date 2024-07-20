import { ModuleRef } from '@nestjs/core';
import { SuperclientTestExclude2 } from './superclient-test-exclude2.entity';
import { Injectable } from '@nestjs/common';
import { getSecurity } from './superclient-test-exclude2.security';
import { CrudService, Inheritance, CrudContext } from '@eicrud/core/crud';
import { serviceCmds } from './cmds';
import { hooks } from './superclient-test-exclude2.hooks';

@Injectable()
export class SuperclientTestExclude2Service extends CrudService<SuperclientTestExclude2> {
  constructor(protected moduleRef: ModuleRef) {
    const serviceName = CrudService.getName(SuperclientTestExclude2);
    super(moduleRef, SuperclientTestExclude2, getSecurity(serviceName), {
      hooks,
    });
  }

  // GENERATED START - do not remove
}
