import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { CrudAuthService } from "../core/authentification/auth.service";
import { CrudAuthorizationService } from "../core/crud/crud.authorization.service";
import { CrudService } from "../core/crud/crud.service";
import { CmdSecurity, CrudSecurity } from "../core/config/model/CrudSecurity";
import { MyConfigService } from "./myconfig.service";
import { ModuleRef } from "@nestjs/core";
import { UserProfile } from "./entities/UserProfile";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { CrudUser } from "../core/config/model/CrudUser";
import { CrudContext } from "../core/crud/model/CrudContext";
import { $MaxSize, $ToLowerCase, $Transform, $Type } from "../core/validation/decorators";


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

    @IsOptional()
    forbiddenField?: string;
}

const myProfileSecurity = (USER_PROFILE) => { return {

    cmdSecurityMap: {
        'testCmd': {
            maxUsesPerUser: 10,
            additionalUsesPerTrustPoint: 1,
            dto: TestCmdDto,
            rolesRights: { 
                user: {     
                    async defineCMDAbility(can, cannot, ctx) {
                        can('testCmd', USER_PROFILE);
                    },
                },
        
                guest: {
                    async defineCMDAbility(can, cannot, ctx) {
                        can('testCmd', USER_PROFILE,['returnMessage'], { returnMessage: "I'M A GUEST!" });
                    },
                }
            },
        } as CmdSecurity,
        'testCmdRateLimited': {
            minTimeBetweenCmdCallMs: 500,
            dto: TestCmdDto,
            rolesRights: { 
                user: {     
                    async defineCMDAbility(can, cannot, ctx) {
                        can('testCmdRateLimited', USER_PROFILE);
                    },
                },
            },
        } as CmdSecurity,

    },

    rolesRights: {
        super_admin: {

            async defineCRUDAbility(can, cannot, ctx) {
                can('crud', USER_PROFILE);
            },

       
        },
        admin: {
            async defineCRUDAbility(can, cannot, ctx: CrudContext) {
                can('crud', USER_PROFILE, { type: 'basic' });
            },

            async defineOPTAbility(can, cannot, ctx) {
                
                const populateWhiteList = ['pictures'];
                if(ctx.options?.populate?.every(p => populateWhiteList.includes(p))) {
                    can('populate', USER_PROFILE);
                }

            },
        },
        moderator: {
            async defineCRUDAbility(can, cannot, ctx: CrudContext) {
                can('read', USER_PROFILE, { type: 'basic' });
            },
        },
        user: {
  
            async defineCRUDAbility(can, cannot, ctx) {
                const user: CrudUser = ctx.user;
                const userId = ctx.userId;
                can('crud', USER_PROFILE, { user: userId });
                cannot('cu', USER_PROFILE, { type: 'admin' });
                cannot('update', USER_PROFILE, ['type', 'user']);
            },
  
        },

        guest: {

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

    $testCmd(dto: TestCmdDto, ctx: CrudContext, inheritance?: any ): Promise<string> {
        let res = dto?.sub?.subfield || dto.returnMessage;
        return Promise.resolve(res);
    }  
    
    $testCmdRateLimited(dto: TestCmdDto, ctx: CrudContext, inheritance?: any ): Promise<string> {
        let res = dto?.sub?.subfield || dto.returnMessage;
        return Promise.resolve(res);
    }

}