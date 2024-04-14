import { Body, Controller, Delete, Post, Query } from '@nestjs/common';
import { CrudEntity } from './model/CrudEntity';
import { CrudService } from './crud.service';
import { CrudContext } from '../auth/model/CrudContext';
import { Context } from '../auth/auth.utils';
import { CrudQuery } from './model/CrudQuery';
import { CrudAuthorization } from './crud.authorization.service';
import { CrudConfig } from './model/CrudConfig';

@Controller({
    path: "crud",
    version: "1"
})
export class CrudController<T extends CrudEntity> {


    crudMap: Record<string, CrudService<any>>;

    constructor(
        protected userService: CrudService<any>,
        protected id_field = '_id',
        protected crudAuthorization: CrudAuthorization,
        protected crudConfig: CrudConfig
        ) {
            this.crudMap = crudConfig.services.reduce((acc, service) => {
                acc[service.name] = service;
                return acc;
            }, {});
        }


    assignContext(method: string, crudQuery: CrudQuery, query: any, data: any, ctx: CrudContext): CrudService<any>{
        const currentService: CrudService<any> = this.crudMap[query.service];
        ctx.method = method
        ctx.serviceName = crudQuery.service
        ctx.query = query;
        ctx.data = data;
        ctx.options = crudQuery.options;
        ctx.security = currentService.security;

        return currentService;
    }


    async beforeHooks(service: CrudService<any>, ctx: CrudContext){
        await service.beforeHook(ctx);
        await this.crudConfig.hooks.beforeAllHook?.(ctx);
    }
    async afterHooks(service: CrudService<any>, res, ctx: CrudContext){
        await service.afterHook(res, ctx);
        await this.crudConfig.hooks.afterAllHook?.(ctx, res);
    }
    async errorHooks(service: CrudService<any>, e, ctx: CrudContext){
        await service.errorHook(e, ctx);
        await this.crudConfig.hooks.errorAllHook?.(e, ctx);
        throw e;
    }


    async subCreate(query: CrudQuery, newEntity: any, ctx: CrudContext){
        const service = this.assignContext('POST', query, newEntity, newEntity, ctx);
        try{
            this.crudAuthorization.authorize(ctx);

            await this.beforeHooks(service, ctx);

            const res = await service.create(newEntity, ctx);

            await this.afterHooks(service, res, ctx);

            if(ctx?.user && ctx?.serviceName) {
                const count = ctx?.user.crudMap[ctx.serviceName] || 0;
                ctx.user.crudMap[ctx.serviceName] = count + 1;
                this.userService.unsecure_fastPatchOne(ctx?.user[this.id_field], {crudMap: ctx.user.crudMap}, ctx);
            }

            return res;
        }catch(e){
            await this.errorHooks(service, e, ctx);
        }
    }

    @Post('one')
    async _create(@Query() query: CrudQuery, @Body() newEntity: T, @Context() ctx: CrudContext) {
        return await this.subCreate(query, newEntity, ctx);
    }

    @Post('batch')
    async _batchCreate(@Query() query: CrudQuery, @Body() newEntities: T[], @Context() ctx: CrudContext) {
        const service: CrudService<any> = this.crudMap[query.service];
        

    }



    @Delete('one')
    async _delete(query: T, ctx?: CrudContext) {
        let res;
        if(query[this.id_field]) {
            res = await this.crudService.removeOne(query[this.id_field]);
        } else {
            res = await this.crudService.remove(query);
        }
        if(ctx?.user && ctx?.serviceName) {
            const count = ctx?.user.crudMap[ctx.serviceName] || 0;
            ctx.user.crudMap[ctx.serviceName] = count - (res || 1);
            this.userService.unsecure_fastPatchOne(ctx?.user[this.id_field], {crudMap: ctx.user.crudMap}, ctx);
        }
        return res;
    }


    async _find(entity: T) {
        return this.crudService.find(entity);
    }

    async _findOne(entity: T) {
        return this.crudService.findOne(entity);
    }

    async _patchOne(query: T, newEntity: T, ctx: CrudContext) {
        return this.crudService.patchOne(query[this.id_field], newEntity, ctx);
    }

    async _patch(query: T, newEntity: T, ctx: CrudContext) {
        return this.crudService.patch(query, newEntity, ctx);
    }

    async _putOne(newEntity: T, ctx: CrudContext) {
        return this.crudService.putOne(newEntity, ctx);
    }


}
