import { EntityManager } from "@mikro-orm/core";
import { CrudOptions } from "../../crud/model/CrudOptions";
import { CrudUser } from "../../user/entity/CrudUser";
import { CrudSecurity } from "../../crud/model/CrudSecurity";

export interface CrudContext {
    serviceName?: string, 
    user?: CrudUser, 
    method?: string, 
    security?: CrudSecurity,
    query?: any, 
    data?: any,
    origin?: "crud" | "cmd" | "webhook" | string,
    options?: CrudOptions,
    em?: EntityManager;
    noFlush?: boolean;


}