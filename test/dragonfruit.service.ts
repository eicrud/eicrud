import { ModuleRef } from '@nestjs/core';

import { DragonFruit } from './entities/DragonFruit';
import { MyConfigService } from './myconfig.service';
import { Injectable, BadRequestException } from '@nestjs/common';
import { CrudService } from '@eicrud/core/crud/crud.service';
import { CrudSecurity } from '@eicrud/core/config/model/CrudSecurity';
import { CrudUser } from '@eicrud/core/config/model/CrudUser';
import { IsOptional, IsString } from 'class-validator';
import { FindResponseDto } from '@eicrud/shared/interfaces';
import { UserProfile } from './entities/UserProfile';
import { CrudContext } from '@eicrud/core/crud/model/CrudContext';
import {
  $MaxLength,
  $MaxSize,
  $Transform,
  $Type,
} from '@eicrud/core/validation/decorators';
import { CrudErrors } from '@eicrud/shared/CrudErrors';

const DragonFruitSecurity = (DragonFruit) => {
  return {
    cmdSecurityMap: {},

    rolesRights: {
      super_admin: {},
      admin: {},
      trusted_user: {
        async defineCRUDAbility(can, cannot, ctx) {
          can('read', DragonFruit);
        },
      },
      user: {},
      guest: {
        fields: ['name'],
        async defineCRUDAbility(can, cannot, ctx) {
          can('read', DragonFruit);
        },
      },
    },
    alwaysExcludeFields: ['secretCode'],
  } as CrudSecurity;
};
@Injectable()
export class DragonFruitService extends CrudService<DragonFruit> {
  constructor(protected moduleRef: ModuleRef) {
    const serviceName = CrudService.getName(DragonFruit);
    super(moduleRef, DragonFruit, DragonFruitSecurity(serviceName));
  }
}
