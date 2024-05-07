import { Injectable } from "@nestjs/common";
import { CrudRole } from "./model/CrudRole";
import { CrudService } from "./crud.service";
import { CrudUserService } from "../user/crud-user.service";
import { LogService } from "../log/log.service";
import { EntityManager } from "@mikro-orm/core";
import { CrudContext } from "./model/CrudContext";
import { CrudAuthorizationService } from "./crud.authorization.service";
import { TrafficWatchOptions } from "../authentification/auth.guard";
import { CrudUser } from "../user/model/CrudUser";
import { EmailService } from "../email/email.service";
import { AuthenticationOptions } from "../authentification/auth.service";


export interface SecurityCacheManager {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any, ttl: number) => Promise<any>;
}

export interface CacheOptions {
    TTL: number;

}

export const CRUD_CONFIG_KEY = 'CRUD_CONFIG_U4u7YojMIZ';

export class CrudConfigService {

    watchTrafficOptions: TrafficWatchOptions = {
        MAX_USERS: 10000, 
        REQUEST_THRESHOLD: 350,
        TIMEOUT_THRESHOLD_TOTAL: 10,
        TIMEOUT_DURATION_MIN: 15
    };

    authenticationOptions: AuthenticationOptions = {
        VERIFICATION_EMAIL_TIMEOUT_HOURS: 6,
        TWOFA_EMAIL_TIMEOUT_MIN: 15,
        PASSWORD_RESET_EMAIL_TIMEOUT_HOURS: 6,
        PASSWORD_MAX_LENGTH: 64,
        JWT_SECRET: 'aeFzLsZAKL4153s9zsq2samXnv',
        JWT_FIELD_IN_PAYLOAD: ['_id', 'revokedCount'],
        USERNAME_FIELD:  'email',
    }

    defaultCacheOptions: CacheOptions = {
        TTL: 60 * 12 * 1000, // 12 minutes
    }


    services: CrudService<any>[] = [];
    id_field: string = '_id';
    guest_role: string = "guest" 
    public rolesMap: Record<string, CrudRole> = {};

    cacheManager: SecurityCacheManager;

    public userService: CrudUserService<any>;
    public logService: LogService;
    public entityManager: EntityManager;
    public captchaService: any;
    public emailService: EmailService;


    constructor(config: {userService: CrudUserService<any>, 
        logService?: LogService,
        entityManager: EntityManager,
        captchaService?: any,
        emailService: EmailService,
        jwtSecret: string,
        cacheManager: SecurityCacheManager,
        roles?: CrudRole[],
        authenticationOptions?: AuthenticationOptions,
        watchTrafficOptions?: TrafficWatchOptions,
        defaultCacheOptions?: CacheOptions
    }
        ) {
            this.watchTrafficOptions = config.watchTrafficOptions || this.watchTrafficOptions;
            this.authenticationOptions = config.authenticationOptions || this.authenticationOptions;
            this.defaultCacheOptions = config.defaultCacheOptions || this.defaultCacheOptions;
            this.cacheManager = config.cacheManager;
            this.authenticationOptions.JWT_SECRET = config.jwtSecret;

            this.userService = config.userService;
            this.logService = config.logService;
            this.entityManager = config.entityManager;
            this.captchaService = config.captchaService;
            this.emailService = config.emailService;

            this.services.push(...[
                this.userService,
                this.logService
            ])

            //unique defined services 
            this.services = this.services.filter((v, i, a) => (v && a.indexOf(v) === i));

            this.rolesMap = config.roles?.reduce((acc, role) => {
                acc[role.name] = role;
                return acc;
            }, {} as Record<string, CrudRole>) || {};

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

    getParentRolesRecurs(role: CrudRole): CrudRole[] {
        const parentRoles: CrudRole[] = [];
        if (role.inherits?.length) {
            for (const parent of role.inherits) {
                const parentRole = this.rolesMap[parent];
                parentRoles.push(parentRole);
                parentRoles.push(...this.getParentRolesRecurs(parentRole));
            }
        }
        return parentRoles;
    }






}