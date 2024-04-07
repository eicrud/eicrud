import { BadRequestException, Injectable } from '@nestjs/common';
import { CrudEntity } from './model/crudEntity';
import { EntityManager, EntityName, wrap } from '@mikro-orm/core';
import { CrudSecurity } from '../auth/model/CrudSecurity';
import { Cache } from 'cache-manager';
import { CrudContext } from '../auth/auth.utils';

@Injectable()
export class CrudService<T extends CrudEntity> {

    CACHE_TTL = 60 * 10; // 10 minutes

    constructor(protected entityName: EntityName<any>, 
        protected entityManager: EntityManager,
        protected cacheManager: Cache,
        protected id_field = '_id') {}
    
    async create(newEntity: T, context: CrudContext) {
        const entitySize = JSON.stringify(newEntity).length;
        if(entitySize > context?.security.maxSize || !entitySize) {
            throw new BadRequestException('Entity size is too big.');
        }
        const em = this.entityManager.fork();
        if(context?.security.maxItemsInDb) {
            const count = await em.count(this.entityName);
            if(count > context?.security.maxItemsInDb) {
                throw new Error('Too many items in DB.');
            }
        }
        const opts = newEntity._dto || {};
        newEntity.createdAt = new Date();
        const entity = em.create(this.entityName, newEntity, opts as any);
        await em.persistAndFlush(entity);
        return entity;
    }

    async unsecure_fastCreate(newEntity: T) {
        const em = this.entityManager.fork();
        const opts = newEntity._dto || {};
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
        const em = this.entityManager.fork();
        const opts = this.getReadOptions(entity);
        const result = await em.findOne(this.entityName, entity, opts as any);
        this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
        return result; 
    }
    
    async update(query: T, newEntity: T, context: CrudContext) {
        const em = this.entityManager.fork();
        const opts = newEntity._dto || {};
        const results = await em.find(this.entityName, query, opts as any);
        for(let result of results) {
            await this.safe_updateEntity(result, newEntity, context)
        }
        await em.flush();
        return results;
    }

    async updateOne(id: string, newEntity: T, context: CrudContext) {
        const em = this.entityManager.fork();
        const opts = newEntity._dto || {};
        const result = await em.findOne(this.entityName, id, opts as any);
        await this.safe_updateEntity(result, newEntity, context);
        await em.flush();
        return result;
    }

    
    async unsecure_fastUpdate(query: T, newEntity: T) {
        newEntity.updatedAt = new Date();
        const em = this.entityManager.fork();
        const opts = newEntity._dto || {};
        const results = await em.find(this.entityName, query, opts as any);
        for(let result of results) {
            wrap(result).assign(newEntity, {mergeObjects: true, onlyProperties: true});
        }
        await em.flush();
        return results;
    }

    // UNSECURE : no user imput
    async unsecure_fastUpdateOne(id: string, newEntity: T) {
        newEntity.updatedAt = new Date();
        const em = this.entityManager.fork();
        const ref = em.getReference(this.entityName, id);
        wrap(ref).assign(newEntity, {mergeObjects: true, onlyProperties: true});
 
        await em.flush();
    }

    async safe_updateEntity(entity: T, newEntity: T, context: CrudContext) {
        newEntity.updatedAt = new Date();
        wrap(entity).assign(newEntity, {mergeObjects: true, onlyProperties: true});
        const entitySize = JSON.stringify(entity).length;
        if(entitySize > context?.security.maxSize || !entitySize) {
            throw new BadRequestException('Entity size is too big');
        }
    }
    
    async remove(query: T) {
        const em = this.entityManager.fork();
        const opts = query._dto || {};
        const results = await em.find(this.entityName, query, opts as any);
        const length = results.length;
        for(let result of results) {
            em.remove(result);
        }
        await em.flush();
        return length;
    }

    async removeOne(id: string) {
        const em = this.entityManager.fork();
        const book1 = em.getReference(this.entityName, id);
        await em.remove(book1).flush();
    }


}
