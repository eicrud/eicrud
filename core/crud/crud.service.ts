import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CrudEntity } from './model/CrudEntity';
import { CrudSecurity } from '../config/model/CrudSecurity';
import { CrudContext } from './model/CrudContext';
import { toKebabCase } from '@eicrud/shared/utils';
import { CrudUser } from '../config/model/CrudUser';
import {
  CRUD_CONFIG_KEY,
  CacheOptions,
  CrudConfigService,
  MicroServiceConfig,
  MicroServicesOptions,
  CrudCache,
} from '../config/crud.config.service';
import { ModuleRef } from '@nestjs/core';
import { CrudTransformer } from '../validation/CrudTransformer';
import { BackdoorQuery } from '../crud/model/CrudQuery';
import axios from 'axios';
import { CrudDbAdapter } from '../config/dbAdapter/crudDbAdapter';
import { FindResponseDto } from '@eicrud/shared/interfaces';
import { CrudAuthorizationService } from './crud.authorization.service';
import { RequireAtLeastOne, _utils } from '../utils';
import { CrudRole } from '../config/model/CrudRole';
import {
  GetRightDto,
  ICrudRightsFieldInfo,
  ICrudRightsInfo,
} from '../crud/model/dtos';
import { EntityClass, EntityManager, wrap } from '@mikro-orm/core';
import { CrudOptions } from '.';
import { CrudErrors } from '@eicrud/shared/CrudErrors';
import { truncate } from 'fs';

const NAMES_REGEX = /([^\s,]+)/g;
const COMMENTS_REGEX = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
function getFunctionParamsNames(fun) {
  const funStr = fun.toString().replace(COMMENTS_REGEX, '');
  let res = funStr
    .slice(funStr.indexOf('(') + 1, funStr.indexOf(')'))
    .match(NAMES_REGEX);
  if (res === null) {
    res = [];
  }
  return res;
}

function getAllMethodNames(obj) {
  let methodNames = [];

  // Loop through the prototype chain
  let currentObj = obj;
  while (currentObj) {
    const currentMethodNames = Object.getOwnPropertyNames(currentObj).filter(
      (propertyName) => typeof currentObj[propertyName] === 'function',
    );

    methodNames = methodNames.concat(currentMethodNames);

    // Move up the prototype chain
    currentObj = Object.getPrototypeOf(currentObj);
  }

  // Remove duplicates
  methodNames = [...new Set(methodNames)];

  return methodNames;
}

interface _OpOpts {
  hooks?: boolean;
  secure?: boolean;
  em?: EntityManager;
  noFlush?: boolean;
}
type ExcludedInheritanceKeys = 'hooks' | 'secure' | 'em' | 'noFlush';
export type OpOpts = RequireAtLeastOne<_OpOpts>;

export type Inheritance = {
  [key: string]: any;
} & {
  [K in ExcludedInheritanceKeys]?: never;
};

export interface CrudServiceConfig<T extends CrudEntity> {
  cacheOptions?: CacheOptions;
  entityManager?: EntityManager;
  dbAdapter?: CrudDbAdapter;
  cacheManager?: CrudCache;
  hooks?: CrudHooks<T>;
}

export class CrudService<T extends CrudEntity> {
  protected entityManager: EntityManager;
  public serviceName: string;
  protected crudConfig: CrudConfigService;
  public dbAdapter: CrudDbAdapter;
  protected crudAuthorization: CrudAuthorizationService;
  cacheManager: CrudCache;
  cacheOptions = new CacheOptions();

  _defaultOpOpts: OpOpts = {
    hooks: true,
    secure: true,
    em: null,
    noFlush: false,
  };

  constructor(
    protected moduleRef: ModuleRef,
    public entity: EntityClass<T> & (new () => T),
    public security: CrudSecurity<T>,
    protected config?: CrudServiceConfig<T>,
  ) {
    this.config = this.config || {};
    if (!this.config?.hooks) {
      this.config.hooks = new CrudHooks<T>();
    }
    this.serviceName = CrudService.getName(entity);
  }

