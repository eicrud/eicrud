import { BadRequestException, Injectable } from '@nestjs/common';
import { CrudEntity } from './model/CrudEntity';
import { EntityManager, EntityName, wrap } from '@mikro-orm/core';
import { CrudSecurity } from './model/CrudSecurity';
import { Cache } from 'cache-manager';
import { CrudContext } from '../auth/model/CrudContext';
import { CrudConfig } from './model/CrudConfig';
import { CrudUser } from '../user/entity/CrudUser';
import { CrudUserService } from '../user/crud-user.service';

@Injectable()
export class CrudService<T extends CrudEntity> {

    CACHE_TTL = 60 * 10 * 1000; // 10 minutes

    name: string;
    security: CrudSecurity;
    entity: CrudEntity;
    
    constructor(protected entityName: EntityName<any>, 
        protected entityManager: EntityManager,
        protected cacheManager: Cache,
        protected userService: CrudUserService,
        protected crudConfig: CrudConfig) {}
    
    async create(newEntity: T, context: CrudContext, secure: boolean = true, inheritance: any = {}) {
        const em = context.em || this.entityManager.fork();
        if(secure){
            await this.checkEntitySize(newEntity, context);
            await this.checkItemDbCount(em, context);
        }

        const opts = this.getReadOptions(context);
        newEntity.createdAt = new Date();
        const entity = em.create(this.entityName, newEntity, opts as any);
        await em.persist(entity);
        if(!context.noFlush) {
            await em.flush();
        }
        context.em = em;
        return entity;
    }

    async unsecure_fastCreate(newEntity: T, context: CrudContext, inheritance: any = {}) {
        return await this.create(newEntity, context, false, inheritance);
    }
    
    async find(entity: T, context: CrudContext, inheritance: any = {}) {
        const em = context.em || this.entityManager.fork();
        const opts = this.getReadOptions(context);
        const result = await em.find(this.entityName, entity, opts as any);
        return result;
    }

    getReadOptions(context: CrudContext) {
        const opts = context.options || {};
        return opts as any;
    }

    getCacheKey(entity: T) {
        return this.entityName + entity[this.crudConfig.id_field].toString();
    }

    async findOne(entity: Partial<T>, context: CrudContext, inheritance: any = {}) {
        const em = context.em || this.entityManager.fork();
        const opts = this.getReadOptions(context);
        const result = await em.findOne(this.entityName, entity, opts as any);
        return result;    
    }

    async findOneCached(entity: T, context: CrudContext, inheritance: any = {}) {
        let cacheKey = this.getCacheKey(entity);
        const cached = await this.cacheManager.get(cacheKey);
        if(cached) {
            return cached;
        }
        const result = await this.findOne(entity, context, inheritance);
        this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
        return result; 
    }
    
    async patch(query: T, newEntity: T, context: CrudContext, secure: boolean = true, inheritance: any = {}) {
        const em = context.em || this.entityManager.fork();
        const results = await this.doQueryPatch(query, newEntity, context, em, secure);
        if(!context.noFlush) {
            await em.flush();
        }
        context.em = em;
        return results;
    }

    async unsecure_fastPatch(query: T, newEntity: T, context: CrudContext, inheritance: any = {}){
        return await this.patch(query, newEntity, context, false, inheritance);
    }

    async patchOne(id: string, newEntity: T, context: CrudContext, secure: boolean = true, inheritance: any = {}) {
        const em = context.em || this.entityManager.fork();
        const result = await this.doOnePatch(id, newEntity, context, em, secure, context);
        if(!context.noFlush) {
            await em.flush();
        }
        context.em = em;
        return result;
    }

    async unsecure_fastPatchOne(id: string, newEntity: T, context: CrudContext, inheritance: any = {}){
        return await this.patchOne(id, newEntity, context, false, inheritance);
    }

    private async doQueryPatch(query: T, newEntity: T, ctx:CrudContext, em: EntityManager, secure: boolean){
        const opts = this.getReadOptions(ctx);
        const results = await em.find(this.entityName, query, opts as any);
        for(let result of results) {
            await this.doUpdate(result, newEntity, ctx, secure);
        }
        return results;
    }

    private async doOnePatch(id: string, newEntity: T, ctx:CrudContext, em: EntityManager, secure: boolean, context: CrudContext){
        const opts = this.getReadOptions(context);
        const result = await em.findOne(this.entityName, id, opts as any);
        await this.doUpdate(result, newEntity, ctx, secure);
        return result;
    }
    
    private async doUpdate(entity: T, newEntity: T, ctx:CrudContext, secure: boolean) {
        newEntity.updatedAt = new Date();
        wrap(entity).assign(newEntity, {mergeObjects: true, onlyProperties: true});
        if(secure){
            await this.checkEntitySize(entity, ctx);
        }
    }

    async putOne(newEntity: T, context: CrudContext, secure: boolean = true, inheritance: any = {}) {
        const em = context.em || this.entityManager.fork();
        const ref = em.getReference(this.entityName, newEntity[this.crudConfig.id_field]);
        const result = await this.doUpdate(ref, newEntity, context, secure);
        if(!context.noFlush) {
            await em.flush();
        }
        context.em = em;
        return result;
    }

    async unsecure_fastPutOne(newEntity: T, context: CrudContext, inheritance: any = {}){
        return await this.putOne(newEntity, context, false, inheritance);
    }

    notGuest(user: CrudUser) {
        return user.role != this.crudConfig.guest_role;
    }

    async checkEntitySize(entity: T, context: CrudContext) {
        if(!context?.security.maxSize){
            return;
        }
        const entitySize = JSON.stringify(entity).length;
        let maxSize = context?.security.maxSize;
        let add = context?.security.additionalMaxSizePerTrustPoints;
        if(add){
           add = add*(await this.userService.getOrComputeTrust(context.user, context));
           maxSize+=Math.max(add,0);;
        }
        if((entitySize > maxSize) || !entitySize) {
            throw new BadRequestException('Entity size is too big');
        }
    }

    async checkItemDbCount(em: EntityManager, context: CrudContext){
        if(context?.security.maxItemsInDb) {
            const count = await em.count(this.entityName);
            if(count > context?.security.maxItemsInDb) {
                throw new Error('Too many items in DB.');
            }
        }
    }


    async remove(query: T, context:CrudContext, inheritance: any = {}) {
        const em = context.em || this.entityManager.fork();
        const opts = this.getReadOptions(context);
        const results = await em.find(this.entityName, query, opts as any);
        const length = results.length;
        for(let result of results) {
            this.doRemove(result, em);
        }
        if(!context.noFlush) {
            await em.flush();
        }
        context.em = em;
        return length;
    }

    async removeOne(id: string, context:CrudContext, inheritance: any = {}) {
        const em = context.em || this.entityManager.fork();
        const book1 = em.getReference(this.entityName, id);
        const result = this.doRemove(book1, em);
        if(!context.noFlush) {
            await em.flush();
        }
        context.em = em;
        return result;
    }

    doRemove(entity: T, em: EntityManager) {
        em.remove(entity);
    }

    async beforeControllerHook(context: CrudContext): Promise<any> {

    }

    async afterControllerHook(context: CrudContext, res: any): Promise<any> {

    }
    
    async errorControllerHook(e: Error, context: CrudContext): Promise<any> {

    }

  


}
