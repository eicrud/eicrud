import { ForbiddenException } from "@nestjs/common";
import { AuthUtils } from "../auth/auth.utils";
import { CrudContext } from "../auth/model/CrudContext";
import { CrudRole } from "../auth/model/CrudRole";
import { defineAbility, subject } from "@casl/ability";
import { CrudSecurity, httpAliasResolver } from "../auth/model/CrudSecurity";


export class CrudAuthorization {

    constructor(
        protected roles: CrudRole[] = [], 
        public securityMap: Record<string, CrudSecurity> = {}
    ) { }


    authorize(ctx: CrudContext) {

        const fields = AuthUtils.getObjectFields(ctx.data);
        ctx.security = this.securityMap[ctx.serviceName];
        
        if (ctx.security.maxItemsPerUser && ctx.method == 'POST') {
            const count = ctx.user?.crudMap?.[ctx.serviceName];
            if (count >= ctx.security.maxItemsPerUser) {
                throw new ForbiddenException(`You have reached the maximum number of items for this resource (${ctx.security.maxItemsPerUser})`);
            }
        }

        const crudRole: CrudRole = this.roles.find(role => role.name == ctx.user.role) || { name: 'guest' };

        const checkRes = this.recursCheckRolesAndParents(crudRole, ctx, fields);

        if (!checkRes) {
            let msg = `Role ${ctx.user.role} is not allowed to ${ctx.method} ${ctx.serviceName} `;
            throw new ForbiddenException(msg);
        }

        return true;
    }

    loopFieldAndCheckCannot(allGood, method, query, fields, userAbilities, crudContext: CrudContext){
        for (const field of fields) {
            const sub = subject(crudContext.serviceName, query);
            if (userAbilities.cannot(method, sub, field)) {
                allGood = false;
                break;
            }
        }
        return allGood;
    }

    recursCheckRolesAndParents(role: CrudRole, crudContext: CrudContext, fields: string[]): CrudRole | null {
        const roleRights = crudContext.security.rolesRights[role.name];
        const userAbilities = defineAbility((can, cannot) => {
            
            if(crudContext.type == "crud"){
                roleRights.defineCRUDAbility(can, cannot, crudContext);
            }else{
                roleRights.defineCMDAbility(can, cannot, crudContext);
            }
            
            if (roleRights.fields && crudContext.method == 'GET') {
                crudContext.options.fields = roleRights.fields;
            }
        }, { resolveAction: httpAliasResolver });
        let allGood = this.loopFieldAndCheckCannot(true, crudContext.method, crudContext.query, fields, userAbilities, crudContext);
        
        if (allGood && crudContext.options) {
            const userOptionsAbilities = defineAbility((can, cannot) => {
                roleRights.defineOPTAbility(can, cannot, crudContext);
            }, {});
            for(const key of Object.keys(crudContext.options)){
                allGood = this.loopFieldAndCheckCannot(true, key, crudContext.options, fields, userOptionsAbilities, crudContext);
                if(!allGood){
                    break;
                }
            }
        }

        if (allGood) {
            return role;
        }
        if (role.inherits?.length) {
            for (const parent of role.inherits) {
                const parentRole = this.roles.find(role => role.name == parent);
                const checkRes = this.recursCheckRolesAndParents(parentRole, crudContext, fields)
                if (checkRes) {
                    return checkRes;
                }
            }
        }
        return null;
    }
}

