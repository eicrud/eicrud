import { BadRequestException, HttpException, Inject, Injectable, forwardRef } from '@nestjs/common';
import { CrudEntity } from './model/CrudEntity';
import { BaseEntity, EntityClass, EntityManager, EntityName, wrap } from '@mikro-orm/core';
import { CrudSecurity } from './model/CrudSecurity';
import { Cache } from 'cache-manager';
import { CrudContext } from './model/CrudContext';

import { CrudUser } from '../user/model/CrudUser';
import { CrudUserService } from '../user/crud-user.service';
import { CRUD_CONFIG_KEY, CacheOptions, CrudConfigService, MicroServiceConfig, MicroServicesOptions } from './crud.config.service';
import { ModuleRef } from '@nestjs/core';
import { ObjectId } from '@mikro-orm/mongodb';
import { CrudTransformer } from './transform/CrudTransformer';
import { BackdoorQuery } from '../../shared/CrudQuery';
import axios from 'axios';
import { CrudDbAdapter } from './dbAdapter/crudDbAdapter';
import { FindResponseDto } from '../../shared/FindResponseDto';
import { CrudAuthorizationService } from './crud.authorization.service';
import { _utils } from '../utils';
import { CrudRole } from './model/CrudRole';
import { GetRightDto, ICrudRightsFieldInfo, ICrudRightsInfo } from '../../shared/dtos';
import { IsBoolean, IsOptional } from 'class-validator';

const NAMES_REGEX = /([^\s,]+)/g;
const COMMENTS_REGEX = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
function getFunctionParamsNames(fun) {
    const funStr = fun.toString().replace(COMMENTS_REGEX, '');
    let res = funStr.slice(funStr.indexOf('(') + 1, funStr.indexOf(')')).match(NAMES_REGEX);
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
        const currentMethodNames = Object.getOwnPropertyNames(currentObj)
            .filter(propertyName => typeof currentObj[propertyName] === 'function');

        methodNames = methodNames.concat(currentMethodNames);

        // Move up the prototype chain
        currentObj = Object.getPrototypeOf(currentObj);
    }

    // Remove duplicates
    methodNames = [...new Set(methodNames)];

    return methodNames;
}

export class CrudService<T extends CrudEntity> {

    CACHE_TTL = 60 * 10 * 1000; // 10 minutes
    protected entityManager: EntityManager;
    public serviceName: string;
    protected crudConfig: CrudConfigService;
    public dbAdapter: CrudDbAdapter;
    protected crudAuthorization: CrudAuthorizationService;

    constructor(
        protected moduleRef: ModuleRef,
        public entity: EntityClass<T>,
        public security: CrudSecurity,
        private config?: {
            cacheOptions?: CacheOptions,
            entityManager?: EntityManager,
            dbAdapter?: CrudDbAdapter,
        }
    ) {
        this.serviceName = CrudService.getName(entity);
    }

    onModuleInit() {
        this.crudConfig = this.moduleRef.get(CRUD_CONFIG_KEY, { strict: false });
        this.crudAuthorization = this.moduleRef.get(CrudAuthorizationService, { strict: false });
        this.entityManager = this.config?.entityManager || this.crudConfig.entityManager;
        this.CACHE_TTL = this.config?.cacheOptions?.TTL || this.crudConfig.defaultCacheOptions.TTL;
        this.dbAdapter = this.config?.dbAdapter || this.crudConfig.dbAdapter;
        this.dbAdapter.setConfigService(this.crudConfig);
        this.crudConfig.addService(this);

        this.security.cmdSecurityMap = this.security.cmdSecurityMap || {} as any;
        this.security.cmdSecurityMap['getRights'] = this.security.cmdSecurityMap['getRights'] || {} as any;
        this.security.cmdSecurityMap['getRights'].dto = GetRightDto;
    }




    onApplicationBootstrap() {
        const msConfig: MicroServicesOptions = this.crudConfig.microServicesOptions;

        if(!Object.keys(msConfig.microServices)?.length){
            return;
        }

        const allMethodNames = getAllMethodNames(this);

        for(const methodName of allMethodNames) {

            if (methodName.startsWith('$')) {
                const names = getFunctionParamsNames(this[methodName]);

                let ctxPos: number = names.findIndex(name => name === 'ctx');
                let inheritancePos: number = names.findIndex(name => name === 'inheritance');;
                
                if(ctxPos == -1){
                    console.warn('No ctx found in method call:' + methodName);
                }

                const currentService = MicroServicesOptions.getCurrentService();

                if(!currentService){
                    continue;
                }

                let matches = msConfig.findCurrentServiceMatches(this);

                if(matches.includes(currentService)){
                    continue;
                }

                matches = matches.map((m) => msConfig.microServices[m]).filter(m => m.openBackDoor);
                if(matches.length > 1){
                    console.warn('More than one MicroServiceConfig found for service:' + this.serviceName);
                    const closedController = matches.filter(m => !m.openController);
                    if(closedController.length > 0){
                        matches = closedController;
                    }
                }

                if(matches.length <= 0){
                    throw new Error('No MicroServiceConfig found for service:' + this.serviceName);
                }
                const targetServiceConfig: MicroServiceConfig = matches[0];

                const orignalMethod = this[methodName].bind(this);

                if(!targetServiceConfig.url.includes('https') && !targetServiceConfig.allowNonSecureUrl){
                    throw new Error('MicroServiceConfig url must be https, or allowNonSecureUrl must be set.' );
                }

                this[methodName] = async (...args) => {
                    return this.forwardToBackdoor(args, methodName, targetServiceConfig, ctxPos, inheritancePos);
                };
            }
        }
    }

