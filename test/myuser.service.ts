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
import { IsString, MaxLength } from "class-validator";
import { $Transform } from "../core/crud/transform/decorators";
import { CrudContext } from "../core/crud/model/CrudContext";
import { MyProfileService } from "./profile.service";

class CallTestCmdDto {
    @IsString()
    @MaxLength(30)
    returnMessage: string;
}

const cmdSecurityMap: Record<string, CmdSecurity> = {
    'callTestCmd': {
        dto: CallTestCmdDto
    }
}

const myUserSecurity = (USER) => {
    return {

        cmdSecurityMap,

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
                async defineCMDAbility(can, cannot, ctx) {
                    const createAccount = baseCmds.createAccount.name;
                    can(createAccount, USER, { role: 'user' });

                    can('callTestCmd', USER);
                }
            }
        },


    } as CrudSecurity
}


@Injectable()
export class MyUserService extends CrudUserService<MyUser> {

    constructor(
        protected moduleRef: ModuleRef,
        protected profileService: MyProfileService
    ) {
        super(moduleRef, MyUser, myUserSecurity(CrudService.getName(MyUser)));
    }

    async $callTestCmd(dto: CallTestCmdDto, ctx: CrudContext) {

        return await this.profileService.$testCmd(dto, ctx);

    }

}