  onModuleInit() {
    this.crudConfig = this.moduleRef.get(CRUD_CONFIG_KEY, { strict: false });
    this.crudAuthorization = this.moduleRef.get(CrudAuthorizationService, {
      strict: false,
    });
    this.entityManager =
      this.config?.entityManager || this.crudConfig.entityManager;
    this.cacheOptions = {
      ...(this.config?.cacheOptions || {}),
      ...this.crudConfig.defaultCacheOptions,
    };
    this.dbAdapter = this.config?.dbAdapter || this.crudConfig.dbAdapter;
    this.dbAdapter.setConfigService(this.crudConfig);
    this.crudConfig.addService(this);
    this.cacheManager =
      this.config?.cacheManager || this.crudConfig.cacheManager;

    this.security.cmdSecurityMap = this.security.cmdSecurityMap || ({} as any);
    this.security.cmdSecurityMap['getRights'] =
      this.security.cmdSecurityMap['getRights'] || ({} as any);
    this.security.cmdSecurityMap['getRights'].dto = GetRightDto;
  }

  onApplicationBootstrap() {
    const msConfig: MicroServicesOptions = this.crudConfig.microServicesOptions;

    if (!Object.keys(msConfig.microServices)?.length) {
      return;
    }

    const allMethodNames = getAllMethodNames(this);

    for (const methodName of allMethodNames) {
      if (methodName.startsWith('$')) {
        const names = getFunctionParamsNames(this[methodName]);

        let ctxPos: number = names.findIndex((name) => name === 'ctx');
        let inheritancePos: number = names.findIndex(
          (name) => name === 'inheritance',
        );

        if (ctxPos == -1) {
          console.warn('No ctx found in method call:' + methodName);
        }

        const currentService = MicroServicesOptions.getCurrentService();

        if (!currentService) {
          continue;
        }

        let matches = msConfig.findCurrentServiceMatches(this);

        if (matches.includes(currentService)) {
          continue;
        }

        matches = matches
          .map((m) => msConfig.microServices[m])
          .filter((m) => m.openBackDoor);
        if (matches.length > 1) {
          console.warn(
            'More than one MicroServiceConfig found for service:' +
              this.serviceName,
          );
          const closedController = matches.filter((m) => !m.openController);
          if (closedController.length > 0) {
            matches = closedController;
          }
        }

        if (matches.length <= 0) {
          throw new Error(
            'No MicroServiceConfig found for service:' + this.serviceName,
          );
        }
        const targetServiceConfig: MicroServiceConfig = matches[0];

        const orignalMethod = this[methodName].bind(this);

        const mustStartWith = [
          'https://',
          'http://localhost',
          'localhost',
          'http://127.0.0.1',
          '127.0.0.1',
        ];

        if (
          !mustStartWith.some((v) => targetServiceConfig.url.startsWith(v)) &&
          !targetServiceConfig.allowNonSecureUrl
        ) {
          throw new Error(
            'MicroServiceConfig url must be https, or allowNonSecureUrl must be set.',
          );
        }

        this[methodName] = async (...args) => {
          const res = await this.forwardToBackdoor(
            args,
            methodName,
            targetServiceConfig,
            ctxPos,
            inheritancePos,
          );
          return res;
        };
      }
    }
  }

  async forwardToBackdoor(
    args: any[],
    methodName: string,
    msConfig: MicroServiceConfig,
    ctxPos: number,
    inheritancePos: number,
  ) {
    const query: Partial<BackdoorQuery> = {
      methodName,
      ctxPos,
      inheritancePos,
    };

    for (let i = 0; i < args.length; i++) {
      if (args[i] === undefined) {
        query.undefinedArgs = query.undefinedArgs || [];
        (query.undefinedArgs as number[]).push(i);
      }
    }

    if (query.undefinedArgs) {
      query.undefinedArgs = JSON.stringify(query.undefinedArgs);
    }

    const url = msConfig.url + '/crud/backdoor/' + this.serviceName;

    const payload = {
      args: [...(args || [])] as any,
    };

    if (ctxPos != null && args[ctxPos]) {
      payload.args[ctxPos] = {
        ...args[ctxPos],
        _temp: undefined,
      } as CrudContext;
    }

    const res = await axios
      .patch(url, payload, {
        params: query,
        auth: {
          username: this.crudConfig.microServicesOptions.username,
          password: this.crudConfig.microServicesOptions.password,
        },
      })
      .catch((e) => {
        const error = e.response?.data || e;
        throw new HttpException(
          {
            statusCode: error.statusCode,
            error: error.error,
            message: error.message,
          },
          error.statusCode,
        );
      });

    const result = res.data.res;
    const partialCtx = res.data.ctx;
    if (partialCtx && ctxPos != null && args[ctxPos]) {
      for (const key in partialCtx) {
        args[ctxPos][key] = partialCtx[key];
      }
    }
    return result;
  }

