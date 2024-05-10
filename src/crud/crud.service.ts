import { BadRequestException, Inject, Injectable, forwardRef } from '@nestjs/common';
import { CrudEntity } from './model/CrudEntity';
import { BaseEntity, EntityClass, EntityManager, EntityName, wrap } from '@mikro-orm/core';
import { CrudSecurity } from './model/CrudSecurity';
import { Cache } from 'cache-manager';
import { CrudContext } from './model/CrudContext';

import { CrudUser } from '../user/model/CrudUser';
import { CrudUserService } from '../user/crud-user.service';
import { CRUD_CONFIG_KEY, CacheOptions, CrudConfigService } from './crud.config.service';
import { ModuleRef } from '@nestjs/core';
import { ObjectId } from '@mikro-orm/mongodb';




export class CrudService<T extends CrudEntity> {



    CACHE_TTL = 60 * 10 * 1000; // 10 minutes
    public serviceName: string;
    protected crudConfig: CrudConfigService;
    constructor(
        protected moduleRef: ModuleRef,
        public entity: EntityClass<T>,
        public security: CrudSecurity,
        private config?: {
            cacheOptions?: CacheOptions,
            serviceName?: string,
        }
    ) {
    }

    onModuleInit() {
        this.crudConfig = this.moduleRef.get(CRUD_CONFIG_KEY, { strict: false });
        this.CACHE_TTL = this.config?.cacheOptions?.TTL || this.crudConfig.defaultCacheOptions.TTL;
        this.crudConfig.addService(this);
    }


    createNewId(str?: string) {
        switch (this.crudConfig.dbType) {
            case 'mongo':
            default: 
                return str ? new ObjectId(str) : new ObjectId();
        }
    }

    getName() {
        return CrudService.getName(this.entity);
    }

    static getName(entity) {
        return entity.name.replace(/[A-Z]+(?![a-z])|[A-Z]/g, (match, p1) => (p1 ? "-" : "") + match.toLowerCase());
    }

    async create(newEntity: Partial<T>, context: CrudContext, secure: boolean = true, inheritance: any = {}) {
        this.checkObjectForIds(newEntity);

        const em = context?.em || this.crudConfig.entityManager.fork();
        if (secure) {
            await this.checkEntitySize(newEntity, context);
            await this.checkItemDbCount(em, context);
        }

        const opts = this.getReadOptions(context);
        newEntity.createdAt = new Date();
        newEntity.updatedAt = newEntity.createdAt;
        newEntity[this.crudConfig.id_field] = this.createNewId();
        const entity = em.create(this.entity, newEntity, opts as any);
        await em.persist(entity);
        if (!context?.noFlush) {
            await em.flush();
        }
        context = context || {};
        context.em = em;
        return entity;
    }

    async createBatch(newEntities: Partial<T>[], context: CrudContext, secure: boolean = true, inheritance: any = {}) {
        context.noFlush = true;
        const results = [];
        for (let entity of newEntities) {
            const res = await this.create(entity, context, secure, inheritance);
            results.push(res);
        }
        await context.em.flush();
        context.noFlush = false;

        return results;
    }

    async patchBatch(data: any[], ctx: CrudContext, secure: boolean = true, inheritance: any = {}) {
        ctx.noFlush = true;
        const results = [];
        for (let d of data) {
            const res = await this.patch(d.query, d.data, ctx, secure, inheritance);
            results.push(res);
        }
        await ctx.em.flush();
        ctx.noFlush = false;
        return results;
    }


    async unsecure_fastCreate(newEntity: Partial<T>, context: CrudContext, inheritance: any = {}) {
        return await this.create(newEntity, context, false, inheritance);
    }

    async find(entity: Partial<T>, context: CrudContext, inheritance: any = {}) {
        this.checkObjectForIds(entity);

        const em = context?.em || this.crudConfig.entityManager.fork();
        const opts = this.getReadOptions(context);
        const result = await em.find(this.entity, entity, opts as any);
        return result;
    }

    async findIn(ids: string[], entity: Partial<T>, context: CrudContext, inheritance: any = {}) {
        this.makeInQuery(ids, entity);
        return this.find(entity, context, inheritance);
    }

    getReadOptions(context: CrudContext) {
        const opts = context?.options || {};
        return opts as any;
    }

    getCacheKey(entity: Partial<T>) {
        return this.entity?.toString() + entity[this.crudConfig.id_field].toString();
    }



    async findOne(entity: Partial<T>, context: CrudContext, inheritance: any = {}) {
        this.checkObjectForIds(entity);
        const em = context?.em || this.crudConfig.entityManager.fork();
        const opts = this.getReadOptions(context);
        const result = await em.findOne(this.entity, entity, opts as any);
        return result;
    }

