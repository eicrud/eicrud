import { EntityManager } from "@mikro-orm/core";
import { CrudOptions } from "../../../shared/CrudOptions";
import { CrudUser } from "../../user/model/CrudUser";
import { CrudSecurity } from "./CrudSecurity";
import { CrudConfigService } from "../crud.config.service";

export interface CrudContext {
    isBatch?: boolean;
    serviceName?: string, 
    user?: CrudUser, 
    userId?: string,
    userTrust?: number,
    method?: string, 
    query?: any, 
    data?: any,
    origin?: "crud" | "cmd" | "webhook" | string,
    options?: CrudOptions,
    em?: EntityManager;
    noFlush?: boolean;
    cmdName?: string;
    ids?: string[];
    ip?: string;
    jwtPayload?: any;
    url?: string;
    currentMs?: string;
    backdoorGuarded?: boolean;
    getRequest?: () => any;
}