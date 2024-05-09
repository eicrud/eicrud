import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { CrudAuthService } from "../authentification/auth.service";
import { CrudAuthorizationService } from "../crud/crud.authorization.service";
import { CrudService } from "../crud/crud.service";
import { CmdSecurity, CrudSecurity } from "../crud/model/CrudSecurity";
import { MyConfigService } from "./myconfig.service";
import { ModuleRef } from "@nestjs/core";
import { UserProfile } from "./entities/UserProfile";
import { IsString, MaxLength } from "class-validator";
import { CrudUser } from "../user/model/CrudUser";
import { CrudContext } from "../crud/model/CrudContext";


class TestCmdDto {
    @IsString()
    @MaxLength(30)
    returnMessage: string;
}

const myProfileSecurity = (USER_PROFILE) => { return {

    cmdSecurityMap: {
        'testCmd': {
            maxUsesPerUser: 10,
            dto: TestCmdDto,
        } as CmdSecurity
    },

    rolesRights: {
        super_admin: {

            defineCRUDAbility(can, cannot, context) {
                can('crud', USER_PROFILE);
            },

       
        },
        admin: {
            defineCRUDAbility(can, cannot, context: CrudContext) {
                can('crud', USER_PROFILE, { type: 'basic' });
            },
        },
        moderator: {
            defineCRUDAbility(can, cannot, context: CrudContext) {
                can('read', USER_PROFILE, { type: 'basic' });
            },
        },
        user: {
  
            defineCRUDAbility(can, cannot, context) {
                const user: CrudUser = context.user;
                const userId = context.userId;
                can('crud', USER_PROFILE, { user: userId });
                cannot('cu', USER_PROFILE, { type: 'admin' });
                cannot('update', USER_PROFILE, ['type', 'user']);
            },

            defineCMDAbility(can, cannot, context) {
                can('testCmd', USER_PROFILE);
            },
        },
    },

} as CrudSecurity}

@Injectable()
export class MyProfileService extends CrudService<UserProfile> {

    constructor(
        protected moduleRef: ModuleRef,
    ) {
        const serviceName = CrudService.getName(UserProfile);
        super(moduleRef, UserProfile, myProfileSecurity(serviceName));
    }
    
}