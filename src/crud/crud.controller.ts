import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Inject, Post, Query, UnauthorizedException, ValidationPipe, forwardRef } from '@nestjs/common';
import { CrudEntity } from './model/CrudEntity';
import { CrudService } from './crud.service';
import { CrudContext } from './model/CrudContext';
import { Context } from '../authentification/auth.utils';
import { CrudQuery } from './model/CrudQuery';
import { CrudAuthorizationService } from './crud.authorization.service';
import { TransformationType, plainToInstance as dontuseme } from 'class-transformer';
import { TransformOperationExecutor } from 'class-transformer/cjs/TransformOperationExecutor';
import { defaultOptions } from 'class-transformer/cjs/constants/default-options.constant';
import { IsEmail, IsOptional, IsString, MaxLength, validateOrReject } from 'class-validator';
import { CrudConfigService } from './crud.config.service';
import { CmdSecurity } from './model/CrudSecurity';
import { CrudErrors } from './model/CrudErrors';
import { CrudAuthService } from '../authentification/auth.service';

@Controller({
    path: "crud",
    version: "1"
})
export class CrudController<T extends CrudEntity> {

    crudMap: Record<string, CrudService<any>>;

    constructor(
        @Inject(forwardRef(() => CrudAuthService))
        private crudAuthService: CrudAuthService,
        public crudAuthorization: CrudAuthorizationService,
        @Inject(forwardRef(() => CrudConfigService))
        protected crudConfig: CrudConfigService,

        ) {
            this.crudMap = crudConfig.services.reduce((acc, service) => {
                acc[service.entity.toString()] = service;
                return acc;
            }, {});
        }

    async assignContextAndValidate(method: string, crudQuery: CrudQuery, query: any, data: any, type, ctx: CrudContext): CrudService<any>{
        const currentService: CrudService<any> = this.crudMap[query.service];
        ctx.method = method
        ctx.serviceName = crudQuery.service
        ctx.query = query;
        ctx.data = data;
        ctx.options = crudQuery.options;
        ctx.security = currentService.security;
        ctx.origin = type;
        if(ctx.origin == 'cmd'){
            ctx.cmdName = crudQuery.cmd;
        }

        await this.validate(ctx, currentService);

        return currentService;
    }

    async beforeHooks(service: CrudService<any>, ctx: CrudContext){
        
        await service.beforeControllerHook(ctx);
        await this.crudConfig.beforeAllHook?.(ctx);

    }
    async afterHooks(service: CrudService<any>, res, ctx: CrudContext){
        await service.afterControllerHook(res, ctx);
        await this.crudConfig.afterAllHook?.(ctx, res);
    }
    async errorHooks(service: CrudService<any>, e: Error, ctx: CrudContext){
        await service.errorControllerHook(e, ctx);
        await this.crudConfig.errorAllHook?.(e, ctx);
        const notGuest = this.crudConfig.userService.notGuest(ctx?.user);
        if(notGuest){
            if(e instanceof ForbiddenException){
                this.crudConfig.userService.unsecure_fastPatchOne(ctx?.user[this.crudConfig.id_field], { incidentCount: ctx.user.incidentCount + 1 } , ctx);
            }else{
                this.crudConfig.userService.unsecure_fastPatchOne(ctx?.user[this.crudConfig.id_field], { errorCount: ctx.user.errorCount + 1 } , ctx);
            }
        }
        throw e;
    }

