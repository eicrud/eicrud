import { CrudContext, CrudHooks } from "@eicrud/core/crud";
import { tk_entity_name } from "./tk_entity_lname.entity";
import { tk_entity_nameService } from "./tk_entity_lname.service";

export class tk_entity_nameHooks extends CrudHooks<tk_entity_name> {

    override async $beforeCreateHook(this: tk_entity_nameService, data: Partial<tk_entity_name>[], ctx: CrudContext) {
        // before tk_entity_name creation


        return data;
    }

    override async $afterCreateHook(this: tk_entity_nameService, result: any[], data: Partial<tk_entity_name>[], ctx: CrudContext) {
        // after tk_entity_name creation


        return result;
    }

    override async $beforeReadHook(this: tk_entity_nameService, query: Partial<tk_entity_name>, ctx: CrudContext) {
        // before tk_entity_name read


        return query;
    }

    override async $afterReadHook(this: tk_entity_nameService, result, query: Partial<tk_entity_name>, ctx: CrudContext) {
        // after tk_entity_name read


        return result;
    }

    override async $beforeUpdateHook(this: tk_entity_nameService, 
        updates: { query: Partial<tk_entity_name>; data: Partial<tk_entity_name> }[],
        ctx: CrudContext,
    ) {
        // before tk_entity_name update


        return updates;
    }

    override async $afterUpdateHook(this: tk_entity_nameService, 
        results: any[],
        updates: { query: Partial<tk_entity_name>; data: Partial<tk_entity_name> }[],
        ctx: CrudContext,
    ) {
        // after tk_entity_name update


        return results;
    }

    override async $beforeDeleteHook(this: tk_entity_nameService, queries: Partial<tk_entity_name>[], ctx: CrudContext) {
        // before tk_entity_name remove


        return queries;
    }

    override async $afterDeleteHook(this: tk_entity_nameService, result: any, queries: Partial<tk_entity_name>[], ctx: CrudContext) {
        // after tk_entity_name remove


        return result;
    }

    override async errorControllerHook(this: tk_entity_nameService, error: Error, ctx: CrudContext): Promise<any> {
        //after tk_entity_name error


        return Promise.resolve();
    }
};

export const hooks = new tk_entity_nameHooks();

