import { BadRequestException, ForbiddenException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { AuthUtils } from "../authentification/auth.utils";
import { CrudContext } from "./model/CrudContext";
import { CrudRole } from "./model/CrudRole";
import { defineAbility, subject } from "@casl/ability";
import { CmdSecurity, CrudSecurity, CrudSecurityRights, httpAliasResolver } from "./model/CrudSecurity";
import { CrudUserService } from "../user/crud-user.service";
import { CRUD_CONFIG_KEY, CrudConfigService } from "./crud.config.service";
import { CrudUser } from "../user/model/CrudUser";
import { ModuleRef } from "@nestjs/core";
import { _utils } from "../utils";
import { CrudErrors } from "../../shared/CrudErrors";


const SKIPPABLE_OPTIONS = ['limit', 'offset', 'sort', 'fields', 'mockRole'];

@Injectable()
export class CrudAuthorizationService {
    protected crudConfig: CrudConfigService;
    rolesMap: Record<string, CrudRole> = {};
    constructor(
        protected moduleRef: ModuleRef
    ) {

    }



    onModuleInit() {
        this.crudConfig = this.moduleRef.get(CRUD_CONFIG_KEY, { strict: false })
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

    getMatchBatchSizeFromCrudRoleAndParents(ctx: CrudContext, userRole: CrudRole, security: CrudSecurity) {
        const roleRights: CrudSecurityRights = security.rolesRights?.[userRole.name] || {} as any;

        let maxBatchSize = roleRights?.maxBatchSize || 0;

        if (userRole.inherits?.length) {
            for (const parent of userRole.inherits) {
                const parentRole = this.rolesMap[parent];
                const parentMaxBatchSize = this.getMatchBatchSizeFromCrudRoleAndParents(ctx, parentRole, security);
                if (parentMaxBatchSize > maxBatchSize) {
                    maxBatchSize = parentMaxBatchSize;
                }
            }
        }
        return maxBatchSize;

    }

    authorizeBatch(ctx: CrudContext, batchSize: number, security: CrudSecurity) {

        if ((batchSize || 0) < 1) {
            throw new BadRequestException(`Batchsize must be at least 1`);
        }

        const userRole: CrudRole = this.getCtxUserRole(ctx);
        const adminBatch = this.getCtxUserRole(ctx).isAdminRole ? 100 : 0;

        const maxBatchSize = Math.max(adminBatch, this.getMatchBatchSizeFromCrudRoleAndParents(ctx, userRole, security));

        if (batchSize > maxBatchSize) {
            throw new BadRequestException(CrudErrors.MAX_BATCH_SIZE_EXCEEDED.str({ maxBatchSize, batchSize }));
        }

        this.checkmaxItemsPerUser(ctx, security, batchSize);

    }

    async getOrComputeTrust(user: CrudUser, ctx: CrudContext) {
        const TRUST_COMPUTE_INTERVAL = 1000 * 60 * 60 * 24;
        if (ctx.userTrust) {
            return ctx.userTrust;
        }
        if (user.lastComputedTrust && (new Date(user.lastComputedTrust).getTime() + TRUST_COMPUTE_INTERVAL) > Date.now()) {
            ctx.userTrust = user.trust;
            return user.trust || 0;
        }
        return await this.crudConfig.userService.$computeTrust(user, ctx);
    }

    async computeMaxUsesPerUser(ctx: CrudContext, cmdSec: CmdSecurity) {
        let max = cmdSec.maxUsesPerUser;
        let add = cmdSec.additionalUsesPerTrustPoint;
        if (add) {
            add = add * (await this.getOrComputeTrust(ctx.user, ctx));
            max += Math.max(add, 0);
        }
        return max;
    }

    async computeMaxItemsPerUser(ctx: CrudContext, security: CrudSecurity, addCount: number = 0) {
        let max = security.maxItemsPerUser || this.crudConfig.validationOptions.DEFAULT_MAX_ITEMS_PER_USER;;
        let add = security.additionalItemsInDbPerTrustPoints;
        if (add) {
            const trust = (await this.getOrComputeTrust(ctx.user, ctx));
            if (trust >= 1) {
                max += add * trust;
            }
        }
        return max
    }

    async checkmaxItemsPerUser(ctx: CrudContext, security: CrudSecurity, addCount: number = 0) {
        if (ctx.origin == 'crud' && this.crudConfig.userService.notGuest(ctx.user) &&
            ctx.method == 'POST') {
            const dataMap = _utils.parseIfString(ctx.user?.crudUserCountMap || {});
            const count = (dataMap?.[ctx.serviceName] || 0) + addCount;
            const max = await this.computeMaxItemsPerUser(ctx, security, addCount);
            if (count >= max) {
                throw new ForbiddenException(`You have reached the maximum number of items for this resource (${security.maxItemsPerUser})`);
            }
        }
    }

    async authorize(ctx: CrudContext, security: CrudSecurity) {

        if (security.guest_can_read_all && ctx.method == 'GET') {
            return true;
        }

        const fields = AuthUtils.getObjectFields(ctx.data);

        if (ctx.origin == 'crud' && !ctx.isBatch) {
            await this.checkmaxItemsPerUser(ctx, security);
        } else if (ctx.origin == 'cmd') {
            const cmdSec = security.cmdSecurityMap?.[ctx.cmdName];
            const hasMaxUses = cmdSec?.maxUsesPerUser && this.crudConfig.userService.notGuest(ctx.user)
            const isSecureOnly = cmdSec?.secureOnly;
            if (ctx.method != 'POST' && (hasMaxUses || isSecureOnly)) {
                // in that case user is cached and we can't check the cmd count properly
                throw new ForbiddenException(`Command must be used in secure mode (POST)`);
            }
            if (hasMaxUses) {
                let max = await this.computeMaxUsesPerUser(ctx, cmdSec);
                const cmdMap = _utils.parseIfString(ctx.user?.cmdUserCountMap || {});
                const count = cmdMap?.[ctx.serviceName + '_' + ctx.cmdName] || 0;
                if (count >= max) {
                    throw new ForbiddenException(`You have reached the maximum uses for this command (${max})`);
                }
            }
        }

        const crudRole: CrudRole = this.getCtxUserRole(ctx);

        const checkRes: SecurityResult = this.recursCheckRolesAndParents(crudRole, ctx, fields, security);

        if (!checkRes.authorized) {
            let msg = `Role ${ctx.user.role} is not allowed to ${ctx.method} ${ctx.serviceName} ${ctx.cmdName || ''}`;
            for(let r of checkRes.checkedRoles){
                msg += `- ${r.roleName} failed on ${r.problemField} `;
            }
            throw new ForbiddenException(msg);
        }

        return true;
    }

    loopFieldAndCheckCannot(method, query, fields, userAbilities, ctx: CrudContext) {
        let problemField = null;
        for (const field of fields) {
            const sub = subject(ctx.serviceName, query);
            if (userAbilities.cannot(method, sub, field)) {
                problemField = field;
                break;
            }
        }
        return problemField;
    }

    recursCheckRolesAndParents(role: CrudRole, ctx: CrudContext, fields: string[], security: CrudSecurity): SecurityResult {
        const roleRights = security.rolesRights[role.name];
        const result: SecurityResult = { checkedRoles: [], authorized: false };
        let currentResult: RoleResult = null;
        if (!roleRights) {
            currentResult = { roleName: role.name, problemField: 'all' };
        }else{
            const userAbilities = defineAbility((can, cannot) => {

                if (ctx.origin == "crud") {
                    roleRights.defineCRUDAbility?.(can, cannot, ctx);
                } else {
                    roleRights.defineCMDAbility?.(can, cannot, ctx);
                }
    
                if (roleRights.fields && ctx.method == 'GET') {
                    ctx.options.fields = roleRights.fields as any;
                }
            }, { resolveAction: httpAliasResolver });
            const methodToCheck = ctx.origin == "crud" ? ctx.method : ctx.cmdName;
            const problemField = this.loopFieldAndCheckCannot( methodToCheck, ctx.query, fields, userAbilities, ctx);
            if (problemField) {
                currentResult = { roleName: role.name, problemField };
            }
        }
       

        if (!currentResult && ctx.options) {
            const userOptionsAbilities = defineAbility((can, cannot) => {
                roleRights.defineOPTAbility?.(can, cannot, ctx);
            }, {});

            for (const key of Object.keys(ctx.options)) {
                if (SKIPPABLE_OPTIONS.includes(key)) {
                    continue;
                }
                const pbField = this.loopFieldAndCheckCannot(key, ctx.options, fields, userOptionsAbilities, ctx);
                if (pbField) {
                    currentResult = { roleName: role.name, problemField: key };
                    break;
                }
            }
        }

        if (!currentResult) {
            result.checkedRoles.push({ roleName: role.name, problemField: null });
            result.authorized = true;
            return result;
        }
        result.checkedRoles.push(currentResult);
        if (role.inherits?.length) {
            for (const parent of role.inherits) {
                const parentRole = this.rolesMap[parent];
                const checkRes: SecurityResult = this.recursCheckRolesAndParents(parentRole, ctx, fields, security)
                result.checkedRoles.push(...checkRes.checkedRoles);
                if (checkRes.authorized) {
                    result.authorized = true;
                    break;
                }
            }
        }
        return result;
    }
}



interface RoleResult {
    roleName: string;
    problemField: string;
}

interface SecurityResult {
    checkedRoles: RoleResult[];
    authorized: boolean;
}

