import { ModuleRef } from "@nestjs/core";

import { Melon } from "./entities/Melon";
import { MyConfigService } from "./myconfig.service";
import { Injectable } from "@nestjs/common";
import { CrudService } from "../core/crud/crud.service";
import { CrudSecurity } from "../core/crud/model/CrudSecurity";
import { CrudUser } from "../core/user/model/CrudUser";

const melonSecurity = (MELON) => { return {

    cmdSecurityMap: {

    },

    rolesRights: {
        super_admin: {

            async defineCRUDAbility(can, cannot, ctx) {
                can('crud', MELON);
            },

        },
        admin: {
        },
        trusted_user: {
            maxBatchSize: 5,
        },
        user: {
  
            async defineCRUDAbility(can, cannot, ctx) {
                const user: CrudUser = ctx.user;
                const userId = ctx.userId;
                can('cud', MELON, { owner: userId });
                cannot('cu', MELON, ['size']);
                can('read', MELON);
            },

            async defineCMDAbility(can, cannot, ctx) {
            },
        },
        guest: {
            async defineCRUDAbility(can, cannot, ctx) {
                can('read', MELON);
            }
        }
    },

    maxItemsPerUser: 10,
    additionalItemsInDbPerTrustPoints: 1,

} as CrudSecurity}
@Injectable()
export class MelonService extends CrudService<Melon> {
    constructor(protected moduleRef: ModuleRef) {
        const serviceName = CrudService.getName(Melon);
        super(moduleRef, Melon, melonSecurity(serviceName));

    }
    

}