    async forwardToBackdoor(args: any[], methodName: string, msConfig: MicroServiceConfig, ctxPos: number, inheritancePos: number) {
        
        
        const query: BackdoorQuery = {
            service: this.serviceName,
            methodName,
            ctxPos,
            inheritancePos,
        };

        for(let i = 0; i < args.length; i++){
            if(args[i] === undefined){
                query.undefinedArgs = query.undefinedArgs || [];
                (query.undefinedArgs as number[]).push(i);
            }
        }

        if(query.undefinedArgs) {
            query.undefinedArgs = JSON.stringify(query.undefinedArgs);
        }

        const url = msConfig.url + '/crud/backdoor';

        const payload = {
            args,
        }

        if(ctxPos != null && args[ctxPos]){
            args[ctxPos] = {
                ...args[ctxPos],
                em: undefined,
                noFlush: undefined,

            } as CrudContext;

        }
        
        const res = await axios.patch(url, payload, {
            params: query,
            auth: {
                username: this.crudConfig.microServicesOptions.username,
                password: this.crudConfig.microServicesOptions.password
            }
          })
        .catch((e) => {
            const error = e.response?.data || e;
            throw new HttpException({
                statusCode: error.statusCode,
                error: error.error,
                message: error.message,
            }, error.statusCode);
        });

        return res.data;
    }

    getName() {
        return CrudService.getName(this.entity);
    }

    static getName(entity) {
        return entity.name.replace(/[A-Z]+(?![a-z])|[A-Z]/g, (match, p1) => (p1 ? "-" : "") + match.toLowerCase());
    }

    async $create(newEntity: Partial<T>, ctx: CrudContext, secure: boolean = true, inheritance: any = {}) {
        this.checkObjectForIds(newEntity);

        const em = ctx?.em || this.entityManager.fork();
        if (secure) {

            await this.checkItemDbCount(em, ctx);
        }

        const opts = this.getReadOptions(ctx);
        newEntity.createdAt = new Date();
        newEntity.updatedAt = newEntity.createdAt;

        const entity = em.create(this.entity, {}, opts as any);
        wrap(entity).assign(newEntity as any, { em, mergeObjectProperties: true, onlyProperties: true, onlyOwnProperties: true });
        entity[this.crudConfig.id_field] = this.dbAdapter.createNewId();

        await em.persist(entity);
        if (!ctx?.noFlush) {
            await em.flush();
        }
        ctx = ctx || {};
        ctx.em = em;
        return entity;
    }

