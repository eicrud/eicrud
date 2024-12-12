import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CrudEntity } from './model/CrudEntity';
import { CrudSecurity } from '../config/model/CrudSecurity';
import { CrudContext, CrudOptionsType } from './model/CrudContext';
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
import { MsLinkQuery } from '../crud/model/CrudQuery';
import axios from 'axios';
import { CrudDbAdapter } from '../config/dbAdapter/crudDbAdapter';
import {
  DeleteResponseDto,
  FindResponseDto,
  PatchResponseDto,
} from '@eicrud/shared/interfaces';
import { CrudAuthorizationService } from './crud.authorization.service';
import { RequireAtLeastOne, _utils } from '../utils';
import { CrudRole } from '../config/model/CrudRole';
import {
  GetRightDto,
  ICrudRightsFieldInfo,
  ICrudRightsInfo,
} from '../crud/model/dtos';
import { EntityClass, EntityManager, MikroORM, wrap } from '@mikro-orm/core';
import { CrudOptions } from '.';
import { CrudErrors } from '@eicrud/shared/CrudErrors';
import { truncate } from 'fs';
import isNetworkError from 'is-network-error';

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

interface _OpParams<T = any> {
  options?: CrudOptionsType<T>;
  secure?: boolean;
  em?: EntityManager;
  noFlush?: boolean;
}
type ExcludedInheritanceKeys = 'hooks' | 'secure' | 'em' | 'noFlush';
export type OpParams = RequireAtLeastOne<_OpParams>;

export type Inheritance = {
  [key: string]: any;
} & {
  [K in ExcludedInheritanceKeys]?: never;
};

export interface CrudServiceConfig<T extends CrudEntity = any> {
  cacheOptions?: CacheOptions;
  orm?: MikroORM;
  dbAdapter?: CrudDbAdapter;
  cacheManager?: CrudCache;
  hooks?: CrudHooks<T>;
}

export class CrudService<T extends CrudEntity> {
  protected entityManager: EntityManager;
  protected orm: MikroORM;
  public serviceName: string;
  protected crudConfig: CrudConfigService;
  public dbAdapter: CrudDbAdapter;
  protected crudAuthorization: CrudAuthorizationService;
  cacheManager: CrudCache;
  cacheOptions = new CacheOptions();