  getName() {
    return CrudService.getName(this.entity);
  }

  static getName(entity) {
    return toKebabCase(entity.name);
  }

  async $create_(ctx: CrudContext, secure: boolean = true) {
    return this.$create(ctx.data, ctx, { secure });
  }

  async $create(
    newEntity: Partial<T>,
    ctx: CrudContext,
    opOptions: OpOpts = { secure: true },
    inheritance?: Inheritance,
  ) {
    const opOpts = { ...this._defaultOpOpts, ...opOptions };
    const hooks = opOpts?.hooks;
    if (hooks) {
      [newEntity] = await this.beforeCreateHook([newEntity], ctx);
    }

    this.checkObjectForIds(newEntity);

    const em = opOpts?.em || this.entityManager.fork();
    if (opOpts.secure) {
      await this.checkItemDbCount(em, ctx);
    }

    const opts = this.getReadOptions(ctx);
    newEntity.createdAt = new Date();
    newEntity.updatedAt = newEntity.createdAt;

    let entity = em.create(this.entity, {}, opts as any);
    wrap(entity).assign(newEntity as any, {
      em,
      mergeObjectProperties: true,
      onlyProperties: true,
      onlyOwnProperties: true,
    });
    entity[this.crudConfig.id_field] = this.dbAdapter.createNewId();

    await em.persist(entity);
    if (!opOpts?.noFlush) {
      await em.flush();
    }

    if (hooks) {
      [entity] = await this.afterCreateHook([entity], [newEntity], ctx);
    }
    return entity;
  }

  async $createBatch_(ctx: CrudContext, secure: boolean = true) {
    return this.$createBatch(ctx.data, ctx, { secure });
  }

  async $createBatch(
    newEntities: Partial<T>[],
    ctx: CrudContext,
    opOptions: OpOpts = { secure: true },
    inheritance?: Inheritance,
  ) {
    const opOpts = { ...this._defaultOpOpts, ...opOptions };
    if (opOpts.hooks) {
      newEntities = await this.beforeCreateHook(newEntities, ctx);
    }
    const subOpOpts = {
      hooks: false,
      noFlush: true,
      em: this.entityManager.fork(),
      secure: opOpts.secure,
    };
    let results = [];
    for (let entity of newEntities) {
      const res = await this.$create(entity, ctx, subOpOpts, inheritance);
      results.push(res);
    }
    await subOpOpts.em.flush();
    if (opOpts.hooks) {
      results = await this.afterCreateHook(results, newEntities, ctx);
    }
    return results;
  }

  async $patchBatch_(ctx: CrudContext) {
    return this.$patchBatch(ctx.data, ctx);
  }

  async $patchBatch(
    data: any[],
    ctx: CrudContext,
    opOptions: OpOpts = { secure: true },
    inheritance?: Inheritance,
  ) {
    const opOpts = { ...this._defaultOpOpts, ...opOptions };
    if (opOpts.hooks) {
      data = await this.beforeUpdateHook(data, ctx);
    }
    let results = [];
    const subOpOpts = { em: this.entityManager.fork(), hooks: false };
    let proms = [];
    for (let d of data) {
      proms.push(this.$patch(d.query, d.data, ctx, subOpOpts, inheritance));
    }
    results = await Promise.all(proms);
    if (opOpts.hooks) {
      results = await this.afterUpdateHook(results, data, ctx);
    }
    return results;
  }

