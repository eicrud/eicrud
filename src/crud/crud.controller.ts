import { Controller } from '@nestjs/common';
import { CrudEntity } from './model/crudEntity';
import { CrudService } from './crud.service';
import { CrudContext } from '../auth/auth.utils';


interface User {
    crudMap: Record<string, number>;
}

export abstract class CrudController<T extends CrudEntity> {

    constructor(protected crudService: CrudService<T>,
        protected uniqueFields: string[] = [],
        protected userService: CrudService<any>,
        protected id_field = '_id',
        ) {}

    abstract create(newEntity: T, ctx: CrudContext);

    async _create(newEntity: T, ctx: CrudContext) {
        const res = await this.crudService.create(newEntity, ctx);
        if(ctx?.user && ctx?.serviceName) {
            const count = ctx?.user.crudMap[ctx.serviceName] || 0;
            ctx.user.crudMap[ctx.serviceName] = count + 1;
            this.userService.unsecure_fastUpdateOne(ctx?.user[this.id_field], {crudMap: ctx.user.crudMap});
        }

        return res;
    }

    abstract delete(query: T, ctx: CrudContext);

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
            this.userService.unsecure_fastUpdateOne(ctx?.user[this.id_field], {crudMap: ctx.user.crudMap});
        }
        return res;
    }

    abstract find(entity: T);

    async _find(entity: T) {
        if(entity?._dto?.limit == 1){
            return this.crudService.findOne(entity);
        }
        return this.crudService.find(entity);
    }


}
