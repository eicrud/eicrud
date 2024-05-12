import { AbilityBuilder, createAliasResolver } from "@casl/ability";
import { CrudContext } from "./CrudContext";

/**
 * Security applied to a cmd.
 */
export interface CmdSecurity {
    /**
    * Max number of times an user can call the cmd
    * @type {number}
    * @public
    */
    maxUsesPerUser?: number;
    /**
    * Adds (X * user.trust) to {@link maxUsesPerUser} when checking create permissions
    * @usageNotes
    * Use when you want to gradually increase the number of uses for trusted users.
    * @type {number}
    * @public
    */
    additionalUsesPerTrustPoint?: number;
    /**
     * If true, cmd can only be called in secure mode (POST)
     * @usageNotes
     * Use when you need a non-cached ctx.user inside your cmd.
     * @type {boolean}
     */
    secureOnly?: boolean;
    /**
     * DTO class to use for the cmd arguments (ctx.data).
     * @usageNotes
     * - Cannot use `class-transformer` decorators in the DTO class.
     * - Can use `class-validator` & `eicrud` decorators.
     */
    dto: { new(): any };
}

/**
 * Security applied to a service
 */
export class CrudSecurity {

    /**
    * Allow guest to read all entities
    * @usageNotes
    * Use when all entities in the service are public, increase read performance
    * @type {boolean}
    * @public
    */
    guest_can_read_all?: boolean;

    /**
    * Max number of entities allowed in the db
    * @type {number}
    * @public
    */
    maxItemsInDb?: number;

    /**
    * Max number of entities an user can create in the db
    * @type {number}
    * @public
    */
    maxItemsPerUser?: number;

    /**
    * Adds (X * user.trust) to {@link maxItemsPerUser} when checking create permissions
    * @usageNotes
    * Use when you want to gradually increase the number of max entities allowed for trusted users.
    * @type {number}
    * @public
    */
    additionalItemsInDbPerTrustPoints?: number;

    /**
     * Map of {@link CmdSecurity}.
     * @example
     * { 'cmd_name': { secureOnly: true, dto: CmdDto } }
     * 
     * @type {Record<string, CmdSecurity>}
     * @public
     */
    cmdSecurityMap?: Record<string, CmdSecurity> = {};


     /**
     * Map of {@link CrudSecurityRights}.
     * @example
     * { 
     *   'super_admin': {
     *       defineCRUDAbility(can, cannot, ctx) {
     *          can('crud', 'service_name');
     *       },
     *   },
     * }
     * @type {Record<string, CrudSecurityRights>}
     * @public
     */
    rolesRights?: Record<string, CrudSecurityRights> = {};

}

export const httpAliasResolver = createAliasResolver({
    create: ['POST'],
    read: ['GET'],
    update: ['PUT', 'PATCH'],
    delete: ['DELETE'],
    crud: ['POST', 'GET', 'PUT', 'PATCH', 'DELETE'],
    cru: ['POST', 'GET', 'PUT', 'PATCH'],
    crd: ['POST', 'GET', 'DELETE'],
    cud: ['POST', 'PUT', 'PATCH', 'DELETE'],
    cr: ['POST', 'GET'],
    cu: ['POST', 'PUT', 'PATCH'],
    cd: ['POST', 'DELETE'],
    ru: ['GET', 'PUT', 'PATCH'],
    rd: ['GET', 'DELETE'],
    ud: ['PUT', 'PATCH', 'DELETE'],
});
 
/**
 * Security rights for a specific role
 */
export interface CrudSecurityRights {

    maxBatchSize?: number;
    
    fields?: string[];

    defineCRUDAbility?(can: AbilityBuilder<any>['can'], cannot: AbilityBuilder<any>['cannot'], ctx: CrudContext);
    
    defineCMDAbility?(can: AbilityBuilder<any>['can'], cannot: AbilityBuilder<any>['cannot'], ctx: CrudContext);

    defineOPTAbility?(can: AbilityBuilder<any>['can'], cannot: AbilityBuilder<any>['cannot'], ctx: CrudContext);
    
}


