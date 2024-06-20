import SearchDto from './cmds/search/search.dto';
import { ModuleRef } from '@nestjs/core';
import Melon from './melon.entity';
import { Injectable } from '@nestjs/common';
import { getSecurity } from './melon.security';
import { CrudService } from '@eicrud/core/crud';
import { serviceCmds } from './cmds';
import { CrudContext } from '@eicrud/core/crud';
import { CrudAuthorizationService } from '@eicrud/core/crud/crud.authorization.service';

@Injectable()
export class MelonService extends CrudService<Melon> {
  constructor(protected moduleRef: ModuleRef) {
    const serviceName = CrudService.getName(Melon);
    super(moduleRef, Melon, getSecurity(serviceName));
  }

  // GENERATED START - do not remove
  async $search(dto: SearchDto, ctx: CrudContext, inheritance?: any) {
    return await serviceCmds.search.action.call(
      this,
      dto,
      this,
      ctx,
      inheritance,
    );
  }
}