  /**
   * @usageNotes Does not trigger hooks nor check for maxItemsInDb
   */
  async $unsecure_fastCreate(
    newEntity: Partial<T>,
    ctx: CrudContext,
    inheritance?: Inheritance,
  ) {
    return await this.$create(
      newEntity,
      ctx,
      {
        hooks: false,
        em: null,
        noFlush: false,
        secure: false,
      },
      inheritance,
    );
  }

  async $find_(ctx: CrudContext): Promise<FindResponseDto<T>> {
    return this.$find(ctx.query, ctx);
  }

  async $find(
    entity: Partial<T>,
    ctx: CrudContext,
    opOptions: OpOpts = { secure: true },
    inheritance?: Inheritance,
  ): Promise<FindResponseDto<T>> {
    const opOpts = { ...this._defaultOpOpts, ...opOptions };
    if (opOpts.hooks) {
      entity = await this.beforeReadHook(entity, ctx);
    }
    this.checkObjectForIds(entity);

    const em = this.entityManager.fork();
    const opts = this.getReadOptions(ctx);
    let result: FindResponseDto<T>;
    if (opts.limit) {
      const res = await em.findAndCount(this.entity, entity, opts as any);
      result = { data: res[0], total: res[1], limit: opts.limit };
    } else {
      const res = await em.find(this.entity, entity, opts as any);
      result = { data: res };
    }
    if (opOpts.hooks) {
      result = await this.afterReadHook(result, entity, ctx);
    }

    return result;
  }

  async $findIn_(ctx: CrudContext) {
    return this.$findIn(ctx.ids, ctx.query, ctx);
  }

  async $findIn(
    ids: string[],
    entity: Partial<T>,
    ctx: CrudContext,
    opOptions: OpOpts = { secure: true },
    inheritance?: Inheritance,
  ) {
    this.dbAdapter.makeInQuery(ids, entity);
    return this.$find(entity, ctx, opOptions, inheritance);
  }

  getReadOptions(ctx: CrudContext) {
    const opts = ctx?.options || {};
    return { ...opts } as any;
  }

  getCacheKey(entity: Partial<T>, opts?: CrudOptions) {
    let key =
      this.serviceName + '_one_' + entity[this.crudConfig.id_field].toString();
    if (opts?.exclude?.length) {
      key += '_e_' + opts.exclude.sort().join(',');
    }
    if (opts?.fields?.length) {
      key += '_f_' + opts.fields.sort().join(',');
    }
    if (opts?.populate?.length) {
      key += '_p_' + opts.populate.sort().join(',');
    }
    return key;
  }

  async $findOne_(ctx: CrudContext) {
    return this.$findOne(ctx.query, ctx);
  }

  async $findOne(
    entity: Partial<T>,
    ctx: CrudContext,
    opOptions: OpOpts = { secure: true },
    inheritance?: Inheritance,
  ) {
    const opOpts = { ...this._defaultOpOpts, ...opOptions };
    if (opOpts.hooks) {
      entity = await this.beforeReadHook(entity, ctx);
    }
    this.checkObjectForIds(entity);
    const em = this.entityManager.fork();
    const opts = this.getReadOptions(ctx);
    let result: T = await em.findOne(this.entity, entity, opts as any);
    if (opOpts.hooks) {
      const fDto: FindResponseDto<T> = { data: [result], total: 1, limit: 1 };
      const resHook = await this.afterReadHook(fDto, entity, ctx);
      result = resHook.data[0];
    }
    return result;
  }

  async $findOneCached_(ctx: CrudContext) {
    return this.$findOneCached(ctx.query, ctx);
  }

