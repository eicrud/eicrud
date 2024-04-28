import { EntityManager } from "@mikro-orm/core";
import { CrudOptions } from "./CrudOptions";
import { CrudUser } from "../../user/model/CrudUser";
import { CrudSecurity } from "./CrudSecurity";

export interface CrudContext {
    serviceName?: string, 
    user?: CrudUser, 
    userId?: string,
    method?: string, 
    security?: CrudSecurity,
    query?: any, 
    data?: any,
    origin?: "crud" | "cmd" | "webhook" | string,
    options?: CrudOptions,
    em?: EntityManager;
    noFlush?: boolean;
    cmdName?: string;
    cmd?: CrudCmd;


}