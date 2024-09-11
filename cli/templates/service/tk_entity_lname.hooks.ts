import { CrudContext, CrudHooks } from "@eicrud/core/crud";
import { tk_entity_name } from "./tk_entity_lname.entity";
import { tk_entity_nameService } from "./tk_entity_lname.service";
import { FindResponseDto } from "@eicrud/shared/interfaces";

export class tk_entity_nameHooks extends CrudHooks<tk_entity_name> {

    override async beforeCreateHook(this: tk_entity_nameService, data: Partial<tk_entity_name>[], ctx: CrudContext): Promise<Partial<tk_entity_name>[]> {
        // before tk_entity_name creation

        return data;
    }

    override async afterCreateHook(this: tk_entity_nameService, result: any[], data: Partial<tk_entity_name>[], ctx: CrudContext): Promise<tk_entity_name[]>  {
        // after tk_entity_name creation

        return result;
    }

    override async errorCreateHook(this: tk_entity_nameService, data: Partial<tk_entity_name>[], ctx: CrudContext, error: any): Promise<tk_entity_name[]> {
        // error tk_entity_name creation

        return null;
    }

    override async beforeReadHook(this: tk_entity_nameService, query: Partial<tk_entity_name>, ctx: CrudContext): Promise<Partial<tk_entity_name>> {
        // before tk_entity_name read

        return query;
    }

    override async afterReadHook(this: tk_entity_nameService, result, query: Partial<tk_entity_name>, ctx: CrudContext): Promise<FindResponseDto<tk_entity_name>> {
        // after tk_entity_name read

        return result;
    }

    override async errorReadHook(this: tk_entity_nameService, query: Partial<tk_entity_name>, ctx: CrudContext, error: any): Promise<FindResponseDto<tk_entity_name>> {
        // error tk_entity_name read

        return null;
    }

    override async beforeUpdateHook(this: tk_entity_nameService, 
        updates: { query: Partial<tk_entity_name>; data: Partial<tk_entity_name> }[],
        ctx: CrudContext,
    ): Promise<{ query: Partial<tk_entity_name>; data: Partial<tk_entity_name> }[]>  {
        // before tk_entity_name update

        return updates;
    }

    override async afterUpdateHook(this: tk_entity_nameService, 
        results: any[],
        updates: { query: Partial<tk_entity_name>; data: Partial<tk_entity_name> }[],
        ctx: CrudContext,
    ): Promise<any[]> {
        // after tk_entity_name update

        return results;
    }

    override async errorUpdateHook(this: tk_entity_nameService, 
        updates: { query: Partial<tk_entity_name>; data: Partial<tk_entity_name> }[],
        ctx: CrudContext,
        error: any,
    ): Promise<any[]>  {
        // error tk_entity_name update

        return null;
    }

    override async beforeDeleteHook(this: tk_entity_nameService, query: Partial<tk_entity_name>, ctx: CrudContext): Promise<Partial<tk_entity_name>> {
        // before tk_entity_name delete

        return query;
    }

    override async afterDeleteHook(this: tk_entity_nameService, result: any, query: Partial<tk_entity_name>, ctx: CrudContext): Promise<number> {
        // after tk_entity_name delete

        return result;
    }

    override async errorDeleteHook(this: tk_entity_nameService, query: Partial<tk_entity_name>, ctx: CrudContext, error: any): Promise<number> {
        // error tk_entity_name delete

        return null;
    }

    override async errorControllerHook(this: tk_entity_nameService, error: any, ctx: CrudContext): Promise<any> {
        //after tk_entity_name error

    }
};

export const hooks = new tk_entity_nameHooks();

