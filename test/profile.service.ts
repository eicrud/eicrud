import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { CrudAuthService } from "../core/authentification/auth.service";
import { CrudAuthorizationService } from "../core/crud/crud.authorization.service";
import { CrudService } from "../core/crud/crud.service";
import { CmdSecurity, CrudSecurity } from "../core/crud/model/CrudSecurity";
import { MyConfigService } from "./myconfig.service";
import { ModuleRef } from "@nestjs/core";
import { UserProfile } from "./entities/UserProfile";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { CrudUser } from "../core/user/model/CrudUser";
import { CrudContext } from "../core/crud/model/CrudContext";
import { $MaxSize, $ToLowerCase, $Transform, $Type } from "../core/crud/transform/decorators";


class subTestCmdDto {

    @IsString()
    @$MaxSize(100)
    @$ToLowerCase()
    subfield: string;

}
export class TestCmdDto {
    @IsString()
    @MaxLength(30)
    @$Transform((value: string) => value.toUpperCase())
    returnMessage: string;

    @IsOptional()
    @$Type(subTestCmdDto)
    sub?: subTestCmdDto;
}

const myProfileSecurity = (USER_PROFILE) => { return {

    cmdSecurityMap: {
        'testCmd': {
            maxUsesPerUser: 10,
            additionalUsesPerTrustPoint: 1,
            dto: TestCmdDto,
        } as CmdSecurity
    },

    rolesRights: {
        super_admin: {

            defineCRUDAbility(can, cannot, ctx) {
                can('crud', USER_PROFILE);
            },

       
        },
        admin: {
            defineCRUDAbility(can, cannot, ctx: CrudContext) {
                can('crud', USER_PROFILE, { type: 'basic' });
            },
        },
        moderator: {
            defineCRUDAbility(can, cannot, ctx: CrudContext) {
                can('read', USER_PROFILE, { type: 'basic' });
            },
        },
        user: {
  
            defineCRUDAbility(can, cannot, ctx) {
                const user: CrudUser = ctx.user;
                const userId = ctx.userId;
                can('crud', USER_PROFILE, { user: userId });
                cannot('cu', USER_PROFILE, { type: 'admin' });
                cannot('update', USER_PROFILE, ['type', 'user']);
            },

            defineCMDAbility(can, cannot, ctx) {
                can('testCmd', USER_PROFILE);
            },
        },

        guest: {
            defineCMDAbility(can, cannot, ctx) {
                can('testCmd', USER_PROFILE, { returnMessage: "I'M A GUEST!" });
            },
        }
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

    override $cmdHandler(cmdName: string, ctx: CrudContext, inheritance?: any): Promise<any> {
        if (cmdName === 'testCmd') {
            const dto = ctx.data as TestCmdDto;
            let res = dto?.sub?.subfield || dto.returnMessage;
 
            return Promise.resolve(res);
        }
        return super.$cmdHandler(cmdName, ctx, inheritance);
    }
    
}