    async findOneCached(entity: Partial<T>, context: CrudContext, inheritance: any = {}) {
        if (!entity[this.crudConfig.id_field]) {
            throw new BadRequestException('No id field found in entity');
        }
        this.checkObjectForIds(entity);

        let cacheKey = this.getCacheKey(entity);
        const cached = await this.crudConfig.cacheManager.get(cacheKey);
        if (cached) {
            return cached;
        }
        const result = await this.findOne(entity, context, inheritance);
        this.crudConfig.cacheManager.set(cacheKey, result, this.CACHE_TTL);
        return result;
    }

    async setCached(entity: Partial<T>, context?: CrudContext, inheritance: any = {}) {
        let cacheKey = this.getCacheKey(entity);
        this.crudConfig.cacheManager.set(cacheKey, entity, this.CACHE_TTL);
        return entity;
    }

    async patch(query: Partial<T>, newEntity: Partial<T>, context: CrudContext, secure: boolean = true, inheritance: any = {}) {
        this.checkObjectForIds(query);
        this.checkObjectForIds(newEntity);

        const em = context?.em || this.crudConfig.entityManager.fork();
        const results = await this.doQueryPatch(query, newEntity, context, em, secure);
        if (!context?.noFlush) {
            await em.flush();
        }
        context = context || {};
        context.em = em;
        return results;
    }

    async unsecure_incPatch(args: { query: Partial<T>, increments: { [key: string]: number },  addPatch: any }, ctx: CrudContext, inheritance: any = {}) {
        const em = ctx?.em || this.crudConfig.entityManager.fork();
        switch(this.crudConfig.dbType){
          case 'mongo':
              let updateMongo = { $inc: {} };
              for (let key in args.increments) {
                updateMongo.$inc[key] = args.increments[key];
              }
              em.nativeUpdate(this.entity, args.query, updateMongo as any);
            break;
          default: 
            //UNTESTED
            let updateSql = {};
            for (let key in args.increments) {
                updateSql[key] = () => `${key} + ${args.increments[key]}`;
            }
            em.nativeUpdate(this.entity, args.query, updateSql);
          break;
        }
        ctx.em = em;
        let res;
        if(args.addPatch){
            res = await this.unsecure_fastPatch(args.query, args.addPatch, ctx, inheritance);
        }else if(!ctx.noFlush){
            res = await em.flush();
        }
        return res;
      }

    async patchIn(ids: string[], query: Partial<T>, newEntity: Partial<T>, context: CrudContext, secure: boolean = true, inheritance: any = {}) {
        this.makeInQuery(ids, query);
        return await this.patch(query, newEntity, context, secure, inheritance);
    }

    async removeIn(ids: any, query: any, ctx: CrudContext) {
        this.makeInQuery(ids, query);
        return await this.remove(query, ctx);
    }

    async unsecure_fastPatch(query: Partial<T>, newEntity: Partial<T>, context: CrudContext, inheritance: any = {}) {
        return await this.patch(query, newEntity, context, false, inheritance);
    }

    async patchOne(query: Partial<T>, newEntity: Partial<T>, context: CrudContext, secure: boolean = true, inheritance: any = {}) {
        const em = context?.em || this.crudConfig.entityManager.fork();
        const result = await this.doOnePatch(query, newEntity, context, em, secure, context);
        if (!context?.noFlush) {
            await em.flush();
        }
        context = context || {};
        context.em = em;
        return result;
    }

    async unsecure_fastPatchOne(id: string, newEntity: Partial<T>, context: CrudContext, inheritance: any = {}) {
        return await this.patch({ [this.crudConfig.id_field]: id} as any, newEntity, context, false, inheritance);
    }

    private async doQueryPatch(query: Partial<T>, newEntity: Partial<T>, ctx: CrudContext, em: EntityManager, secure: boolean) {
        const opts = this.getReadOptions(ctx);
        let results;
        if (secure) {
            const em0 = em.fork();
            results = await em0.find(this.entity, query, opts as any);
            for (let result of results) {
                wrap(result).assign(newEntity as any, { mergeObjectProperties: true, onlyProperties: true });
                await this.checkEntitySize(result, ctx);
            }
        }
        em.nativeUpdate(this.entity, query, newEntity, opts);
        return results;
    }

    private async doOnePatch(query: Partial<T>, newEntity: Partial<T>, ctx: CrudContext, em: EntityManager, secure: boolean, context: CrudContext) {
        this.checkObjectForIds(query);
        this.checkObjectForIds(newEntity);

        const opts = this.getReadOptions(context);
   
        const tempEm = em.fork();
        let result = await tempEm.findOne(this.entity, query, opts as any);
        if (!result) {
            throw new BadRequestException('Entity not found (patch)');
        }
        const id = this.checkId(result[this.crudConfig.id_field]);
        
        if(secure){
            wrap(result).assign(newEntity as any, { mergeObjectProperties: true, onlyProperties: true });
            await this.checkEntitySize(result, ctx);
        }
        
        let res = em.getReference(this.entity, id);
        wrap(res).assign(newEntity as any, { mergeObjectProperties: true, onlyProperties: true });
        return res;
    }

