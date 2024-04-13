import { Controller } from '@nestjs/common';
import { CrudEntity } from './model/crudEntity';
import { CrudService } from './crud.service';
import { CrudContext } from '../auth/auth.utils';

export class CrudController<T extends CrudEntity> {

    constructor(protected crudService: CrudService<T>,
        protected userService: CrudService<any>,
        protected id_field = '_id',
        ) {}


    async _create(newEntity: T, ctx: CrudContext) {
        const res = await this.crudService.create(newEntity, ctx);
        if(ctx?.user && ctx?.serviceName) {
            const count = ctx?.user.crudMap[ctx.serviceName] || 0;
            ctx.user.crudMap[ctx.serviceName] = count + 1;
            this.userService.unsecure_fastPatchOne(ctx?.user[this.id_field], {crudMap: ctx.user.crudMap});
        }

        return res;
    }


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
            this.userService.unsecure_fastPatchOne(ctx?.user[this.id_field], {crudMap: ctx.user.crudMap});
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