  async $findOneCached(
    entity: Partial<T>,
    ctx: CrudContext,
    opOptions: OpOpts = { secure: true },
    inheritance?: Inheritance,
  ) {
    const opOpts = { ...this._defaultOpOpts, ...opOptions };
    if (opOpts.hooks) {
      entity = await this.beforeReadHook(entity, ctx);
    }
    if (!entity[this.crudConfig.id_field]) {
      throw new BadRequestException('id field is required for findOneCached');
    }

    let cacheKey = this.getCacheKey(entity, ctx?.options);
    let result = await this.cacheManager.get(cacheKey);
    if (!result) {
      result = await this.$findOne(entity, ctx, { hooks: false }, inheritance);
      if (!ctx.options?.cached || this.cacheOptions.allowClientCacheFilling) {
        this.cacheManager.set(cacheKey, result, this.cacheOptions.TTL);
      }
    }
    if (opOpts.hooks) {
      result = await this.afterReadHook(result, entity, ctx);
    }
    return result;
  }

  async $setCached(
    entity: Partial<T>,
    ctx: CrudContext,
    inheritance?: Inheritance,
  ) {
    let cacheKey = this.getCacheKey(entity);
    await this.cacheManager.set(cacheKey, entity, this.cacheOptions.TTL);
    return entity;
  }

  async $deleteCached(
    entity: Partial<T>,
    ctx: CrudContext,
    inheritance?: Inheritance,
  ) {
    let cacheKey = this.getCacheKey(entity);
    await this.cacheManager.set(cacheKey, null, this.cacheOptions.TTL);
    return entity;
  }

  async $patch_(ctx: CrudContext) {
    return this.$patch(ctx.query, ctx.data, ctx);
  }

  async $patch(
    query: Partial<T>,
    data: Partial<T>,
    ctx: CrudContext,
    opOptions: OpOpts = { secure: true },
    inheritance?: Inheritance,
  ) {
    const opOpts = { ...this._defaultOpOpts, ...opOptions };
    const hooks = opOpts?.hooks;

    if (hooks) {
      [{ query, data }] = await this.beforeUpdateHook([{ query, data }], ctx);
    }

    this.checkObjectForIds(query);
    this.checkObjectForIds(data);

    const em = opOpts.em || this.entityManager.fork();
    let results = await this.doQueryPatch(query, data, ctx, em);

    if (hooks) {
      [results] = await this.afterUpdateHook([results], [{ query, data }], ctx);
    }
    return results;
  }

  /**
   * @usageNotes Does not trigger hooks nor check db model
   */
  async $unsecure_incPatch(
    args: {
      query: Partial<T>;
      increments: { [key: string]: number };
      addPatch?: any;
    },
    ctx: CrudContext,
  ) {
    this.checkObjectForIds(args.query);
    const em = this.entityManager.fork();
    let update = this.dbAdapter.getIncrementUpdate(
      args.increments,
      this.entity,
      ctx,
    );
    let addPatch = args.addPatch || {};
    addPatch.updatedAt = new Date();
    addPatch = this.dbAdapter.getSetUpdate(addPatch);
    update = { ...update, ...addPatch };
    const res = await em.nativeUpdate(this.entity, args.query, update as any);
    return res;
  }

  async $patchIn_(ctx: CrudContext) {
    return this.$patchIn(ctx.ids, ctx.query, ctx.data, ctx);
  }

  async $patchIn(
    ids: string[],
    query: Partial<T>,
    newEntity: Partial<T>,
    ctx: CrudContext,
    inheritance?: Inheritance,
  ) {
    this.dbAdapter.makeInQuery(ids, query);
    return await this.$patch(
      query,
      newEntity,
      ctx,
      { secure: true },
      inheritance,
    );
  }

  async $deleteIn_(ctx: CrudContext) {
    return this.$deleteIn(ctx.ids, ctx.query, ctx);
  }

  async $deleteIn(
    ids: any,
    query: any,
    ctx: CrudContext,
    inheritance?: Inheritance,
  ) {
    this.dbAdapter.makeInQuery(ids, query);
    return this.$delete(query, ctx);
  }

  /**
   * @usageNotes Does not trigger hooks
   */
  async $unsecure_fastPatch(
    query: Partial<T>,
    newEntity: Partial<T>,
    ctx: CrudContext,
    inheritance?: Inheritance,
  ) {
    return this.$patch(
      query,
      newEntity,
      ctx,
      {
        hooks: false,
        em: null,
      },
      inheritance,
    );
  }

  async $patchOne_(ctx: CrudContext, secure: boolean = true) {
    return this.$patchOne(ctx.query, ctx.data, ctx, { secure });
  }