    async subCreate(query: CrudQuery, newEntity: any, ctx: CrudContext){
        const service = await this.assignContextAndValidate('POST', query, newEntity, newEntity, 'crud', ctx);
        try{
            await this.crudAuthorization.authorize(ctx);

            await this.beforeHooks(service, ctx);

            const res = await service.create(newEntity, ctx);

            await this.afterHooks(service, res, ctx);

            if(ctx?.user && ctx?.serviceName) {
                const count = ctx?.user.crudUserDataMap[ctx.serviceName].itemsCreated || 0;
                ctx.user.crudUserDataMap[ctx.serviceName].itemsCreated = count + 1;
                this.crudConfig.userService.unsecure_fastPatchOne(ctx?.user[this.crudConfig.id_field], {crudUserDataMap: ctx.user.crudUserDataMap}, ctx);
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

    async validate(ctx: CrudContext, currentService: CrudService<any>){
        let queryClass = null;
        let dataClass = null;
        let dataDefaultValues = false;
        if(ctx.origin == 'crud'){
            if(ctx.method == 'POST'){
                dataClass = currentService.entity;
                dataDefaultValues = true;
            }else if(ctx.method == 'PUT'){
                dataClass = currentService.entity;
                queryClass = currentService.entity;
                dataDefaultValues = true;
            }else if (ctx.method == 'PATCH'){
                dataClass = currentService.entity;
                queryClass = currentService.entity;
            }else if(ctx.method == 'GET' || ctx.method == 'DELETE'){
                queryClass = currentService.entity;
            }
        }else if(ctx.origin == 'cmd'){
            const cmdSecurity: CmdSecurity  = ctx.security?.cmdSecurityMap?.[ctx.cmdName];
            queryClass = null;
            if(cmdSecurity?.dto){
                dataClass = cmdSecurity.dto;
            }
        }
        if(queryClass){
            const obj = this.plainToInstanceNoDefaultValues(ctx.query, queryClass);
            await this.validateOrReject(obj, true, 'Query:');
        }
        if(dataClass){
            ctx.data = dataDefaultValues ? this.plainToInstanceWithDefaultValues(ctx.data, dataClass) : this.plainToInstanceNoDefaultValues(ctx.data, dataClass);
            await this.validateOrReject(ctx.data, !dataDefaultValues, 'Data:');
        }

    }

    async validateOrReject(obj, skipMissingProperties, label){
        try {
            await validateOrReject(obj, {skipMissingProperties: skipMissingProperties});
        }catch(errors){
            const msg = label + ' ' + errors.toString();
            throw new BadRequestException(CrudErrors.VALIDATION_ERROR.str(msg));
        }
    }

    @Post('batch')
    async _batchCreate(@Query() query: CrudQuery, @Body() newEntities: T[], @Context() ctx: CrudContext) {
        await this.assignContextAndValidate('POST', query, newEntities[0], newEntities[0], 'crud', ctx);
        await this.crudAuthorization.authorizeBatch(ctx, newEntities.length);
        ctx.noFlush = true;
        const results = [];
        for(const entity of newEntities) {
            results.push(await this.subCreate(query, entity, ctx));
        }
        ctx.noFlush = false;
        await ctx.em.flush();
        return results;
    }

    @Post('cmd')
    async _secureCMD(@Query() query: CrudQuery, @Body() newEntities: T[], @Context() ctx: CrudContext) {
        await this.assignContextAndValidate('POST', query, newEntities[0], newEntities[0], 'cmd', ctx);
        await this.crudAuthorization.authorize(ctx, newEntities.length);
        ctx.noFlush = true;
        const results = [];
        for(const entity of newEntities) {
            results.push(await this.subCreate(query, entity, ctx));
        }
        ctx.noFlush = false;
        await ctx.em.flush();
        return results;
    }

    @Get('many')
    async _find(@Query() query: CrudQuery, @Context() ctx: CrudContext) {
        const isAdmin = this.crudAuthorization.getCtxUserRole(ctx)?.isAdminRole;
        const MAX_LIMIT_FIND = isAdmin ? 400 : 40;
        if(!query.options?.limit || query.options?.limit > MAX_LIMIT_FIND) {
            query.options = query.options || {};
            query.options.limit = MAX_LIMIT_FIND;
        }
        return this.crudService.find(entity);
    }

    @Get('ids')
    async _findIds(@Query() query: CrudQuery, @Context() ctx: CrudContext) {
        query.options = query.options || {};
        query.options.fields = [this.crudConfig.id_field];
        const isAdmin = this.crudAuthorization.getCtxUserRole(ctx)?.isAdminRole;
        const MAX_LIMIT_FIND_IDS = isAdmin ? 8000 : 4000;
        if(!query.options?.limit || query.options?.limit > MAX_LIMIT_FIND_IDS) {
            query.options.limit = MAX_LIMIT_FIND_IDS;
        }

        return this.crudService.find(entity);
    }

    async _findOne(entity: T) {
        return this.crudService.findOne(entity);
    }

    @Delete('one')
    async _delete(query: T, ctx?: CrudContext) {
        let res;
        if(query[this.crudConfig.id_field]) {
            res = await this.crudService.removeOne(query[this.crudConfig.id_field]);
        } else {
            res = await this.crudService.remove(query);
        }
        if(ctx?.user && ctx?.serviceName) {
            const count = ctx?.user.crudUserDataMap[ctx.serviceName].itemsCreated || 0;
            ctx.user.crudUserDataMap[ctx.serviceName].itemsCreated = count - (res || 1);
            this.crudConfig.userService.unsecure_fastPatchOne(ctx?.user[this.crudConfig.id_field], {crudUserDataMap: ctx.user.crudUserDataMap}, ctx);
        }
        return res;
    }

    async _patchOne(query: T, newEntity: T, ctx: CrudContext) {
        return this.crudService.patchOne(query[this.crudConfig.id_field], newEntity, ctx);
    }

    async _patch(query: T, newEntity: T, ctx: CrudContext) {
        return this.crudService.patch(query, newEntity, ctx);
    }

    async _putOne(newEntity: T, ctx: CrudContext) {
        return this.crudService.putOne(newEntity, ctx);
    }

    plainToInstanceNoDefaultValues(plain: any, cls)
    {
        //https://github.com/typestack/class-transformer/issues/1429
        const executor = new TransformOperationExecutor(TransformationType.PLAIN_TO_CLASS, {
            ...defaultOptions,
            ... { exposeDefaultValues: false},
          });
          return executor.transform({}, plain, cls, undefined, undefined, undefined);
    }

    plainToInstanceWithDefaultValues(plain: any, cls)
    {
        return dontuseme(cls, plain, { exposeDefaultValues: true});
    }

    @Get('auth')
    async getConnectedUser(@Context() ctx: CrudContext) {
        return ctx.user;
    }

    @Post('auth')
    async login(@Query() query: CrudQuery, @Body() data, @Context() ctx: CrudContext) {
        data = this.plainToInstanceNoDefaultValues(data, LoginDto);
        await this.validateOrReject(data, false, 'Data:');

        if(data.password?.length > this.crudConfig.authenticationOptions.PASSWORD_MAX_LENGTH){
            throw new UnauthorizedException(CrudErrors.PASSWORD_TOO_LONG.str());
        }

        return this.crudAuthService.signIn(data.email, data.password, data.twoFA_code);
    }

}

export class LoginDto {
    @IsString()
    email: string;

    @IsString()
    password: string;

    @IsOptional()
    @IsString()
    twoFA_code: string;
}
