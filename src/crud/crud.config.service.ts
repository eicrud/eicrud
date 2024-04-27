import { Injectable } from "@nestjs/common";
import { CrudRole } from "../auth/model/CrudRole";
import { CrudService } from "./crud.service";
import { CrudUserService } from "../user/crud-user.service";
import { LogService } from "../log/log.service";
import { EntityManager } from "@mikro-orm/core";
import { CrudContext } from "../auth/model/CrudContext";
import { CrudAuthorizationService } from "./crud.authorization.service";
import { TrafficWatchOptions } from "../auth/auth.guard";
import { CrudUser } from "../user/entity/CrudUser";


export interface SecurityCacheManager {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any, ttl: number) => Promise<any>;
}


export class CrudConfigService {

    watchTrafficOptions: TrafficWatchOptions = 
    {
        MAX_USERS: 10000, REQUEST_THRESHOLD: 350,
        TIMEOUT_THRESHOLD_TOTAL: 10,
        TIMEOUT_DURATION_MIN: 15
    };

    services: CrudService<any>[] = [];
    id_field: string = '_id';
    guest_role: string = "guest" 
    roles: CrudRole[] = [];


    cacheManager: SecurityCacheManager;

    public userService: CrudUserService;
    public logService: LogService;
    public entityManager: EntityManager;
    public captchaService: any;

    constructor(config: {userService: CrudUserService, 
        logService?: LogService,
        entityManager: EntityManager,
        captchaService?: any }
        ) {
            this.userService = config.userService;
            this.logService = config.logService;
            this.entityManager = config.entityManager;
            this.captchaService = config.captchaService;

            this.services.push(...[
                this.userService,
                this.logService
            ])

            //unique services 
            this.services = this.services.filter((v, i, a) => a.indexOf(v) === i);

    }


    async afterAllHook(res: any, ctx: CrudContext) {
        return Promise.resolve();
    }
    
    async beforeAllHook(ctx: CrudContext){
        return Promise.resolve();
    }

    async errorAllHook(error: Error, ctx: CrudContext){
        return Promise.resolve();
    }

    async onHighTrafficEvent(count: number, user: Partial<CrudUser>){
        return Promise.resolve();
    }







}