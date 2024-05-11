import { ForbiddenException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { AuthUtils } from "../authentification/auth.utils";
import { CrudContext } from "./model/CrudContext";
import { CrudRole } from "./model/CrudRole";
import { defineAbility, subject } from "@casl/ability";
import { CrudSecurity, CrudSecurityRights, httpAliasResolver } from "./model/CrudSecurity";
import { CrudUserService } from "../user/crud-user.service";
import { CRUD_CONFIG_KEY, CrudConfigService } from "./crud.config.service";
import { CrudUser } from "../user/model/CrudUser";
import { ModuleRef } from "@nestjs/core";

@Injectable()
export class CrudAuthorizationService {
    protected crudConfig: CrudConfigService;
    rolesMap: Record<string, CrudRole> = {};
    constructor(
        protected moduleRef: ModuleRef
    ) { 

    }

    onModuleInit() {
        this.crudConfig = this.moduleRef.get(CRUD_CONFIG_KEY,{ strict: false })
        this.rolesMap = this.crudConfig.rolesMap;
      }

    getCtxUserRole(ctx: CrudContext): CrudRole {
        const role = ctx.user?.role || this.crudConfig.guest_role;
        return this.rolesMap[role];
    }

    
    getUserRole(user: CrudUser): CrudRole {
        const role = user?.role || this.crudConfig.guest_role;
        return this.rolesMap[role];
    }

    getMatchBatchSizeFromCrudRoleAndParents(ctx: CrudContext, userRole: CrudRole){
        const roleRights: CrudSecurityRights = ctx.security.rolesRights?.[userRole.name] || {} as any;
      
        let maxBatchSize = roleRights?.maxBatchSize || 0;

        if (userRole.inherits?.length) {
            for (const parent of userRole.inherits) {
                const parentRole = this.rolesMap[parent];
                const parentMaxBatchSize = this.getMatchBatchSizeFromCrudRoleAndParents(ctx, parentRole);
                if (parentMaxBatchSize > maxBatchSize) {
                    maxBatchSize = parentMaxBatchSize;
                }
            }
        }
        return maxBatchSize;

    }

    authorizeBatch(ctx: CrudContext, batchSize: number) {

        if((batchSize || 0) < 1){
            throw new ForbiddenException(`Batchsize must be at least 1`);
        }
        
        const userRole: CrudRole = this.getCtxUserRole(ctx);
        const adminBatch = this.getCtxUserRole(ctx).isAdminRole ? 100 : 0;

        const maxBatchSize = Math.max(adminBatch, this.getMatchBatchSizeFromCrudRoleAndParents(ctx, userRole));
        
        if (batchSize > maxBatchSize) {
            throw new ForbiddenException(`Maxbatchsize (${maxBatchSize}) exceeded (${batchSize}).`);
        }

        this.checkmaxItemsPerUser(ctx, batchSize);        

    }

    async computeMaxItemsPerUser(ctx: CrudContext, addCount: number = 0) {
        let max = ctx.security.maxItemsPerUser || this.crudConfig.validationOptions.DEFAULT_MAX_ITEMS_PER_USER; ;
        let add = ctx.security.additionalItemsInDbPerTrustPoints;
        if(add){
           const trust = (await this.crudConfig.userService.getOrComputeTrust(ctx.user, ctx));
           if(trust >= 1){
            max+= add*trust;
           }
        }
        return max
    }

    async checkmaxItemsPerUser(ctx: CrudContext, addCount: number = 0) {
        if (ctx.origin == 'crud' && this.crudConfig.userService.notGuest(ctx.user) &&
            ctx.method == 'POST') {

            const count = ctx.user?.crudUserDataMap?.[ctx.serviceName]?.itemsCreated + addCount;
            const max = await this.computeMaxItemsPerUser(ctx, addCount);
            if (count >= max) {
                throw new ForbiddenException(`You have reached the maximum number of items for this resource (${ctx.security.maxItemsPerUser})`);
            }
        }
    }

    async authorize(ctx: CrudContext) {

        if(ctx.security.guest_can_read_all && ctx.method == 'GET'){
            return true;
        }

        const fields = AuthUtils.getObjectFields(ctx.data);

        if (ctx.origin == 'crud' && !ctx.isBatch){
            await this.checkmaxItemsPerUser(ctx);
        }else if (ctx.origin == 'cmd'){
            const cmdSec = ctx.security.cmdSecurityMap?.[ctx.cmdName];
            const hasMaxUses =cmdSec?.maxUsesPerUser && this.crudConfig.userService.notGuest(ctx.user)
            const isSecureOnly = cmdSec?.secureOnly;
            if(ctx.method != 'POST' && (hasMaxUses || isSecureOnly)){
                // in that case user is cached and we can't check the cmd count properly
                throw new ForbiddenException(`Command must be used in secure mode (POST)`);
            }
            if(hasMaxUses) {
            
                let max = cmdSec.maxUsesPerUser;
                let add = cmdSec.additionalUsesPerTrustPoint;
                if(add){
                   add = add*(await this.crudConfig.userService.getOrComputeTrust(ctx.user, ctx));
                   max+=Math.max(add,0);
                }
                const count = ctx.user?.crudUserDataMap?.[ctx.serviceName]?.cmdMap?.[ctx.cmdName];
                if (count >= max) {
                    throw new ForbiddenException(`You have reached the maximum uses for this command (${ctx.security.maxItemsPerUser})`);
                }
            }
        }
  

        const crudRole: CrudRole = this.getCtxUserRole(ctx);

        const checkRes = this.recursCheckRolesAndParents(crudRole, ctx, fields);

        if (!checkRes) {
            let msg = `Role ${ctx.user.role} is not allowed to ${ctx.method} ${ctx.serviceName} ${ctx.cmdName || ''}`;
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
        let allGood = false;

        if(roleRights){
            const userAbilities = defineAbility((can, cannot) => {
                
                if(crudContext.origin == "crud"){
                    roleRights.defineCRUDAbility?.(can, cannot, crudContext);
                }else{
                    roleRights.defineCMDAbility?.(can, cannot, crudContext);
                }
                
                if (roleRights.fields && crudContext.method == 'GET') {
                    crudContext.options.fields = roleRights.fields as any;
                }
            }, { resolveAction: httpAliasResolver});
            const methodToCheck = crudContext.origin == "crud" ? crudContext.method : crudContext.cmdName;
            allGood = this.loopFieldAndCheckCannot(true, methodToCheck, crudContext.query, fields, userAbilities, crudContext);
        }

        if (allGood && crudContext.options) {
            const userOptionsAbilities = defineAbility((can, cannot) => {
                roleRights.defineOPTAbility?.(can, cannot, crudContext);
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
                const parentRole = this.rolesMap[parent];
                const checkRes = this.recursCheckRolesAndParents(parentRole, crudContext, fields)
                if (checkRes) {
                    return checkRes;
                }
            }
        }
        return null;
    }
}

