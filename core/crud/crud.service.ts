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
import { _utils } from '../utils';
import { CrudRole } from '../config/model/CrudRole';
import {
  GetRightDto,
  ICrudRightsFieldInfo,
  ICrudRightsInfo,
} from '../crud/model/dtos';
import { EntityClass, EntityManager, wrap } from '@mikro-orm/core';
import { CrudOptions } from '.';
import { CrudErrors } from '@eicrud/shared/CrudErrors';

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

export class CrudService<T extends CrudEntity> {
  protected entityManager: EntityManager;
  public serviceName: string;
  protected crudConfig: CrudConfigService;
  public dbAdapter: CrudDbAdapter;
  protected crudAuthorization: CrudAuthorizationService;
  cacheManager: CrudCache;
  cacheOptions = new CacheOptions();

  constructor(
    protected moduleRef: ModuleRef,
    public entity: EntityClass<T>,
    public security: CrudSecurity,
    private config?: {
      cacheOptions?: CacheOptions;
      entityManager?: EntityManager;
      dbAdapter?: CrudDbAdapter;
      cacheManager?: CrudCache;
    },
  ) {
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

        if (
          !targetServiceConfig.url.includes('https') &&
          !targetServiceConfig.allowNonSecureUrl
        ) {
          throw new Error(
            'MicroServiceConfig url must be https, or allowNonSecureUrl must be set.',
          );
        }

        this[methodName] = async (...args) => {
          return this.forwardToBackdoor(
            args,
            methodName,
            targetServiceConfig,
            ctxPos,
            inheritancePos,
          );
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
      args,
    };

    if (ctxPos != null && args[ctxPos]) {
      args[ctxPos] = {
        ...args[ctxPos],
        em: undefined,
        noFlush: undefined,
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

    return res.data;
  }

  getName() {
    return CrudService.getName(this.entity);
  }

  static getName(entity) {
    return toKebabCase(entity.name);
  }

  async $create(
    newEntity: Partial<T>,
    ctx: CrudContext,
    secure: boolean = true,
    inheritance: any = {},
  ) {
    this.checkObjectForIds(newEntity);

    const em = ctx?.em || this.entityManager.fork();
    if (secure) {
      await this.checkItemDbCount(em, ctx);
    }

    const opts = this.getReadOptions(ctx);
    newEntity.createdAt = new Date();
    newEntity.updatedAt = newEntity.createdAt;

    const entity = em.create(this.entity, {}, opts as any);
    wrap(entity).assign(newEntity as any, {
      em,
      mergeObjectProperties: true,
      onlyProperties: true,
      onlyOwnProperties: true,
    });
    entity[this.crudConfig.id_field] = this.dbAdapter.createNewId();

    await em.persist(entity);
    if (!ctx?.noFlush) {
      await em.flush();
    }
    ctx = ctx || {};
    ctx.em = em;
    return entity;
  }

  async $createBatch(
    newEntities: Partial<T>[],
    ctx: CrudContext,
    secure: boolean = true,
    inheritance: any = {},
  ) {
    ctx.noFlush = true;
    const results = [];
    for (let entity of newEntities) {
      const res = await this.$create(entity, ctx, secure, inheritance);
      results.push(res);
    }
    await ctx.em.flush();
    ctx.noFlush = false;

    return results;
  }

  async $patchBatch(
    data: any[],
    ctx: CrudContext,
    secure: boolean = true,
    inheritance: any = {},
  ) {
    ctx.noFlush = true;
    const results = [];
    for (let d of data) {
      const res = await this.$patch(d.query, d.data, ctx, secure, inheritance);
      results.push(res);
    }
    await ctx.em.flush();
    ctx.noFlush = false;
    return results;
  }

  async $unsecure_fastCreate(
    newEntity: Partial<T>,
    ctx: CrudContext,
    inheritance: any = {},
  ) {
    return await this.$create(newEntity, ctx, false, inheritance);
  }

  async $find(
    entity: Partial<T>,
    ctx: CrudContext,
    inheritance: any = {},
  ): Promise<FindResponseDto<T>> {
    this.checkObjectForIds(entity);

    const em = ctx?.em || this.entityManager.fork();
    const opts = this.getReadOptions(ctx);
    let result: FindResponseDto<T>;
    if (opts.limit) {
      const res = await em.findAndCount(this.entity, entity, opts as any);
      result = { data: res[0], total: res[1], limit: opts.limit };
    } else {
      const res = await em.find(this.entity, entity, opts as any);
      result = { data: res };
    }

    return result;
  }

  async $findIn(
    ids: string[],
    entity: Partial<T>,
    ctx: CrudContext,
    inheritance: any = {},
  ) {
    this.dbAdapter.makeInQuery(ids, entity);
    return this.$find(entity, ctx, inheritance);
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

  async $findOne(entity: Partial<T>, ctx: CrudContext, inheritance: any = {}) {
    this.checkObjectForIds(entity);
    const em = ctx?.em || this.entityManager.fork();
    const opts = this.getReadOptions(ctx);
    const result = await em.findOne(this.entity, entity, opts as any);
    return result;
  }

  async $findOneCached(
    entity: Partial<T>,
    ctx: CrudContext,
    inheritance: any = {},
  ) {
    if (!entity[this.crudConfig.id_field]) {
      throw new BadRequestException('id field is required for findOneCached');
    }

    let cacheKey = this.getCacheKey(entity, ctx?.options);
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }
    const result = await this.$findOne(entity, ctx, inheritance);
    if (!ctx.options?.cached || this.cacheOptions.allowClientCacheFilling) {
      this.cacheManager.set(cacheKey, result, this.cacheOptions.TTL);
    }
    return result;
  }

  async $setCached(
    entity: Partial<T>,
    ctx: CrudContext,
    inheritance: any = {},
  ) {
    let cacheKey = this.getCacheKey(entity);
    await this.cacheManager.set(cacheKey, entity, this.cacheOptions.TTL);
    return entity;
  }

  async $patch(
    query: Partial<T>,
    newEntity: Partial<T>,
    ctx: CrudContext,
    secure: boolean = true,
    inheritance: any = {},
  ) {
    this.checkObjectForIds(query);
    this.checkObjectForIds(newEntity);

    const em = ctx?.em || this.entityManager.fork();
    const results = await this.doQueryPatch(query, newEntity, ctx, em, secure);
    // if (!ctx?.noFlush) {
    //     await em.flush();
    // }
    ctx = ctx || {};
    ctx.em = em;
    return results;
  }

  async $unsecure_incPatch(
    args: {
      query: Partial<T>;
      increments: { [key: string]: number };
      addPatch?: any;
    },
    ctx: CrudContext,
    inheritance: any = {},
  ) {
    try {
      this.checkObjectForIds(args.query);
      const em = ctx?.em || this.entityManager.fork();
      let update = this.dbAdapter.getIncrementUpdate(
        args.increments,
        this.entity,
        ctx,
      );
      if (args.addPatch) {
        const addPatch = this.dbAdapter.getSetUpdate(args.addPatch);
        update = { ...update, ...addPatch };
      }
      const res = await em.nativeUpdate(this.entity, args.query, update as any);
      ctx.em = em;
      return res;
    } catch (e) {
      throw e;
    }
  }

  async $patchIn(
    ids: string[],
    query: Partial<T>,
    newEntity: Partial<T>,
    ctx: CrudContext,
    secure: boolean = true,
    inheritance: any = {},
  ) {
    this.dbAdapter.makeInQuery(ids, query);
    return await this.$patch(query, newEntity, ctx, secure, inheritance);
  }

  async $removeIn(ids: any, query: any, ctx: CrudContext) {
    this.dbAdapter.makeInQuery(ids, query);
    return await this.$remove(query, ctx);
  }

  async $unsecure_fastPatch(
    query: Partial<T>,
    newEntity: Partial<T>,
    ctx: CrudContext,
    inheritance: any = {},
  ) {
    return await this.$patch(query, newEntity, ctx, false, inheritance);
  }

  async $patchOne(
    query: Partial<T>,
    newEntity: Partial<T>,
    ctx: CrudContext,
    secure: boolean = true,
    inheritance: any = {},
  ) {
    const em = ctx?.em || this.entityManager.fork();
    const result = await this.doOnePatch(query, newEntity, ctx, em, secure);
    if (!ctx?.noFlush) {
      await em.flush();
    }
    ctx = ctx || {};
    ctx.em = em;
    return result;
  }

  async $unsecure_fastPatchOne(
    id: string,
    newEntity: Partial<T>,
    ctx: CrudContext,
    inheritance: any = {},
  ) {
    return await this.$patch(
      { [this.crudConfig.id_field]: id } as any,
      newEntity,
      ctx,
      false,
      inheritance,
    );
  }

  private async doQueryPatch(
    query: Partial<T>,
    newEntity: Partial<T>,
    ctx: CrudContext,
    em: EntityManager,
    secure: boolean,
  ) {
    const opts = this.getReadOptions(ctx);
    let ormEntity = {};
    Object.setPrototypeOf(ormEntity, this.entity.prototype);
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

  async $remove(query: Partial<T>, ctx: CrudContext, inheritance: any = {}) {
    this.checkObjectForIds(query);
    const em = ctx?.em || this.entityManager.fork();
    const opts = this.getReadOptions(ctx);
    const length = em.nativeDelete(this.entity, query, opts);
    if (!ctx?.noFlush) {
      await em.flush();
    }
    ctx = ctx || {};
    ctx.em = em;
    return length;
  }

  async $removeOne(query: Partial<T>, ctx: CrudContext, inheritance: any = {}) {
    this.checkObjectForIds(query);
    const em = ctx?.em || this.entityManager.fork();
    let entity = await em.findOne(this.entity, query);
    if (!entity) {
      throw new BadRequestException('Entity not found (removeOne)');
    }
    let result = em.remove(entity);
    if (!ctx?.noFlush) {
      await em.flush();
    }
    ctx = ctx || {};
    ctx.em = em;
    return 1;
  }

  async $cmdHandler(
    cmdName: string,
    ctx: CrudContext,
    inheritance: any = {},
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
            this.crudConfig.validationOptions.defaultMaxLength;
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
}
