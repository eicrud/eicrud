import { AbilityBuilder, createAliasResolver } from "@casl/ability";
import { CrudContext } from "./CrudContext";

export interface CmdSecurity {
    maxUsesPerUser?: number;
    additionalUsesPerTrustPoint?: number;
    secureOnly?: boolean;
    dto: { new(): any };
}
export class CrudSecurity {

    guest_can_read_all?: boolean;

    maxItemsInDb?: number;
    maxItemsPerUser?: number;

    additionalItemsInDbPerTrustPoints?: number;

    cmdSecurityMap?: Record<string, CmdSecurity> = {};

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
 
export interface CrudSecurityRights {

    maxBatchSize?: number;
    
    fields?: string[];

    defineCRUDAbility?(can: AbilityBuilder<any>['can'], cannot: AbilityBuilder<any>['cannot'], context: CrudContext);
    
    defineCMDAbility?(can: AbilityBuilder<any>['can'], cannot: AbilityBuilder<any>['cannot'], context: CrudContext);

    defineOPTAbility?(can: AbilityBuilder<any>['can'], cannot: AbilityBuilder<any>['cannot'], context: CrudContext);
    
}


