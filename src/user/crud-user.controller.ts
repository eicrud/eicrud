import { Body, Controller, Delete, Get, Patch, Post, Query } from '@nestjs/common';
import { Context, CrudContext } from '../auth/auth.utils';
import { CrudUser } from './entity/CrudUser';
import { CrudController } from '../crud/crud.controller';
import { CrudUserService } from './crud-user.service';

@Controller({
    path: 'user',
    version: '1',
 })
export class CrudUserController extends CrudController<CrudUser> {

    constructor(protected userService: CrudUserService,
        ) {
            super(userService, userService);
        }
 
    @Post()
    async create(@Body() newEntity: CrudUser, @Context()ctx: CrudContext){
        return this._create(newEntity, ctx);
    };

    @Delete()
    delete(@Query() query: CrudUser, @Context()ctx: CrudContext){
        return this._delete(query, ctx);
    };

    @Get('many')
    find(@Query()entity: CrudUser){
        return this._find(entity);
    };

    @Get('one')
    findOne(@Query()entity: CrudUser){
        return this._findOne(entity);
    };

    @Patch('one')
    patchOne(@Query()query: CrudUser, @Body()newEntity: CrudUser, @Context()ctx: CrudContext){
        return this._patchOne(query, newEntity, ctx);
    };

    @Patch('many')
    patch(@Query()query: CrudUser, @Body()newEntity: CrudUser, @Context()ctx: CrudContext){
        return this._patch(query, newEntity, ctx);
    };


}
