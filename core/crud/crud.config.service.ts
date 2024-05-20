import { Injectable } from "@nestjs/common";
import { CrudRole } from "./model/CrudRole";
import { CrudService } from "./crud.service";
import { CrudUserService } from "../user/crud-user.service";
import { LogService } from "../log/log.service";
import { EntityClass, EntityManager, raw } from "@mikro-orm/core";
import { CrudContext } from "./model/CrudContext";
import { CrudAuthorizationService } from "./crud.authorization.service";
import { CrudAuthGuard, TrafficWatchOptions, ValidationOptions } from "../authentification/auth.guard";
import { CrudUser } from "../user/model/CrudUser";
import { EmailService } from "../email/email.service";
import { AuthenticationOptions } from "../authentification/auth.service";
import { MikroORM } from "@mikro-orm/core";
import { LimitOptions } from "./crud.controller";
import { CrudDbAdapter } from "./dbAdapter/crudDbAdapter";


export interface SecurityCacheManager {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any, ttl: number) => Promise<any>;
}

export interface CacheOptions {
    TTL: number;
}

export const CRUD_CONFIG_KEY = 'CRUD_CONFIG_U4u7YojMIZ';


export interface MicroServiceConfig {
    services: EntityClass<any>[],
    openBackDoor: boolean,
    openController: boolean,
    url: string,
    username?: string,
    password?: string,
    allowNonSecureUrl: boolean;
}

export class MicroServicesOptions {

    constructor() {

    }

    microServices: Record<string, MicroServiceConfig> = {};
    username: string;
    password: string;
    fake_delay_ms: number = 40;

    findCurrentServiceMatches(service: CrudService<any>){
        let matches = [];
        for(const key of Object.keys(this.microServices)){
            if(this.microServices[key].services.includes(service.entity)){
               matches.push(key);
            }
        }
        return matches;
    }


    static getCurrentService() {
        return process.env.CRUD_CURRENT_MS;
    }
}

export class CrudConfigService {
    
    watchTrafficOptions = new TrafficWatchOptions();
  
    microServicesOptions = new MicroServicesOptions();
    
    validationOptions: ValidationOptions = new ValidationOptions();

    limitOptions = new LimitOptions();

    authenticationOptions = new AuthenticationOptions();

    defaultCacheOptions: CacheOptions = {
        TTL: 60 * 12 * 1000, // 12 minutes
    }

    servicesMap: Record<string, CrudService<any>> = {};

    id_field: string = 'id';
    guest_role: string = "guest" 
    public rolesMap: Record<string, CrudRole> = {};

    cacheManager: SecurityCacheManager;

    public userService: CrudUserService<any>;
    public logService: LogService;
    public entityManager: EntityManager;
    public captchaService: any;
    public emailService: EmailService;
    protected orm: MikroORM;

    public dbType: 'mongo' | 'other' = 'mongo';
    isIsolated: any;
    public dbAdapter: CrudDbAdapter;

    constructor(config: {userService: CrudUserService<any>, 
        logService?: LogService,
        entityManager: EntityManager,
        captchaService?: any,
        emailService: EmailService,
        jwtSecret: string,
        cacheManager: SecurityCacheManager,
        authenticationOptions?: Partial<AuthenticationOptions>,
        watchTrafficOptions?: Partial<TrafficWatchOptions>,
        defaultCacheOptions?: Partial<CacheOptions>,
        validationOptions?: Partial<ValidationOptions>,
        limitOptions?: Partial<LimitOptions>,
        orm: MikroORM,
        id_field?: string,
        guest_role?: string,
        dbType?: string,
        isIsolated?: boolean,
        microServicesOptions?: MicroServicesOptions,
        dbAdapter: CrudDbAdapter
    }
        ) {
            this.isIsolated = config.isIsolated;
            this.id_field = config.id_field || this.id_field;
            this.guest_role = config.guest_role || this.guest_role;
            this.orm = config.orm;
            this.dbAdapter = config.dbAdapter;

            this.microServicesOptions = Object.assign(
                new MicroServicesOptions(),
                config.microServicesOptions||{}
            );
            
            this.limitOptions = { ...this.limitOptions, ...(config.limitOptions||{})};
            this.authenticationOptions = { ...this.authenticationOptions, ...(config.authenticationOptions||{})};
            this.watchTrafficOptions = { ...this.watchTrafficOptions, ...(config.watchTrafficOptions||{})};
            this.defaultCacheOptions = { ...this.defaultCacheOptions, ...(config.defaultCacheOptions||{})};
            this.validationOptions = { ...this.validationOptions, ...(config.validationOptions||{})};
            this.cacheManager = config.cacheManager;
            this.authenticationOptions.JWT_SECRET = config.jwtSecret;

            this.userService = config.userService;
            this.logService = config.logService;
            this.entityManager = config.entityManager;
            this.captchaService = config.captchaService;
            this.emailService = config.emailService;

    }

    addRoles(roles: CrudRole[]){
        roles.forEach(r => this.addRole(r));
    }

    addRole(role: CrudRole){
        if(this.rolesMap[role.name]){
            throw new Error("Duplicate role name: " + role.name);
        }
        this.rolesMap[role.name] = role;
    }

    addServices(services: CrudService<any>[]){
        services.forEach(s => this.addService(s));
    }

    addService(service: CrudService<any>){
        const key = service.getName();
        if(this.servicesMap[key]){
            throw new Error("Duplicate service name: " + service.entity.name + ' > ' + key);
        }
        this.servicesMap[key] = service;    
    }

    async onModuleInit() {
        await this.orm.schema.ensureIndexes();
    }

    async afterCrudHook(res: any, ctx: CrudContext) {
        return Promise.resolve();
    }
    
    async beforeCrudHook(ctx: CrudContext){
        return Promise.resolve();
    }

    async errorCrudHook(error: Error, ctx: CrudContext){
        return Promise.resolve();
    }

    async afterBackdoorHook(res: any, ctx: CrudContext) {
        return Promise.resolve();
    }
    
    async beforeBackdoorHook(ctx: CrudContext){
        return Promise.resolve();
    }

    async errorBackdoorHook(error: Error, ctx: CrudContext){
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

    getSaltRounds(newEntity: CrudUser): number {
        const role = this.rolesMap[newEntity.role];
        if(role.isAdminRole){
          return this.authenticationOptions.SALT_ROUNDS_ADMIN;
        }
          return this.authenticationOptions.SALT_ROUNDS;
      }


    callBackDoor(service, method, args: any[], ctxPos, inheritancePos ){

    }

}