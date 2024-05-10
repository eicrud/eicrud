import { ModuleRef } from "@nestjs/core";
import { CrudService } from "../crud/crud.service";
import { CmdSecurity, CrudSecurity } from "../crud/model/CrudSecurity";
import { Melon } from "./entities/Melon";
import { MyConfigService } from "./myconfig.service";
import { Injectable } from "@nestjs/common";
import { CrudUser } from "../user/model/CrudUser";


const melonSecurity = (MELON) => { return {

    cmdSecurityMap: {
        'testCmd': {
            maxUsesPerUser: 10,
        } as CmdSecurity
    },

    rolesRights: {
        super_admin: {

            defineCRUDAbility(can, cannot, context) {
                can('crud', MELON);
            },

        },
        admin: {
        },
        trusted_user: {
            maxBatchSize: 5,
        },
        user: {
  
            defineCRUDAbility(can, cannot, context) {
                const user: CrudUser = context.user;
                const userId = context.userId;
                can('cud', MELON, { owner: userId });
                cannot('cu', MELON, ['size'])
                can('read', MELON);
            },

            defineCMDAbility(can, cannot, context) {
                can('testCmd', MELON);
            },
        },
    },

} as CrudSecurity}
@Injectable()
export class MelonService extends CrudService<Melon> {
    constructor(protected moduleRef: ModuleRef) {
        const serviceName = CrudService.getName(Melon);
        super(moduleRef, Melon, melonSecurity(serviceName));

    }

    onApplicationBootstrap() {
    }
}