  async $patchOne(
    query: Partial<T>,
    data: Partial<T>,
    ctx: CrudContext,
    opOptions: OpOpts = { secure: true },
    inheritance?: Inheritance,
  ) {
    const opOpts = { ...this._defaultOpOpts, ...opOptions };
    if (opOpts.hooks) {
      [{ data, query }] = await this.beforeUpdateHook([{ query, data }], ctx);
    }
    const em = this.entityManager.fork();
    let result = await this.doOnePatch(query, data, ctx, em, opOpts.secure);
    await em.flush();
    if (opOpts.hooks) {
      [result] = await this.afterUpdateHook([result], [{ data, query }], ctx);
    }
    return result;
  }

  /**
   * @usageNotes Does not trigger hooks nor check if the entity exists before updating
   */
  async $unsecure_fastPatchOne(
    id: string,
    newEntity: Partial<T>,
    ctx: CrudContext,
    inheritance?: Inheritance,
  ) {
    return await this.$patch(
      { [this.crudConfig.id_field]: id } as any,
      newEntity,
      ctx,
      { hooks: false, em: null },
      inheritance,
    );
  }

  private async doQueryPatch(
    query: Partial<T>,
    newEntity: Partial<T>,
    ctx: CrudContext,
    em: EntityManager,
  ) {
    const opts = this.getReadOptions(ctx);
    let ormEntity = {};
    Object.setPrototypeOf(ormEntity, this.entity.prototype);
    newEntity.updatedAt = new Date();
    wrap(ormEntity).assign(newEntity as any, {
      em: em.fork(),
      mergeObjectProperties: true,
      onlyProperties: true,
      onlyOwnProperties: true,
    });
    ormEntity = (ormEntity as any).toJSON();
    return em.nativeUpdate(this.entity, query, ormEntity, opts);
  }

  private async doOnePatch(
    query: Partial<T>,
    newEntity: Partial<T>,
    ctx: CrudContext,
    em: EntityManager,
    secure: boolean,
  ) {
    this.checkObjectForIds(query);
    this.checkObjectForIds(newEntity);

    const opts = this.getReadOptions(ctx);
    let result = query;
    if (secure) {
      const tempEm = em.fork();
      result = await tempEm.findOne(this.entity, query, opts as any);
      if (!result) {
        throw new BadRequestException('Entity not found (patch)');
      }
    }
    const id = this.dbAdapter.checkId(result[this.crudConfig.id_field]);
    newEntity.updatedAt = new Date();
    let res = em.getReference(this.entity, id);
    wrap(res).assign(newEntity as any, {
      updateByPrimaryKey: false,
      mergeObjectProperties: true,
      onlyProperties: true,
      onlyOwnProperties: true,
    });
    return res;
  }

  notGuest(user: CrudUser) {
    return user.role != this.crudConfig.guest_role;
  }

  isGuest(user: CrudUser) {
    return !this.notGuest(user);
  }

  async checkItemDbCount(em: EntityManager, ctx: CrudContext) {
    if (this.security.maxItemsInDb) {
      const count = await em.count(this.entity);
      if (count >= this.security.maxItemsInDb) {
        throw new HttpException(
          {
            statusCode: 507,
            error: 'Insufficient Storage',
            message: CrudErrors.MAX_ITEMS_IN_DB.str(),
          },
          507,
        );
      }
    }
  }

  async $delete_(ctx: CrudContext) {
    return this.$delete(ctx.query, ctx);
  }

  async $delete(
    query: Partial<T>,
    ctx: CrudContext,
    opOptions: OpOpts = { secure: true },
    inheritance?: Inheritance,
  ) {
    const opOpts = { ...this._defaultOpOpts, ...opOptions };
    if (opOpts.hooks) {
      query = await this.beforeDeleteHook(query, ctx);
    }
    this.checkObjectForIds(query);
    const em = this.entityManager.fork();
    const opts = this.getReadOptions(ctx);
    let length = await em.nativeDelete(this.entity, query, opts);
    if (opOpts.hooks) {
      length = await this.afterDeleteHook(length, query, ctx);
    }
    return length;
  }

