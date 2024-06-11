import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { CrudAuthService } from '../core/authentication/auth.service';
import { CrudAuthorizationService } from '../core/crud/crud.authorization.service';
import { CrudService } from '../core/crud/crud.service';
import { CmdSecurity, CrudSecurity } from '../core/config/model/CrudSecurity';
import { MyConfigService } from './myconfig.service';
import { ModuleRef } from '@nestjs/core';
import { Picture } from './entities/Picture';

const myPictureSecurity = (PICTURE) => {
  return {
    cmdSecurityMap: {},
    maxItemsInDb: 10,
    rolesRights: {
      super_admin: {
        async defineCRUDAbility(can, cannot, ctx) {
          can('crud', PICTURE);
        },
      },
      admin: {},
      moderator: {},
      user: {},

      guest: {},
    },
  } as CrudSecurity;
};

@Injectable()
export class MyPictureService extends CrudService<Picture> {
  constructor(protected moduleRef: ModuleRef) {
    const serviceName = CrudService.getName(Picture);
    super(moduleRef, Picture, myPictureSecurity(serviceName));
  }
}
