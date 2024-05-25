import { EntityManager } from "@mikro-orm/core";
import { CrudOptions } from "../../../shared/CrudOptions";
import { CrudUser } from "../../user/model/CrudUser";
import { CrudSecurity } from "./CrudSecurity";
import { CrudConfigService } from "../crud.config.service";
import { CrudService } from "../crud.service";

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
    /**
     * Temp object that will not be serialized to backdoors, set to {} for every request
     * @UsageNotes You can use it to cache data during authorization process (useful for batch operations)
     * @type {object}
     */
    _temp?: object;
    getCurrentService?: () => CrudService<any>;
    getRequest?: () => any;
}