  async $deleteOne_(ctx: CrudContext) {
    return this.$deleteOne(ctx.query, ctx);
  }

  async $deleteOne(
    query: Partial<T>,
    ctx: CrudContext,
    opOptions: OpOpts = { secure: true },
    inheritance?: Inheritance,
  ) {
    const opOpts = { ...this._defaultOpOpts, ...opOptions };
    if (opOpts.hooks) {
      query = await this.beforeDeleteHook(query, ctx);
    }
    this.checkObjectForIds(query);
    const em = this.entityManager.fork();
    let entity = await em.findOne(this.entity, query);
    if (!entity) {
      throw new BadRequestException('Entity not found (removeOne)');
    }
    em.remove(entity);

    await em.flush();
    if (opOpts.hooks) {
      let result = await this.afterDeleteHook(1, query, ctx);
      return result;
    }
    return 1;
  }

  async $cmdHandler(
    cmdName: string,
    ctx: CrudContext,
    inheritance?: Inheritance,
  ): Promise<any> {
    const cmdSecurity: any = this.security.cmdSecurityMap[cmdName];

    if (!cmdSecurity) {
      throw new BadRequestException('Command not found');
    }

    return await this['$' + cmdName](ctx.data, ctx, inheritance);
  }

  checkObjectForIds(obj: any) {
    for (let key in obj || {}) {
      obj[key] = this.dbAdapter.checkId(obj[key]);
    }
  }

  async $getRights(dto: GetRightDto, ctx: CrudContext) {
    const ret: ICrudRightsInfo = {};

    if (dto.userItemsInDb) {
      const dataMap = _utils.parseIfString(ctx.user?.crudUserCountMap || {});
      ret.userItemsInDb = dataMap?.[ctx.serviceName] || 0;
    }

    if (dto.maxBatchSize) {
      const userRole: CrudRole = this.crudAuthorization.getCtxUserRole(ctx);
      const adminBatch = userRole.isAdminRole ? 100 : 0;
      const maxBatchSize = Math.max(
        adminBatch,
        this.crudAuthorization.getMatchBatchSizeFromCrudRoleAndParents(
          ctx,
          userRole,
          this.security,
        ),
      );
      ret.maxBatchSize = maxBatchSize;
    }

    if (dto.maxItemsPerUser) {
      ret.maxItemsPerUser = await this.crudAuthorization.computeMaxItemsPerUser(
        ctx,
        this.security,
      );
    }

    if (dto.fields) {
      const cls = this.entity;
      let trust = await this.crudAuthorization.getOrComputeTrust(ctx.user, ctx);
      if (trust < 0) {
        trust = 0;
      }
      ret.fields = await this._recursiveGetRightsType(cls, {}, trust);
    }

    if (dto.userCmdCount) {
      for (const cmd in this.security.cmdSecurityMap) {
        const cmdSecurity = this.security.cmdSecurityMap[cmd];
        const cmdMap = _utils.parseIfString(ctx.user?.cmdUserCountMap || {});
        ret.userCmdCount[cmd] = {
          max: await this.crudAuthorization.computeMaxUsesPerUser(
            ctx,
            cmdSecurity,
          ),
          performed: cmdMap?.[ctx.serviceName + '_' + cmd] || 0,
        };
      }
    }

    return ret;
  }

  private async _recursiveGetRightsType(
    cls: any,
    ret: Record<string, ICrudRightsFieldInfo>,
    trust: number,
  ) {
    const classKey = CrudTransformer.subGetClassKey(cls);
    const metadata = CrudTransformer.getCrudMetadataMap()[classKey];
    if (!metadata) return ret;

    for (const key in metadata) {
      const field_metadata = metadata[key];
      const subRet: ICrudRightsFieldInfo = {};
      const subType = field_metadata?.type;
      if (subType) {
        if (Array.isArray(subType)) {
          subRet.maxLength =
            field_metadata?.maxLength ||
            this.crudConfig.validationOptions.defaultMaxArLength;
          if (field_metadata?.addMaxLengthPerTrustPoint) {
            subRet.maxLength +=
              trust * field_metadata.addMaxLengthPerTrustPoint;
          }
        }
        const subCls = subType.class;
        subRet.type = await this._recursiveGetRightsType(subCls, {}, trust);
      } else {
        subRet.maxSize =
          field_metadata?.maxSize ||
          this.crudConfig.validationOptions.defaultMaxSize;
        if (field_metadata?.addMaxSizePerTrustPoint) {
          subRet.maxSize += trust * field_metadata.addMaxSizePerTrustPoint;
        }
      }
      ret[key] = subRet;
    }

    return ret;
  }

