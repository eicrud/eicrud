import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { CrudAuthService } from "../core/authentification/auth.service";
import { CrudAuthorizationService } from "../core/crud/crud.authorization.service";
import { CrudService } from "../core/crud/crud.service";
import { CmdSecurity, CrudSecurity } from "../core/config/model/CrudSecurity";
import { MyConfigService } from "./myconfig.service";
import { ModuleRef } from "@nestjs/core";
import { Picture } from "./entities/Picture";


const myPictureSecurity = (USER_PROFILE) => { return {

    cmdSecurityMap: {

    },

    rolesRights: {
        super_admin: {

        },
        admin: {
  
        },
        moderator: {
  
        },
        user: {
  
    
        },

        guest: {

        }
    },

} as CrudSecurity}

@Injectable()
export class MyPictureService extends CrudService<Picture> {

    constructor(
        protected moduleRef: ModuleRef,
    ) {
        const serviceName = CrudService.getName(Picture);
        super(moduleRef, Picture, myPictureSecurity(serviceName));
    }

}