  _defaultOpParams: OpParams = {
    options: {},
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
    this.entityManager = this.config?.orm?.em || this.crudConfig.entityManager;
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

  isServiceInCurrentMs() {
    return this.getExternalMsMatches().length == 0;
  }

  private getExternalMsMatches(msConf?) {
    const msConfig: MicroServicesOptions =
      msConf || this.crudConfig.microServicesOptions;

    if (!Object.keys(msConfig.microServices)?.length) {
      return [];
    }

    const currentService = MicroServicesOptions.getCurrentService();

    if (!currentService) {
      return [];
    }

    if (MicroServicesOptions.getCurrentService() == 'email') {
      console.log('email service');
    }

    let matches = msConfig.findCurrentServiceMatches(this);

    if (matches.includes(currentService)) {
      return [];
    }

    return matches;
  }

  onApplicationBootstrap() {
    const msConfig: MicroServicesOptions = this.crudConfig.microServicesOptions;
    const gMatches = this.getExternalMsMatches(msConfig);
    if (!gMatches.length) {
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

        let matches = [...gMatches];

        const mapped = matches.map((m) => msConfig.microServices[m]);
        matches = mapped.filter((m) => m.openMsLink);

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
          const res = await this.forwardToMsLink(
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

  private async forwardToMsLink(
    args: any[],
    methodName: string,
    msConfig: MicroServiceConfig,
    ctxPos: number,
    inheritancePos: number,
  ) {
    const query: Partial<MsLinkQuery> = {
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

    const url = msConfig.url + '/crud/ms-link/' + this.serviceName;

    const payload = {
      args: [...(args || [])] as any,
    };

    if (ctxPos != null && args[ctxPos]) {
      payload.args[ctxPos] = {
        ...args[ctxPos],
        _temp: undefined,
      } as CrudContext;
    }

    const retries: number = 2;
    let attempt: number = 0;
    const delayStartValue: number = 100;
    while (attempt < retries) {
      try {
        const res = await axios.patch(url, payload, {
          params: query,
          auth: {
            username: this.crudConfig.microServicesOptions.username,
            password: this.crudConfig.microServicesOptions.password,
          },
        });

        const result = res.data.res;
        const partialCtx = res.data.ctx;
        if (partialCtx && ctxPos != null && args[ctxPos]) {
          for (const key in partialCtx) {
            args[ctxPos][key] = partialCtx[key];
          }
        }
        return result;
      } catch (e) {
        ++attempt;
        const error = e.response?.data || e;

        if (!isNetworkError(e) || attempt > retries) {
          throw new HttpException(
            {
              statusCode: error.statusCode,
              error: error.error,
              message: error.message,
            },
            error.statusCode,
          );
        }
        const delay = delayStartValue * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  getName() {
    return CrudService.getName(this.entity);
  }

  static getName(entity) {
    return toKebabCase(entity.name);
  }

  async $create_(ctx: CrudContext, secure: boolean = true) {
    return this.$create(ctx.data, ctx, { secure, options: ctx.queryOptions });
  }

  async $create(
    newEntity: Partial<T>,
    ctx: CrudContext,
    opOptions: OpParams = { secure: true },
    inheritance?: Inheritance,
  ) {
    const opParams = this.getOpParams(opOptions, ctx);
    const hooks = !opParams.options?.skipServiceHooks;
    try {
      if (hooks) {
        [newEntity] = await this.beforeCreateHook([newEntity], ctx);
      }
      this.checkObjectForIds(newEntity);

      const em = opParams?.em || this.entityManager.fork();
      if (opParams.secure) {
        await this.checkItemDbCount(em, ctx);
      }

      const opts = this.getReadOptions(ctx, opParams);
      newEntity.createdAt = new Date();
      newEntity.updatedAt = newEntity.createdAt;

      let entity = em.create(this.entity, {}, opts as any);
      wrap(entity).assign(newEntity as any, {
        em,
        mergeObjectProperties: true,
        onlyProperties: true,
        onlyOwnProperties: true,
      });

      if (!newEntity[this.crudConfig.id_field]) {
        entity[this.crudConfig.id_field] = this.dbAdapter.createNewId();
      }

      await em.persist(entity);
      if (!opParams?.noFlush) {
        await em.flush();
      }

      if (hooks) {
        [entity] = await this.afterCreateHook([entity], [newEntity], ctx);
      }
      return entity;
    } catch (e) {
      if (hooks) {
        const res = await this.errorCreateHook([newEntity], ctx, e);
        if (res) {
          return res;
        }
      }
      throw e;
    }
  }

  async $createBatch_(ctx: CrudContext, secure: boolean = true) {
    return this.$createBatch(ctx.data, ctx, {
      secure,
      options: ctx.queryOptions,
    });
  }

  async $createBatch(
    newEntities: Partial<T>[],
    ctx: CrudContext,
    opOptions: OpParams = { secure: true },
    inheritance?: Inheritance,
  ) {
    const opParams = this.getOpParams(opOptions, ctx);
    try {
      if (!opParams.options?.skipServiceHooks) {
        newEntities = await this.beforeCreateHook(newEntities, ctx);
      }

      const subOpParams: OpParams = {
        ...opOptions,
        noFlush: true,
        em: this.entityManager.fork(),
        secure: opParams.secure,
        options: {
          ...opParams.options,
          skipServiceHooks: true,
        },
      };
      let results = [];
      for (let entity of newEntities) {
        const res = await this.$create(entity, ctx, subOpParams, inheritance);
        results.push(res);
      }
      await subOpParams.em.flush();
      if (!opParams.options?.skipServiceHooks) {
        results = await this.afterCreateHook(results, newEntities, ctx);
      }
      return results;
    } catch (e) {
      if (!opParams.options?.skipServiceHooks) {
        const res = await this.errorCreateHook(newEntities, ctx, e);
        if (res) {
          return res;
        }
      }
      throw e;
    }
  }

  async $patchBatch_(ctx: CrudContext) {
    return this.$patchBatch(ctx.data, ctx, { options: ctx.queryOptions });
  }

  async $patchBatch(
    data: { query: Partial<T>; data: Partial<T> }[],
    ctx: CrudContext,
    opOptions: OpParams = { secure: true },
    inheritance?: Inheritance,
  ): Promise<PatchResponseDto<T>[]> {
    const opParams = this.getOpParams(opOptions, ctx);
    try {
      if (!opParams.options?.skipServiceHooks) {
        data = await this.beforeUpdateHook(data, ctx);
      }

      let results = [];
      const subOpParams: OpParams = {
        ...opOptions,
        noFlush: true,
        em: this.entityManager.fork(),
        secure: opParams.secure,
        options: {
          ...opParams.options,
          skipServiceHooks: true,
        },
      };

      let proms = [];
      for (let d of data) {
        proms.push(this.$patch(d.query, d.data, ctx, subOpParams, inheritance));
      }
      results = await Promise.all(proms);
      if (!opParams.options?.skipServiceHooks) {
        results = await this.afterUpdateHook(results, data, ctx);
      }
      return results;
    } catch (e) {
      if (!opParams.options?.skipServiceHooks) {
        const res = await this.errorUpdateHook(data, ctx, e);
        if (res) {
          return res;
        }
      }
      throw e;
    }
  }

  /**
   * Move items' IDs to queries and call $batchPatch
   * @usageNotes unsecure because it will not apply limiting fields
   */
  async $unsecure_saveBatch(
    toSave: Partial<T>[],
    ctx: CrudContext,
    opOptions: OpParams = { secure: true },
    inheritance?: Inheritance,
  ) {
    let data = toSave.map((d) => {
      const id = d[this.crudConfig.id_field];
      if (!id) {
        throw new BadRequestException(
          CrudErrors.ID_FIELD_IS_REQUIRED_FOR_SAVE.str(),
        );
      }
      const query = { [this.crudConfig.id_field]: id } as Partial<T>;
      const data = { ...d };
      delete data[this.crudConfig.id_field];
      return {
        query,
        data,
      };
    });
    return this.$patchBatch(data, ctx, opOptions, inheritance);
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
        em: null,
        noFlush: false,
        secure: false,
        options: { skipServiceHooks: true },
      },
      inheritance,
    );
  }

  async $find_(ctx: CrudContext): Promise<FindResponseDto<T>> {
    return this.$find(ctx.query, ctx, {
      options: ctx.queryOptions,
    });
  }

  async $find(
    entity: Partial<T>,
    ctx: CrudContext,
    opOptions: OpParams = { secure: true },
    inheritance?: Inheritance,
  ): Promise<FindResponseDto<T>> {
    const opParams = this.getOpParams(opOptions, ctx);
    try {
      if (!opParams.options?.skipServiceHooks) {
        entity = await this.beforeReadHook(entity, ctx);
      }

      if (Array.isArray(entity[this.crudConfig.id_field])) {
        this.makeInQuery(entity[this.crudConfig.id_field], entity);
      }

      this.checkObjectForIds(entity);

      const em = opParams.em || this.entityManager.fork();
      const opts = this.getReadOptions(ctx, opParams);
      let result: FindResponseDto<T>;
      if (opts.limit) {
        const res = await em.findAndCount(this.entity, entity, opts as any);
        result = { data: res[0], total: res[1], limit: opts.limit };
      } else {
        const res = await em.find(this.entity, entity, opts as any);
        result = { data: res };
      }
      if (!opParams.options?.skipServiceHooks) {
        result = await this.afterReadHook(result, entity, ctx);
      }
      return result;
    } catch (e) {
      if (!opParams.options?.skipServiceHooks) {
        const res = await this.errorReadHook(entity, ctx, e);
        if (res) {
          return res;
        }
      }
      throw e;
    }
  }

  async $findIds(
    entity: Partial<T>,
    ctx: CrudContext,
    opOptions: OpParams = { secure: true },
    inheritance?: Inheritance,
  ): Promise<string[]> {
    const newOpts = {
      ...opOptions,
      options: {
        ...(opOptions.options || {}),
        fields: [this.crudConfig.id_field],
      },
    };
    const res = await this.$find(entity, ctx, newOpts);
    return res.data.map((d) => d[this.crudConfig.id_field]);
  }

  async $findIn_(ctx: CrudContext) {
    return this.$findIn(ctx.ids, ctx.query, ctx, {
      options: ctx.queryOptions,
    });
  }

  async $findIn(
    ids: string[],
    entity: Partial<T>,
    ctx: CrudContext,
    opOptions: OpParams = { secure: true },
    inheritance?: Inheritance,
  ) {
    this.makeInQuery(ids, entity);
    return this.$find(entity, ctx, opOptions, inheritance);
  }

  getReadOptions(ctx: CrudContext, opOptions: OpParams): CrudOptions {
    const opts = { ...(opOptions?.options || {}) };
    return opts;
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
    return this.$findOne(ctx.query, ctx, { options: ctx.queryOptions });
  }

  async $findOne(
    entity: Partial<T>,
    ctx: CrudContext,
    opOptions: OpParams = { secure: true },
    inheritance?: Inheritance,
  ): Promise<T> {
    const opParams = this.getOpParams(opOptions, ctx);
    try {
      if (!opParams.options?.skipServiceHooks) {
        entity = await this.beforeReadHook(entity, ctx);
      }

      this.checkObjectForIds(entity);
      const em = opParams.em || this.entityManager.fork();
      const opts = this.getReadOptions(ctx, opParams);
      let result: T = await em.findOne(this.entity, entity, opts as any);
      if (!opParams.options?.skipServiceHooks) {
        const fDto: FindResponseDto<T> = { data: [result], total: 1, limit: 1 };
        const resHook = await this.afterReadHook(fDto, entity, ctx);
        result = resHook.data[0];
      }
      return result;
    } catch (e) {
      if (!opParams.options?.skipServiceHooks) {
        const res = await this.errorReadHook(entity, ctx, e);
        if (res) {
          return res?.data?.[0] || (res as unknown as T);
        }
      }
      throw e;
    }
  }

  async $findOneCached_(ctx: CrudContext) {
    return this.$findOneCached(ctx.query, ctx, { options: ctx.queryOptions });
  }

  async $findOneCached(
    entity: Partial<T>,
    ctx: CrudContext,
    opOptions: OpParams = { secure: true },
    inheritance?: Inheritance,
  ) {
    const opParams = this.getOpParams(opOptions, ctx);
    try {
      if (!opParams.options?.skipServiceHooks) {
        entity = await this.beforeReadHook(entity, ctx);
      }
      if (!entity[this.crudConfig.id_field]) {
        throw new BadRequestException('id field is required for findOneCached');
      }

      let cacheKey = this.getCacheKey(entity, opOptions?.options);
      let result = await this.cacheManager.get(cacheKey);
      if (!result) {
        result = await this.$findOne(
          entity,
          ctx,
          { options: { ...opParams.options, skipServiceHooks: true } },
          inheritance,
        );
        if (
          !opOptions.options?.cached ||
          this.cacheOptions.allowClientCacheFilling
        ) {
          this.cacheManager.set(cacheKey, result, this.cacheOptions.TTL);
        }
      }
      if (!opParams.options?.skipServiceHooks) {
        result = await this.afterReadHook(result, entity, ctx);
      }
      return result;
    } catch (e) {
      if (!opParams.options?.skipServiceHooks) {
        const res = await this.errorReadHook(entity, ctx, e);
        if (res) {
          return res;
        }
      }
      throw e;
    }
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
    return this.$patch(ctx.query, ctx.data, ctx, {
      options: ctx.queryOptions,
    });
  }

  async $patch(
    query: Partial<T>,
    data: Partial<T>,
    ctx: CrudContext,
    opOptions: OpParams = { secure: true },
    inheritance?: Inheritance,
  ): Promise<PatchResponseDto<T>> {
    const opParams = this.getOpParams(opOptions, ctx);
    const hooks = !opParams.options?.skipServiceHooks;
    try {
      if (hooks) {
        [{ query, data }] = await this.beforeUpdateHook([{ query, data }], ctx);
      }

      let finalQuery = { ...query };

      if (Array.isArray(query[this.crudConfig.id_field])) {
        this.makeInQuery(query[this.crudConfig.id_field], finalQuery);
      }

      let results: PatchResponseDto<T> = { count: 0 };

      this.checkObjectForIds(finalQuery);
      this.checkObjectForIds(data);
      const em = opParams.em || this.entityManager.fork();
      let patchResult = await this.doQueryPatch(
        finalQuery,
        data,
        ctx,
        em,
        opParams,
      );
      results.count = patchResult;

      if (hooks) {
        [results] = await this.afterUpdateHook(
          [results],
          [{ query, data }],
          ctx,
        );
      }
      return results;
    } catch (e) {
      if (hooks) {
        const res = await this.errorUpdateHook([{ query, data }], ctx, e);
        if (res) {
          return res;
        }
      }
      throw e;
    }
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
    try {
      const res = await em.nativeUpdate(this.entity, args.query, update as any);
      return res;
    } catch (e) {
      throw e;
    }
  }

  async $patchIn_(ctx: CrudContext) {
    return this.$patchIn(ctx.ids, ctx.query, ctx.data, ctx, {
      options: ctx.queryOptions,
    });
  }

  async $patchIn(
    ids: string[],
    query: Partial<T>,
    newEntity: Partial<T>,
    ctx: CrudContext,
    inheritance?: Inheritance,
  ) {
    this.makeInQuery(ids, query);
    return await this.$patch(
      query,
      newEntity,
      ctx,
      { secure: true },
      inheritance,
    );
  }

  async $deleteIn_(ctx: CrudContext) {
    return this.$deleteIn(ctx.ids, ctx.query, ctx, {
      options: ctx.queryOptions,
    });
  }

  async $deleteIn(
    ids: any,
    query: any,
    ctx: CrudContext,
    inheritance?: Inheritance,
  ) {
    this.makeInQuery(ids, query);
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
        em: null,
        options: {
          skipServiceHooks: true,
        },
      },
      inheritance,
    );
  }

  async $patchOne_(ctx: CrudContext, secure: boolean = true) {
    return this.$patchOne(ctx.query, ctx.data, ctx, {
      secure,
      options: ctx.queryOptions,
    });
  }

  protected getOpParams(opOptions: OpParams, ctx: CrudContext) {
    const res = { ...this._defaultOpParams, ...(opOptions || {}) };
    return res;
  }

  async $patchOne(
    query: Partial<T>,
    data: Partial<T>,
    ctx: CrudContext,
    opOptions: OpParams = { secure: true },
    inheritance?: Inheritance,
  ): Promise<PatchResponseDto<T>> {
    const opParams = this.getOpParams(opOptions, ctx);
    try {
      if (!opParams.options?.skipServiceHooks) {
        [{ data, query }] = await this.beforeUpdateHook([{ query, data }], ctx);
      }

      const em = opParams.em || this.entityManager.fork();
      let ret: PatchResponseDto<T> = { count: 1 };
      let patchResult = await this.doOnePatch(
        query,
        data,
        ctx,
        em,
        opParams.secure,
      );
      await em.flush();

      if (opOptions?.options?.returnUpdatedEntity) {
        let resFind = await this.$findOne(
          {
            [this.crudConfig.id_field]: patchResult[this.crudConfig.id_field],
          } as any,
          ctx,
          {
            options: {
              ...(opOptions?.options || {}),
              limit: undefined,
              offset: undefined,
              skipServiceHooks: true,
            },
          },
        );

        ret.updated = resFind;
      }

      if (!opParams.options?.skipServiceHooks) {
        [ret] = await this.afterUpdateHook([ret], [{ data, query }], ctx);
      }
      return ret;
    } catch (e) {
      if (!opParams.options?.skipServiceHooks) {
        const res = await this.errorUpdateHook([{ query, data }], ctx, e);
        if (res) {
          return res;
        }
      }
      throw e;
    }
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
      { options: { skipServiceHooks: true } },
      inheritance,
    );
  }

  private async doQueryPatch(
    query: Partial<T>,
    newEntity: Partial<T>,
    ctx: CrudContext,
    em: EntityManager,
    opParams: OpParams,
  ) {
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
    return em.nativeUpdate(this.entity, query, ormEntity);
  }

  private async doOnePatch(
    query: Partial<T>,
    newEntity: Partial<T>,
    ctx: CrudContext,
    em: EntityManager,
    secure: boolean,
  ): Promise<Partial<T>> {
    this.checkObjectForIds(query);
    this.checkObjectForIds(newEntity);
    let result = query;
    if (secure || !query[this.crudConfig.id_field]) {
      const tempEm = em.fork();
      result = await tempEm.findOne(this.entity, query);
      if (!result) {
        throw new BadRequestException(CrudErrors.ENTITY_NOT_FOUND.str());
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

  private async checkItemDbCount(em: EntityManager, ctx: CrudContext) {
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
    return this.$delete(ctx.query, ctx, { options: ctx.queryOptions });
  }

  async $delete(
    query: Partial<T>,
    ctx: CrudContext,
    opOptions: OpParams = { secure: true },
    inheritance?: Inheritance,
  ): Promise<DeleteResponseDto<T>> {
    const opParams = this.getOpParams(opOptions, ctx);
    let result: DeleteResponseDto<T> = { count: 0 };

    try {
      if (!opParams.options?.skipServiceHooks) {
        query = await this.beforeDeleteHook(query, ctx);
      }
      let finalQuery = { ...query };

      if (Array.isArray(query[this.crudConfig.id_field])) {
        this.makeInQuery(query[this.crudConfig.id_field], finalQuery);
      }

      const em = opParams.em || this.entityManager.fork();
      const opts = this.getReadOptions(ctx, opParams);

      this.checkObjectForIds(finalQuery);
      let length = await em.nativeDelete(this.entity, finalQuery, opts as any);
      result.count = length;

      if (!opParams.options?.skipServiceHooks) {
        result = await this.afterDeleteHook(result, query, ctx);
      }

      return result;
    } catch (e) {
      if (!opParams.options?.skipServiceHooks) {
        const res = await this.errorDeleteHook(query, ctx, e);
        if (res) {
          return res;
        }
      }
      throw e;
    }
  }

  private makeInQuery(IDs: string[], finalQuery) {
    this.dbAdapter.makeInQuery(IDs, finalQuery);
  }

  async $deleteOne_(ctx: CrudContext) {
    return this.$deleteOne(ctx.query, ctx, {
      options: ctx.queryOptions,
    });
  }

  async $deleteOne(
    query: Partial<T>,
    ctx: CrudContext,
    opOptions: OpParams = { secure: true },
    inheritance?: Inheritance,
  ): Promise<DeleteResponseDto<T>> {
    const opParams = this.getOpParams(opOptions, ctx);
    try {
      if (!opParams.options?.skipServiceHooks) {
        query = await this.beforeDeleteHook(query, ctx);
      }

      this.checkObjectForIds(query);
      const em = opParams.em || this.entityManager.fork();
      let entity: T = await this.$findOne(query, ctx, {
        options: {
          ...(opParams?.options || {}),
          limit: undefined,
          offset: undefined,
          skipServiceHooks: true,
        },
      });
      if (!entity) {
        throw new BadRequestException(CrudErrors.ENTITY_NOT_FOUND.str());
      }
      em.remove(entity);
      let result: DeleteResponseDto<T> = { count: 1 };
      if (opParams?.options?.returnUpdatedEntity) {
        result.deleted = entity;
      }
      await em.flush();
      if (!opParams.options?.skipServiceHooks) {
        result = await this.afterDeleteHook(result, query, ctx);
      }
      return result;
    } catch (e) {
      if (!opParams.options?.skipServiceHooks) {
        const res = await this.errorDeleteHook(query, ctx, e);
        if (res) {
          return res;
        }
      }
      throw e;
    }
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

  async afterCreateHook(result: T[], data: Partial<T>[], ctx: CrudContext) {
    return this.config.hooks.afterCreateHook.call(this, result, data, ctx);
  }

  async errorCreateHook(data: Partial<T>[], ctx: CrudContext, error: any) {
    return this.config.hooks.errorCreateHook.call(this, data, ctx, error);
  }

  async beforeReadHook(query: Partial<T>, ctx: CrudContext) {
    return this.config.hooks.beforeReadHook.call(this, query, ctx);
  }

  async afterReadHook(result, query: Partial<T>, ctx: CrudContext) {
    return this.config.hooks.afterReadHook.call(this, result, query, ctx);
  }

  async errorReadHook(query: Partial<T>, ctx: CrudContext, error: any) {
    return this.config.hooks.errorReadHook.call(this, query, ctx, error);
  }

  async beforeUpdateHook(
    updates: { query: Partial<T>; data: Partial<T> }[],
    ctx: CrudContext,
  ) {
    return this.config.hooks.beforeUpdateHook.call(this, updates, ctx);
  }

  async afterUpdateHook(
    results: PatchResponseDto[],
    updates: { query: Partial<T>; data: Partial<T> }[],
    ctx: CrudContext,
  ) {
    return this.config.hooks.afterUpdateHook.call(this, results, updates, ctx);
  }

  async errorUpdateHook(
    updates: { query: Partial<T>; data: Partial<T> }[],
    ctx: CrudContext,
    error: any,
  ) {
    return this.config.hooks.errorUpdateHook.call(this, updates, ctx, error);
  }

  async beforeDeleteHook(query: Partial<T>, ctx: CrudContext) {
    return this.config.hooks.beforeDeleteHook.call(this, query, ctx);
  }

  async afterDeleteHook(
    result: DeleteResponseDto<T>,
    query: Partial<T>,
    ctx: CrudContext,
  ) {
    return this.config.hooks.afterDeleteHook.call(this, result, query, ctx);
  }

  async errorDeleteHook(query: Partial<T>, ctx: CrudContext, error: any) {
    return this.config.hooks.errorDeleteHook.call(this, query, ctx, error);
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
    result: T[],
    data: Partial<T>[],
    ctx: CrudContext,
  ): Promise<T[]> {
    return result;
  }

  async errorCreateHook(
    this: CrudService<T>,
    data: Partial<T>[],
    ctx: CrudContext,
    error: any,
  ): Promise<any> {
    return null;
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

  async errorReadHook(
    this: CrudService<T>,
    query: Partial<T>,
    ctx: CrudContext,
    error: any,
  ): Promise<any> {
    return null;
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
    results: PatchResponseDto<T>[],
    updates: { query: Partial<T>; data: Partial<T> }[],
    ctx: CrudContext,
  ): Promise<PatchResponseDto<T>[]> {
    return results;
  }

  async errorUpdateHook(
    this: CrudService<T>,
    updates: { query: Partial<T>; data: Partial<T> }[],
    ctx: CrudContext,
    error: any,
  ): Promise<any> {
    return null;
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
    result: DeleteResponseDto<T>,
    query: Partial<T>,
    ctx: CrudContext,
  ): Promise<DeleteResponseDto<T>> {
    return result;
  }

  async errorDeleteHook(
    this: CrudService<T>,
    query: Partial<T>,
    ctx: CrudContext,
    error: any,
  ): Promise<any> {}

  async errorControllerHook(
    this: CrudService<T>,
    error: any,
    ctx: CrudContext,
  ): Promise<any> {
    return Promise.resolve();
  }
}

export class CmdHooks<TDto, TReturnDto> {
  async beforeControllerHook(dto: TDto, ctx: CrudContext): Promise<TDto> {
    return dto;
  }

  async afterControllerHook(
    dto: TDto,
    result: TReturnDto,
    ctx: CrudContext,
  ): Promise<TReturnDto> {
    return result;
  }

  async errorControllerHook(
    dto: TDto,
    error: any,
    ctx: CrudContext,
  ): Promise<any> {
    return Promise.resolve();
  }
}