  async beforeCreateHook(data: Partial<T>[], ctx: CrudContext) {
    return this.config.hooks.beforeCreateHook.call(this, data, ctx);
  }

  async afterCreateHook(result: any[], data: Partial<T>[], ctx: CrudContext) {
    return this.config.hooks.afterCreateHook.call(this, result, data, ctx);
  }

  async beforeReadHook(query: Partial<T>, ctx: CrudContext) {
    return this.config.hooks.beforeReadHook.call(this, query, ctx);
  }

  async afterReadHook(result, query: Partial<T>, ctx: CrudContext) {
    return this.config.hooks.afterReadHook.call(this, result, query, ctx);
  }

  async beforeUpdateHook(
    updates: { query: Partial<T>; data: Partial<T> }[],
    ctx: CrudContext,
  ) {
    return this.config.hooks.beforeUpdateHook.call(this, updates, ctx);
  }

  async afterUpdateHook(
    results: any[],
    updates: { query: Partial<T>; data: Partial<T> }[],
    ctx: CrudContext,
  ) {
    return this.config.hooks.afterUpdateHook.call(this, results, updates, ctx);
  }

  async beforeDeleteHook(query: Partial<T>, ctx: CrudContext) {
    return this.config.hooks.beforeDeleteHook.call(this, query, ctx);
  }

  async afterDeleteHook(result: any, query: Partial<T>, ctx: CrudContext) {
    return this.config.hooks.afterDeleteHook.call(this, result, query, ctx);
  }

  async errorControllerHook(error: any, ctx: CrudContext): Promise<any> {
    return this.config.hooks.errorControllerHook.call(this, error, ctx);
  }
}

export class CrudHooks<T extends CrudEntity> {
  async beforeCreateHook(
    this: CrudService<T>,
    data: Partial<T>[],
    ctx: CrudContext,
  ): Promise<Partial<T>[]> {
    return data;
  }

  async afterCreateHook(
    this: CrudService<T>,
    result: any[],
    data: Partial<T>[],
    ctx: CrudContext,
  ): Promise<T[]> {
    return result;
  }

  async beforeReadHook(
    this: CrudService<T>,
    query: Partial<T>,
    ctx: CrudContext,
  ): Promise<Partial<T>> {
    return query;
  }

  async afterReadHook(
    this: CrudService<T>,
    result: FindResponseDto<T>,
    query: Partial<T>,
    ctx: CrudContext,
  ): Promise<FindResponseDto<T>> {
    return result;
  }

  async beforeUpdateHook(
    this: CrudService<T>,
    updates: { query: Partial<T>; data: Partial<T> }[],
    ctx: CrudContext,
  ): Promise<{ query: Partial<T>; data: Partial<T> }[]> {
    return updates;
  }

  async afterUpdateHook(
    this: CrudService<T>,
    results: any[],
    updates: { query: Partial<T>; data: Partial<T> }[],
    ctx: CrudContext,
  ): Promise<any[]> {
    return results;
  }

  async beforeDeleteHook(
    this: CrudService<T>,
    query: Partial<T>,
    ctx: CrudContext,
  ): Promise<Partial<T>> {
    return query;
  }

  async afterDeleteHook(
    this: CrudService<T>,
    result: number,
    query: Partial<T>,
    ctx: CrudContext,
  ): Promise<number> {
    return result;
  }

  async errorControllerHook(
    this: CrudService<T>,
    error: any,
    ctx: CrudContext,
  ): Promise<any> {
    return Promise.resolve();
  }
}
