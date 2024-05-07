import { BadRequestException, Inject, Injectable, forwardRef } from '@nestjs/common';
import { CrudEntity } from './model/CrudEntity';
import { EntityManager, EntityName, wrap } from '@mikro-orm/core';
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
    protected crudConfig: CrudConfigService;
    constructor(
        protected moduleRef: ModuleRef,
        public entity: EntityName<Partial<T>>,
        public security: CrudSecurity,
        private config?: {
            cacheOptions?: CacheOptions
        }
    ) {
    }

    onModuleInit() {
        this.crudConfig = this.moduleRef.get(CRUD_CONFIG_KEY, { strict: false });
        this.CACHE_TTL = this.config?.cacheOptions?.TTL || this.crudConfig.defaultCacheOptions.TTL;
    }


    createId() {
        return new ObjectId();
    }

    async create(newEntity: Partial<T>, context: CrudContext, secure: boolean = true, inheritance: any = {}) {
        const em = context?.em || this.crudConfig.entityManager.fork();
        if (secure) {
            await this.checkEntitySize(newEntity, context);
            await this.checkItemDbCount(em, context);
        }

        const opts = this.getReadOptions(context);
        newEntity.createdAt = new Date();
        newEntity.updatedAt = newEntity.createdAt;
        newEntity[this.crudConfig.id_field] = this.createId();
        const entity = em.create(this.entity, newEntity, opts as any);
        await em.persist(entity);
        if (!context?.noFlush) {
            await em.flush();
        }
        context = context || {};
        context.em = em;
        return entity;
    }

    async unsecure_fastCreate(newEntity: Partial<T>, context: CrudContext, inheritance: any = {}) {
        return await this.create(newEntity, context, false, inheritance);
    }

    async find(entity: Partial<T>, context: CrudContext, inheritance: any = {}) {
        const em = context?.em || this.crudConfig.entityManager.fork();
        const opts = this.getReadOptions(context);
        this.convertEntityPrimaryKey(entity);
        const result = await em.find(this.entity, entity, opts as any);
        return result;
    }

    async findInMongo(ids: string[], entity: Partial<T>, context: CrudContext, inheritance: any = {}) {
        ids = ids.map(id => this.convertPrimaryKey(id));
        this.makeInQuery(ids, entity);
        const em = context?.em || this.crudConfig.entityManager.fork();
        const opts = this.getReadOptions(context);
        const result = await em.find(this.entity, entity, opts as any);
        return result;
    }

    getReadOptions(context: CrudContext) {
        const opts = context?.options || {};
        return opts as any;
    }

    getCacheKey(entity: Partial<T>) {
        return this.entity?.toString() + entity[this.crudConfig.id_field].toString();
    }

    convertEntityPrimaryKey(entity) {
        entity[this.crudConfig.id_field] = this.convertPrimaryKey(entity[this.crudConfig.id_field]);
    }

    convertPrimaryKey(key) {
        return this.convertMongoPrimaryKey(key);
    }

    convertMongoPrimaryKey(key) {
        if (key && typeof key == 'string') {
            return new ObjectId(key as string);
        }
        return key;
    }




    async findOne(entity: Partial<T>, context: CrudContext, inheritance: any = {}) {
        const em = context?.em || this.crudConfig.entityManager.fork();
        const opts = this.getReadOptions(context);
        this.convertEntityPrimaryKey(entity);
        const result = await em.findOne(this.entity, entity, opts as any);
        return result;
    }

    async findOneCached(entity: Partial<T>, context: CrudContext, inheritance: any = {}) {
        if (!entity[this.crudConfig.id_field]) {
            throw new BadRequestException('No id field found in entity');
        }
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
        const em = context?.em || this.crudConfig.entityManager.fork();
        const results = await this.doQueryPatch(query, newEntity, context, em, secure);
        if (!context?.noFlush) {
            await em.flush();
        }
        context = context || {};
        context.em = em;
        return results;
    }

    makeInMongoQuery(ids, query: any) {
        query[this.crudConfig.id_field] = { $in: ids };
    }

    makeInQuery(ids, query: any) {
        return this.makeInMongoQuery(ids, query);
    }

    async patchIn(ids: string[], query: Partial<T>, newEntity: Partial<T>, context: CrudContext, secure: boolean = true, inheritance: any = {}) {
        this.makeInQuery(ids, query);
        return await this.patch(query, newEntity, context, secure, inheritance);
    }

    async unsecure_fastPatch(query: Partial<T>, newEntity: Partial<T>, context: CrudContext, inheritance: any = {}) {
        return await this.patch(query, newEntity, context, false, inheritance);
    }

    async patchOne(id: string, newEntity: Partial<T>, context: CrudContext, secure: boolean = true, inheritance: any = {}) {
        const em = context?.em || this.crudConfig.entityManager.fork();
        const result = await this.doOnePatch(id, newEntity, context, em, secure, context);
        if (!context?.noFlush) {
            await em.flush();
        }
        context = context || {};
        context.em = em;
        return result;
    }

    async unsecure_fastPatchOne(id: string, newEntity: Partial<T>, context: CrudContext, inheritance: any = {}) {
        return await this.patchOne(id, newEntity, context, false, inheritance);
    }

    private async doQueryPatch(query: Partial<T>, newEntity: Partial<T>, ctx: CrudContext, em: EntityManager, secure: boolean) {
        const opts = this.getReadOptions(ctx);
        let results;
        if (secure) {
            this.convertEntityPrimaryKey(query);
            results = await em.find(this.entity, query, opts as any);
            for (let result of results) {
                wrap(result).assign(newEntity as any, { mergeObjectProperties: true, onlyProperties: true });
                await this.checkEntitySize(result, ctx);
            }
        } else {
            em.nativeUpdate(this.entity, query, newEntity, opts);
        }
        return results;
    }

    private async doOnePatch(id: string, newEntity: Partial<T>, ctx: CrudContext, em: EntityManager, secure: boolean, context: CrudContext) {
        const opts = this.getReadOptions(context);
        if (secure) {
            const tempEm = em.fork();
            id = this.convertPrimaryKey(id);
            let result = await tempEm.findOne(this.entity, id as any, opts as any);
            wrap(result).assign(newEntity as any, { mergeObjectProperties: true, onlyProperties: true });
            await this.checkEntitySize(result, ctx);
        }
        let res = em.getReference(this.entity, id as any);
        wrap(res).assign(newEntity as any, { mergeObjectProperties: true, onlyProperties: true });
        return res;
    }

    private async doPut(entity: Partial<T>, newEntity: Partial<T>, ctx: CrudContext, secure: boolean) {
        newEntity.updatedAt = new Date();
        wrap(entity).assign(newEntity as any, { merge: false, mergeObjectProperties: false, onlyProperties: true });
        if (secure) {
            await this.checkEntitySize(entity, ctx);
        }
    }

    async putOne(newEntity: Partial<T>, context: CrudContext, secure: boolean = true, inheritance: any = {}) {
        const em = context?.em || this.crudConfig.entityManager.fork();
        const ref = em.getReference(this.entity, newEntity[this.crudConfig.id_field]);
        const result = await this.doPut(ref, newEntity, context, secure);
        if (!context?.noFlush) {
            await em.flush();
        }
        context = context || {};
        context.em = em;
        return result;
    }

    async unsecure_fastPutOne(newEntity: Partial<T>, context: CrudContext, inheritance: any = {}) {
        return await this.putOne(newEntity, context, false, inheritance);
    }

    notGuest(user: CrudUser) {
        return user.role != this.crudConfig.guest_role;
    }

    async checkEntitySize(entity: Partial<T>, context: CrudContext) {
        if (!context?.security.maxSize) {
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
                throw new Error('Partial<T>oo many items in DB.');
            }
        }
    }


    async remove(query: Partial<T>, context: CrudContext, inheritance: any = {}) {
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

    async removeOne(id: string, context: CrudContext, inheritance: any = {}) {
        const em = context?.em || this.crudConfig.entityManager.fork();
        const entity = em.getReference(this.entity, id as any);
        const result = em.remove(entity)
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


}
