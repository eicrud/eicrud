import { CrudContext } from "../../auth/model/CrudContext";

export interface CrudGlobalHooks{

    beforeAllHook(ctx: CrudContext): Promise<any>,

    afterAllHook(res: any, ctx: CrudContext): Promise<any>,

    errorAllHook(error: Error, ctx: CrudContext): Promise<any>,

}