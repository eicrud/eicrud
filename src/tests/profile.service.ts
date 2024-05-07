import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { CrudAuthService } from "../authentification/auth.service";
import { CrudAuthorizationService } from "../crud/crud.authorization.service";
import { CrudService } from "../crud/crud.service";
import { CrudSecurity } from "../crud/model/CrudSecurity";
import { MyConfigService } from "./myconfig.service";
import { ModuleRef } from "@nestjs/core";
import { UserProfile } from "./entities/UserProfile";



const myProfileSecurity = (USER_PROFILE) => { return {

    rolesRights: {
        super_admin: {

            defineCRUDAbility(can, cannot, context) {
                can('crud', USER_PROFILE);
            }
       
        },
        admin: {
    
        },
        user: {
  
        },
    },

}}

@Injectable()
export class MyProfileService extends CrudService<UserProfile> {

    constructor(
        protected moduleRef: ModuleRef,
    ) {
        const serviceName = CrudService.getName(UserProfile);
        super(moduleRef, UserProfile, myProfileSecurity(serviceName));
    }
    
}