    async $createBatch(newEntities: Partial<T>[], ctx: CrudContext, secure: boolean = true, inheritance: any = {}) {
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

    async $patchBatch(data: any[], ctx: CrudContext, secure: boolean = true, inheritance: any = {}) {
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

    async $unsecure_fastCreate(newEntity: Partial<T>, ctx: CrudContext, inheritance: any = {}) {
        return await this.$create(newEntity, ctx, false, inheritance);
    }

    async $find(entity: Partial<T>, ctx: CrudContext, inheritance: any = {}): Promise<FindResponseDto<T>> {
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

    async $findIn(ids: string[], entity: Partial<T>, ctx: CrudContext, inheritance: any = {}) {
        this.dbAdapter.makeInQuery(ids, entity);
        return this.$find(entity, ctx, inheritance);
    }

    getReadOptions(ctx: CrudContext) {
        const opts = ctx?.options || {};
        return {...opts} as any;
    }

    getCacheKey(entity: Partial<T>) {
        return this.entity?.toString() + entity[this.crudConfig.id_field].toString();
    }

    async $findOne(entity: Partial<T>, ctx: CrudContext, inheritance: any = {}) {
        this.checkObjectForIds(entity);
        const em = ctx?.em || this.entityManager.fork();
        const opts = this.getReadOptions(ctx);
        const result = await em.findOne(this.entity, entity, opts as any);
        return result;
    }

    async $findOneCached(entity: Partial<T>, ctx: CrudContext, inheritance: any = {}) {
        if (!entity[this.crudConfig.id_field]) {
            throw new BadRequestException('No id field found in entity');
        }
        this.checkObjectForIds(entity);

        let cacheKey = this.getCacheKey(entity);
        const cached = await this.crudConfig.cacheManager.get(cacheKey);
        if (cached) {
            return cached;
        }
        const result = await this.$findOne(entity, ctx, inheritance);
        this.crudConfig.cacheManager.set(cacheKey, result, this.CACHE_TTL);
        return result;
    }

    async $setCached(entity: Partial<T>, ctx: CrudContext, inheritance: any = {}) {
        let cacheKey = this.getCacheKey(entity);
        this.crudConfig.cacheManager.set(cacheKey, entity, this.CACHE_TTL);
        return entity;
    }

    async $patch(query: Partial<T>, newEntity: Partial<T>, ctx: CrudContext, secure: boolean = true, inheritance: any = {}) {
        this.checkObjectForIds(query);
        this.checkObjectForIds(newEntity);

        const em = ctx?.em || this.entityManager.fork();
        const results = await this.doQueryPatch(query, newEntity, ctx, em, secure);
        if (!ctx?.noFlush) {
            await em.flush();
        }
        ctx = ctx || {};
        ctx.em = em;
        return results;
    }


    async $unsecure_incPatch(args: { query: Partial<T>, increments: { [key: string]: number }, addPatch?: any }, ctx: CrudContext, inheritance: any = {}) {
        this.checkObjectForIds(args.query);
        const em = ctx?.em || this.entityManager.fork();
        const update = await this.dbAdapter.getIncrementUpdate(args.increments, this.entity, ctx);
        await em.nativeUpdate(this.entity, args.query, update as any);
        ctx.em = em;
        let res;
        if (args.addPatch) {
            this.checkObjectForIds(args.addPatch)
            res = await this.$unsecure_fastPatch(args.query, args.addPatch, ctx, inheritance);
        } else if (!ctx.noFlush) {
            res = await em.flush();
        }
        return res;
    }

    async $patchIn(ids: string[], query: Partial<T>, newEntity: Partial<T>, ctx: CrudContext, secure: boolean = true, inheritance: any = {}) {
        this.dbAdapter.makeInQuery(ids, query);
        return await this.$patch(query, newEntity, ctx, secure, inheritance);
    }

    async $removeIn(ids: any, query: any, ctx: CrudContext) {
        this.dbAdapter.makeInQuery(ids, query);
        return await this.$remove(query, ctx);
    }

    async $unsecure_fastPatch(query: Partial<T>, newEntity: Partial<T>, ctx: CrudContext, inheritance: any = {}) {
        return await this.$patch(query, newEntity, ctx, false, inheritance);
    }

    async $patchOne(query: Partial<T>, newEntity: Partial<T>, ctx: CrudContext, secure: boolean = true, inheritance: any = {}) {
        const em = ctx?.em || this.entityManager.fork();
        const result = await this.doOnePatch(query, newEntity, ctx, em, secure);
        if (!ctx?.noFlush) {
            await em.flush();
        }
        ctx = ctx || {};
        ctx.em = em;
        return result;
    }

    async $unsecure_fastPatchOne(id: string, newEntity: Partial<T>, ctx: CrudContext, inheritance: any = {}) {
        return await this.$patch({ [this.crudConfig.id_field]: id } as any, newEntity, ctx, false, inheritance);
    }

    private async doQueryPatch(query: Partial<T>, newEntity: Partial<T>, ctx: CrudContext, em: EntityManager, secure: boolean) {
        const opts = this.getReadOptions(ctx);
        let ormEntity = {};
        Object.setPrototypeOf(ormEntity, this.entity.prototype);
        wrap(ormEntity).assign(newEntity as any, { em: em.fork(), mergeObjectProperties: true, onlyProperties: true, onlyOwnProperties: true});
        ormEntity = (ormEntity as any).toJSON();
        return em.nativeUpdate(this.entity, query, ormEntity, opts);
    }

    private async doOnePatch(query: Partial<T>, newEntity: Partial<T>, ctx: CrudContext, em: EntityManager, secure: boolean) {
        this.checkObjectForIds(query);
        this.checkObjectForIds(newEntity);

        const opts = this.getReadOptions(ctx);
        let result = query;
        if (!result[this.crudConfig.id_field]) {
            const tempEm = em.fork();
            result = await tempEm.findOne(this.entity, query, opts as any);
            if (!result) {
                throw new BadRequestException('Entity not found (patch)');
            }
        };
        const id = this.dbAdapter.checkId(result[this.crudConfig.id_field]);

        let res = em.getReference(this.entity, id);
        wrap(res).assign(newEntity as any, { mergeObjectProperties: true, onlyProperties: true, onlyOwnProperties: true });
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
            if (count > this.security.maxItemsInDb) {
                throw new Error('Too many items in DB.');
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
        let result = em.remove(entity)
        if (!ctx?.noFlush) {
            await em.flush();
        }
        ctx = ctx || {};
        ctx.em = em;
        return 1;
    }

    async $cmdHandler(cmdName: string, ctx: CrudContext, inheritance: any = {}): Promise<any> {
        const cmdSecurity: any = this.security.cmdSecurityMap[cmdName];

        if(!cmdSecurity){
            throw new BadRequestException('Command not found');
        }

        return await this['$'+cmdName](ctx.data, ctx, inheritance);
    }

    async addToComputedTrust(user: CrudUser, trust: number, ctx: CrudContext) {
        return trust;
    }

    checkObjectForIds(obj: any) {
        for (let key in obj || {}) {
            obj[key] = this.dbAdapter.checkId(obj[key]);
        }
    }

    convertMongoPrimaryKey(key) {
        if (key && typeof key == 'string') {
            return new ObjectId(key as string);
        }
        return key;
    }

    checkMongoId(id: any) {
        if (typeof id == 'string' && id.length === 24 && id.match(/^[0-9a-fA-F]{24}$/)) {
            let oldValue = id;
            const newValue = new ObjectId(id as string);
            if (newValue.toString() === oldValue) {
                return newValue;
            }
        };
        return id;
    }

    async $getRights(dto: GetRightDto, ctx: CrudContext) {

        const ret: ICrudRightsInfo = {}

        if(dto.userItemsInDb){
            const dataMap = _utils.parseIfString(ctx.user?.crudUserCountMap || {});
            ret.userItemsInDb = dataMap?.[ctx.serviceName] || 0;
        }

        if(dto.maxBatchSize){
            const userRole: CrudRole = this.crudAuthorization.getCtxUserRole(ctx);
            const adminBatch = userRole.isAdminRole ? 100 : 0;
            const maxBatchSize = Math.max(adminBatch, this.crudAuthorization.getMatchBatchSizeFromCrudRoleAndParents(ctx, userRole, this.security));
            ret.maxBatchSize = maxBatchSize;
        }

        if(dto.maxItemsPerUser){
            ret.maxItemsPerUser = await this.crudAuthorization.computeMaxItemsPerUser(ctx, this.security)
        }

        if(dto.fields){
            const cls = this.entity;
            let trust = await this.crudAuthorization.getOrComputeTrust(ctx.user, ctx);
            if (trust < 0) {
                trust = 0;
            }
            ret.fields = await this._recursiveGetRightsType(cls, {}, trust);
        }

        if(dto.userCmdCount){
            for(const cmd in this.security.cmdSecurityMap){
                const cmdSecurity = this.security.cmdSecurityMap[cmd];
                const cmdMap = _utils.parseIfString(ctx.user?.cmdUserCountMap || {});
                ret.userCmdCount[cmd] = {
                    max: await this.crudAuthorization.computeMaxUsesPerUser(ctx, cmdSecurity),
                    performed: cmdMap?.[ctx.serviceName + '_' + cmd] || 0
                }
            }
        }
 
        return ret;
    }

    private async _recursiveGetRightsType(cls: any, ret: Record<string, ICrudRightsFieldInfo>, trust: number) {
        const classKey = CrudTransformer.subGetClassKey(cls);
        const metadata = CrudTransformer.getCrudMetadataMap()[classKey];
        if (!metadata) return ret;

        for (const key in metadata) {
            const field_metadata = metadata[key];
            const subRet: ICrudRightsFieldInfo = {};
            const subType = field_metadata?.type;
            if (subType) {
                if (Array.isArray(subType)) {
                    subRet.maxLength = field_metadata?.maxLength || this.crudConfig.validationOptions.DEFAULT_MAX_LENGTH;
                    if (field_metadata?.addMaxLengthPerTrustPoint) {
                        subRet.maxLength += trust * field_metadata.addMaxLengthPerTrustPoint;
                    }
                }
                const subCls = subType.class;
                subRet.type = await this._recursiveGetRightsType(subCls, {}, trust);
            }else{
                subRet.maxSize = field_metadata?.maxSize || this.crudConfig.validationOptions.DEFAULT_MAX_SIZE;
                if (field_metadata?.addMaxSizePerTrustPoint) {
                    subRet.maxSize += trust * field_metadata.addMaxSizePerTrustPoint;
                }
            }
            ret[key] = subRet;
        }

        return ret;
    }


}
