import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { CrudAuthService } from "../core/authentification/auth.service";
import { CrudAuthorizationService } from "../core/crud/crud.authorization.service";
import { CrudService } from "../core/crud/crud.service";
import { CmdSecurity, CrudSecurity } from "../core/crud/model/CrudSecurity";
import { CrudUserService } from "../core/user/crud-user.service";
import { MyUser } from "./entities/MyUser";
import { MyConfigService } from "./myconfig.service";
import { ModuleRef } from "@nestjs/core";
import { baseCmds } from "../core/user/crud-user.service";


const myUserSecurity = (USER) => { return {

    cmdSecurityMap: {

    },

    rolesRights: {
        super_admin: {

        },
        admin: {
        },
        trusted_user: {
        },
        user: {

        },
        guest: {
            defineCMDAbility(can, cannot, ctx) {
                const createAccount = baseCmds.createAccount.name;
                can(createAccount, USER);
            }
        }
    },

} as CrudSecurity}
@Injectable()
export class MyUserService extends CrudUserService<MyUser> {

    constructor(
        protected moduleRef: ModuleRef,
    ) {
        super(moduleRef, MyUser, myUserSecurity(CrudService.getName(MyUser)));
    }
    
}