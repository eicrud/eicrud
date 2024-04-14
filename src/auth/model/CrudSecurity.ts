import { AbilityBuilder, createAliasResolver } from "@casl/ability";
import { CrudContext } from "./CrudContext";

export class CrudSecurity {

    maxSize?: number;
    maxItemsInDb?: number;
    maxItemsPerUser?: number;
    rolesRights: Record<string, CrudSecurityRights> = {};

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

 
export interface BatchRights {
    canBatch: boolean;
    maxBatchSize: number;
}

export interface CrudSecurityRights {

    createBatchRights?: BatchRights;
    updateBatchRights?: BatchRights;
    deleteBatchRights?: BatchRights;
    
    fields: string[];

    defineCRUDAbility(can: AbilityBuilder<any>['can'], cannot: AbilityBuilder<any>['cannot'], context: CrudContext);
    
    defineCMDAbility(can: AbilityBuilder<any>['can'], cannot: AbilityBuilder<any>['cannot'], context: CrudContext);

    defineOPTAbility(can: AbilityBuilder<any>['can'], cannot: AbilityBuilder<any>['cannot'], context: CrudContext);
    
}