    notGuest(user: CrudUser) {
        return user.role != this.crudConfig.guest_role;
    }

    async checkEntitySize(entity: Partial<T>, context: CrudContext) {
        if (!context?.security?.maxSize) {
            return;
        }
        const entitySize = JSON.stringify(entity).length;
        let maxSize = context?.security.maxSize;
        let add = context?.security.additionalMaxSizePerTrustPoints;
        if (add) {
            add = add * (await this.crudConfig.userService.getOrComputeTrust(context.user, context));
            maxSize += Math.max(add, 0);;
        }
        if ((entitySize > maxSize) || !entitySize) {
            throw new BadRequestException('Entity size is too big');
        }
    }

    async checkItemDbCount(em: EntityManager, context: CrudContext) {
        if (context?.security.maxItemsInDb) {
            const count = await em.count(this.entity);
            if (count > context?.security.maxItemsInDb) {
                throw new Error('Too many items in DB.');
            }
        }
    }

    async remove(query: Partial<T>, context: CrudContext, inheritance: any = {}) {
        this.checkObjectForIds(query);
        const em = context?.em || this.crudConfig.entityManager.fork();
        const opts = this.getReadOptions(context);
        const length = em.nativeDelete(this.entity, query, opts);
        if (!context?.noFlush) {
            await em.flush();
        }
        context = context || {};
        context.em = em;
        return length;
    }

    async removeOne(query: Partial<T>, context: CrudContext, inheritance: any = {}) {
        this.checkObjectForIds(query);
        const em = context?.em || this.crudConfig.entityManager.fork();
        let entity = await em.findOne(this.entity, query);
        if (!entity) {
            throw new BadRequestException('Entity not found (removeOne)');
        }
        let result = em.remove(entity)
        if (!context?.noFlush) {
            await em.flush();
        }
        context = context || {};
        context.em = em;
        return result;
    }

    async cmdHandler(cmdName: string, context: CrudContext, inheritance: any = {}): Promise<any> {
        throw new BadRequestException('Command not found');
    }

    async beforeControllerHook(context: CrudContext): Promise<any> {

    }

    async afterControllerHook(context: CrudContext, res: any): Promise<any> {

    }

    async errorControllerHook(e: Error, context: CrudContext): Promise<any> {

    }


    async addToComputedTrust(user: CrudUser, trust: number, ctx: CrudContext) {
        return trust;
    }

    makeInQuery(ids, query: any) {
        if(this.crudConfig.dbType === 'mongo'){
            ids = ids.map(id => this.convertMongoPrimaryKey(id));
        }
        query[this.crudConfig.id_field] = { $in: ids };
    }
    
    checkId(id: any) {
        if(this.crudConfig.dbType === 'mongo'){
            return this.checkMongoId(id);
        }
        return id;
    }

    checkObjectForIds(obj: any) {
        for (let key in obj || {}) {
            obj[key] = this.checkId(obj[key]);
        }
    }

    convertMongoPrimaryKey(key) {
        if (key && typeof key == 'string') {
            return new ObjectId(key as string);
        }
        return key;
    }
    
    checkMongoId(id: any) {
        if(typeof id == 'string' && id.length === 24 && id.match(/^[0-9a-fA-F]{24}$/)){
            let oldValue = id;
            const newValue = new ObjectId(id as string);
            if(newValue.toString() === oldValue){
                return newValue;
            }
        };
        return id;
    }



    
    // private async doPut(entity: Partial<T>, newEntity: Partial<T>, ctx: CrudContext, secure: boolean) {
    //     newEntity.updatedAt = new Date();
    //     wrap(entity).assign(newEntity as any, { merge: false, mergeObjectProperties: false, onlyProperties: true });
    //     if (secure) {
    //         await this.checkEntitySize(entity, ctx);
    //     }
    // }

    // async putOne(newEntity: Partial<T>, context: CrudContext, secure: boolean = true, inheritance: any = {}) {
    //     const em = context?.em || this.crudConfig.entityManager.fork();
    //     delete newEntity[this.crudConfig.id_field];
    //     const ref = em.getReference(this.entity, id as any);
    //     const result = await this.doPut(ref, newEntity, context, secure);
    //     if (!context?.noFlush) {
    //         await em.flush();
    //     }
    //     context = context || {};
    //     context.em = em;
    //     return result;
    // }

    // async unsecure_fastPutOne(newEntity: Partial<T>, context: CrudContext, inheritance: any = {}) {
    //     return await this.putOne(newEntity, context, false, inheritance);
    // }


}
