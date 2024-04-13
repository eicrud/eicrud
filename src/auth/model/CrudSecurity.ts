import { AbilityBuilder, createAliasResolver } from "@casl/ability";
import { CrudContext } from "../auth.utils";

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

 

export interface CrudSecurityRights {

    fields: string[];

    defineAbility(can: AbilityBuilder<any>['can'], cannot: AbilityBuilder<any>['cannot'], context: CrudContext);

}


