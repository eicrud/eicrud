import { BadRequestException, Injectable } from '@nestjs/common';
import { CrudEntity } from './model/crudEntity';
import { EntityManager, EntityName, wrap } from '@mikro-orm/core';
import { CrudSecurity } from '../auth/model/CrudSecurity';
import { Cache } from 'cache-manager';
import { CrudContext } from '../auth/auth.utils';

@Injectable()
export class CrudService<T extends CrudEntity> {

    CACHE_TTL = 60 * 10 * 1000; // 10 minutes

    constructor(protected entityName: EntityName<any>, 
        protected entityManager: EntityManager,
        protected cacheManager: Cache,
        protected id_field = '_id') {}
    
    async create(newEntity: T, context: CrudContext) {
        this.checkEntitySize(newEntity, context);
        const em = this.entityManager.fork();
        if(context?.security.maxItemsInDb) {
            const count = await em.count(this.entityName);
            if(count > context?.security.maxItemsInDb) {
                throw new Error('Too many items in DB.');
            }
        }
        const opts = this.getReadOptions(newEntity);
        newEntity.createdAt = new Date();
        const entity = em.create(this.entityName, newEntity, opts as any);
        await em.persistAndFlush(entity);
        return entity;
    }

    async unsecure_fastCreate(newEntity: T) {
        const em = this.entityManager.fork();
        const opts = this.getReadOptions(newEntity);
        newEntity.createdAt = new Date();
        const entity = em.create(this.entityName, newEntity, opts as any);
        await em.persistAndFlush(entity);
        return entity;
    }
    
    async find(entity: T) {
        const em = this.entityManager.fork();
        const opts = this.getReadOptions(entity);
        const result = await em.find(this.entityName, entity, opts as any);
        return result;
    }

    getReadOptions(entity: T) {
        const opts = entity._dto || {};
        return opts as any;
    }

    getCacheKey(entity: T) {
        return this.entityName + entity[this.id_field].toString();
    }

    async findOne(entity: T) {
        const em = this.entityManager.fork();
        const opts = this.getReadOptions(entity);
        const result = await em.findOne(this.entityName, entity, opts as any);
        return result;    
    }

    async findOneCached(entity: T) {
        let cacheKey = this.getCacheKey(entity);
        const cached = await this.cacheManager.get(cacheKey);
        if(cached) {
            return cached;
        }
        const result = await this.findOne(entity);
        this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
        return result; 
    }
    
    async patch(query: T, newEntity: T, context: CrudContext, secure: boolean = true) {
        const em = this.entityManager.fork();
        const results = await this.doQueryPatch(query, newEntity, context, em, secure);
        await em.flush();
        return results;
    }

    async unsecure_fastPatch(query: T, newEntity: T){
        return await this.patch(query, newEntity, null, false);
    }

    async patchOne(id: string, newEntity: T, context: CrudContext, secure: boolean = true) {
        const em = this.entityManager.fork();
        const result = await this.doOnePatch(id, newEntity, context, em, secure);
        await em.flush();
        return result;
    }

    async unsecure_fastPatchOne(id: string, newEntity: T){
        return await this.patchOne(id, newEntity, null, false);
    }

    private async doQueryPatch(query: T, newEntity: T, ctx:CrudContext, em: EntityManager, secure: boolean){
        const opts = this.getReadOptions(query);
        const results = await em.find(this.entityName, query, opts as any);
        for(let result of results) {
            this.doUpdate(result, newEntity, ctx, secure);
        }
        return results;
    }

    private async doOnePatch(id: string, newEntity: T, ctx:CrudContext, em: EntityManager, secure: boolean){
        const opts = this.getReadOptions(newEntity);
        const result = await em.findOne(this.entityName, id, opts as any);
        this.doUpdate(result, newEntity, ctx, secure);
        return result;
    }
    
    private doUpdate(entity: T, newEntity: T, ctx:CrudContext, secure: boolean) {
        newEntity.updatedAt = new Date();
        wrap(entity).assign(newEntity, {mergeObjects: true, onlyProperties: true});
        if(secure){
            this.checkEntitySize(entity, ctx);
        }
    }


    async putOne(newEntity: T, context: CrudContext, secure: boolean = true) {
        const em = this.entityManager.fork();
        const ref = em.getReference(this.entityName, newEntity[this.id_field]);
        const result = this.doUpdate(ref, newEntity, context, secure);
        await em.flush();
        return result;
    }

    async unsecure_fastPutOne(newEntity: T){
        return await this.putOne(newEntity, null, false);
    }

    checkEntitySize(entity: T, context: CrudContext) {
        const entitySize = JSON.stringify(entity).length;
        if(entitySize > context?.security.maxSize || !entitySize) {
            throw new BadRequestException('Entity size is too big');
        }
    }


    async remove(query: T) {
        const em = this.entityManager.fork();
        const opts = this.getReadOptions(query);
        const results = await em.find(this.entityName, query, opts as any);
        const length = results.length;
        for(let result of results) {
            this.doRemove(result, em);
        }
        await em.flush();
        return length;
    }

    async removeOne(id: string) {
        const em = this.entityManager.fork();
        const book1 = em.getReference(this.entityName, id);
        const result = this.doRemove(book1, em);
        await em.flush();
        return result;
    }

    doRemove(entity: T, em: EntityManager) {
        em.remove(entity);
    }


}
