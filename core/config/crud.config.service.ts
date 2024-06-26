import { CrudRole } from './model/CrudRole';
import { CrudService } from '../crud/crud.service';
import { CrudUserService } from './crud-user.service';
import { LogService } from '../log/log.service';
import { EntityClass, EntityManager, raw } from '@mikro-orm/core';
import { CrudContext } from '../crud/model/CrudContext';
import { WatchTrafficOptions } from '../authentication/auth.guard';
import { CrudUser } from './model/CrudUser';
import { EmailService } from './crud-email.service';
import { AuthenticationOptions } from '../authentication/auth.service';
import { MikroORM } from '@mikro-orm/core';
import { LimitOptions } from '../crud/crud.controller';
import { CrudDbAdapter } from './dbAdapter/crudDbAdapter';
import { LRUCache } from 'lru-cache';
import { ValidationOptions } from '../validation';
import { _utils } from '../utils';
import { BackdoorQuery } from '../crud';

export class BasicMemoryCache implements CrudCache {
  cache: LRUCache<string, CrudUser>;

  constructor(size = 10000) {
    this.cache = new LRUCache({
      max: size,
    });
  }

  async get(key: string) {
    return this.cache.get(key);
  }

  async set(key: string, value: any, ttl: number) {
    return this.cache.set(key, value, {
      ttl: ttl,
    });
  }

  async clear() {
    return this.cache.clear();
  }
}

export interface CrudCache {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any, ttl?: number) => Promise<any>;
}

export class CacheOptions {
  TTL = 60 * 12 * 1000; // 12 minutes
  allowClientCacheFilling = false;
}

export const CRUD_CONFIG_KEY = 'CRUD_CONFIG_U4u7YojMIZ';

export interface MicroServiceConfig {
  services: EntityClass<any>[];
  openBackDoor: boolean;
  openController: boolean;
  proxyCrudController?: boolean;
  url: string;
  username?: string;
  password?: string;
  allowNonSecureUrl?: boolean;
}

export class MicroServicesOptions {
  constructor() {}

  microServices: Record<string, MicroServiceConfig> = {};
  username: string;
  password: string;

  findCurrentServiceMatches(service: CrudService<any>) {
    let matches = [];
    for (const key in this.microServices) {
      if (
        this.microServices[key].services
          .map((v) => v.name)
          .includes(service.entity.name)
      ) {
        matches.push(key);
      }
    }
    return matches;
  }

  getMicroService(key: string) {
    return this.microServices[key];
  }

  static getCurrentService() {
    return process.env.CRUD_CURRENT_MS;
  }
}

export class CrudConfigService {
  watchTrafficOptions = new WatchTrafficOptions();

  microServicesOptions = new MicroServicesOptions();

  validationOptions: ValidationOptions = new ValidationOptions();

  limitOptions = new LimitOptions();

  authenticationOptions = new AuthenticationOptions();

  defaultCacheOptions = new CacheOptions();

  servicesMap: Record<string, CrudService<any>> = {};

  id_field: string = 'id';
  guest_role: string = 'guest';
  public rolesMap: Record<string, CrudRole> = {};

  cacheManager: CrudCache;

  public userService: CrudUserService<any>;
  public logService: LogService;
  public entityManager: EntityManager;
  public captchaService: string;
  public emailService: EmailService;
  protected orm: MikroORM;

  public dbType: 'mongo' | 'other' = 'mongo';
  isIsolated: any;
  public dbAdapter: CrudDbAdapter;
  JWT_SECRET: string;
  COOKIE_SECRET: string;

  constructor(config: {
    userService: CrudUserService<any>;
    logService?: LogService;
    entityManager: EntityManager;
    captchaService?: any;
    emailService: EmailService;
    jwtSecret: string;
    csrfSecret?: string;
    cacheManager: CrudCache;
    authenticationOptions?: Partial<AuthenticationOptions>;
    watchTrafficOptions?: Partial<WatchTrafficOptions>;
    defaultCacheOptions?: Partial<CacheOptions>;
    validationOptions?: Partial<ValidationOptions>;
    limitOptions?: Partial<LimitOptions>;
    orm: MikroORM;
    id_field?: string;
    guest_role?: string;
    dbType?: string;
    isIsolated?: boolean;
    microServicesOptions?: MicroServicesOptions;
    dbAdapter: CrudDbAdapter;
  }) {
    this.isIsolated = config.isIsolated;
    this.id_field = config.id_field || this.id_field;
    this.guest_role = config.guest_role || this.guest_role;
    this.orm = config.orm;
    this.dbAdapter = config.dbAdapter;

    this.microServicesOptions = Object.assign(
      new MicroServicesOptions(),
      config.microServicesOptions || {},
    );

    this.limitOptions = {
      ...this.limitOptions,
      ...(config.limitOptions || {}),
    };
    this.authenticationOptions = {
      ...this.authenticationOptions,
      ...(config.authenticationOptions || {}),
    };
    this.watchTrafficOptions = {
      ...this.watchTrafficOptions,
      ...(config.watchTrafficOptions || {}),
    };
    this.defaultCacheOptions = {
      ...this.defaultCacheOptions,
      ...(config.defaultCacheOptions || {}),
    };
    this.validationOptions = {
      ...this.validationOptions,
      ...(config.validationOptions || {}),
    };
    this.cacheManager = config.cacheManager;

    if (!config.jwtSecret) {
      throw new Error('invalid jwtSecret');
    }
    this.JWT_SECRET = config.jwtSecret;

    this.userService = config.userService;
    this.logService = config.logService;
    this.entityManager = config.entityManager;
    this.captchaService = config.captchaService;
    this.emailService = config.emailService;
  }

  addRoles(roles: CrudRole[]) {
    roles.forEach((r) => this.addRole(r));
  }

  addRole(role: CrudRole) {
    if (this.rolesMap[role.name]) {
      throw new Error('Duplicate role name: ' + role.name);
    }
    this.rolesMap[role.name] = role;
  }

  addServices(services: CrudService<any>[]) {
    services.forEach((s) => this.addService(s));
  }

  addService(service: CrudService<any>) {
    const key = service.getName();
    if (this.servicesMap[key]) {
      throw new Error(
        'Duplicate service name: ' + service.entity.name + ' > ' + key,
      );
    }
    this.servicesMap[key] = service;
  }

  async onModuleInit() {
    await this.dbAdapter.onModuleInit(this.orm);
    this.COOKIE_SECRET = await _utils.deriveSecretKey(
      this.JWT_SECRET,
      'eicrud-cookie',
    );
  }

  async afterControllerHook(res: any, ctx: CrudContext) {
    return Promise.resolve();
  }

  async beforeControllerHook(ctx: CrudContext) {
    return Promise.resolve();
  }

  async errorControllerHook(error: any, ctx: CrudContext) {
    return Promise.resolve();
  }

  async afterBackdoorHook(
    res: any,
    ctx: CrudContext,
    query: BackdoorQuery,
    args: any[],
  ) {
    return Promise.resolve();
  }

  async beforeBackdoorHook(
    ctx: CrudContext,
    query: BackdoorQuery,
    args: any[],
  ) {
    return Promise.resolve();
  }

  async errorBackdoorHook(
    error: Error,
    ctx: CrudContext,
    query: BackdoorQuery,
    args: any[],
  ) {
    return Promise.resolve();
  }

  async onHighTrafficEvent(
    count: number,
    user: Partial<CrudUser>,
    ctx: CrudContext,
  ) {
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
    if (!newEntity.role) {
      throw new Error('Role is required when updating password');
    }
    const role = this.rolesMap[newEntity.role];
    if (role.isAdminRole) {
      return this.authenticationOptions.saltRoundsAdmin;
    }
    return this.authenticationOptions.saltRounds;
  }
}
