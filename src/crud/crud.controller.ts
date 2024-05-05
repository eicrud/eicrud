import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Inject, Patch, Post, Put, Query, UnauthorizedException, ValidationPipe, forwardRef } from '@nestjs/common';
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
export class CrudController {

    crudMap: Record<string, CrudService<any>>;


    NON_ADMIN_LIMIT_QUERY = 40;
    ADMIN_LIMIT_QUERY = 400;

    NON_ADMIN_LIMIT_QUERY_IDS = 4000;
    ADMIN_LIMIT_QUERY_IDS = 8000;

    MAX_GET_IN = 250;


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

    assignContext(method: string, crudQuery: CrudQuery, query: any, data: any, type, ctx: CrudContext): CrudService<any> {
        const currentService: CrudService<any> = this.crudMap[crudQuery?.service];
        ctx.method = method
        ctx.serviceName = crudQuery.service
        ctx.query = query;
        ctx.data = data;
        ctx.options = crudQuery.options;
        ctx.security = currentService?.security;
        ctx.origin = type;
        if (ctx.origin == 'cmd') {
            ctx.cmdName = crudQuery.cmd;
        }
        return currentService;
    }



    async beforeHooks(service: CrudService<any>, ctx: CrudContext) {
        await service.beforeControllerHook(ctx);
        await this.crudConfig.beforeAllHook(ctx);
    }

    async afterHooks(service: CrudService<any>, res, ctx: CrudContext) {
        await service.afterControllerHook(res, ctx);
        await this.crudConfig.afterAllHook(ctx, res);
    }
    async errorHooks(service: CrudService<any>, e: Error, ctx: CrudContext) {
        await service.errorControllerHook(e, ctx);
        await this.crudConfig.errorAllHook(e, ctx);
        const notGuest = this.crudConfig.userService.notGuest(ctx?.user);
        if (notGuest) {
            if (e instanceof ForbiddenException) {
                this.crudConfig.userService.unsecure_fastPatchOne(ctx.user[this.crudConfig.id_field], { incidentCount: ctx.user.incidentCount + 1 }, ctx);
            } else {
                this.crudConfig.userService.unsecure_fastPatchOne(ctx.user[this.crudConfig.id_field], { errorCount: ctx.user.errorCount + 1 }, ctx);
            }
            this.crudConfig.userService.setCached(ctx.user);
        }
        throw e;
    }



    async subCreate(query: CrudQuery, newEntity: any, ctx: CrudContext, currentService = undefined) {
        const service = currentService || await this.assignContext('POST', query, newEntity, newEntity, 'crud', ctx);

        await this.validate(ctx, service);
        await this.crudAuthorization.authorize(ctx);
        await this.beforeHooks(service, ctx);

        const res = await service.create(newEntity, ctx);

        await this.afterHooks(service, res, ctx);

        this.addCountToDataMap(ctx, 1);

        return res;

    }

    checkServiceNotFound(currentService, crudQuery) {
        if (!currentService) {
            throw new BadRequestException("Service not found: " + crudQuery.service);
        }
    }

    @Post('one')
    async _create(@Query() query: CrudQuery, @Body() newEntity: T, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('POST', query, newEntity, newEntity, 'crud', ctx);
        try {
            this.checkServiceNotFound(currentService, query);
            return await this.subCreate(query, newEntity, ctx, currentService);

        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    @Post('batch')
    async _batchCreate(@Query() query: CrudQuery, @Body() newEntities: T[], @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('POST', query, null, null, 'crud', ctx);
        ctx.isBatch = true;
        try {
            this.checkServiceNotFound(currentService, query);
            await this.crudAuthorization.authorizeBatch(ctx, newEntities.length);
            ctx.noFlush = true;
            const results = [];
            for (const entity of newEntities) {
                results.push(await this.subCreate(query, entity, ctx));
            }
            ctx.noFlush = false;
            await ctx.em.flush();
            this.crudConfig.userService.setCached(ctx.user);
            return results;

        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    @Post('cmd')
    async _secureCMD(@Query() query: CrudQuery, @Body() data, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('POST', query, data, data, 'cmd', ctx);
        try {
            await this.performValidationAuthorizationAndHooks(ctx, currentService);
            const res = await currentService.cmdHandler(query.cmd, ctx);
            await this.afterHooks(currentService, res, ctx);
            return res;
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    @Patch('cmd')
    async _unsecureCMD(@Query() query: CrudQuery, @Body() data, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('PATCH', query, data, data, 'cmd', ctx);
        try {
            await this.performValidationAuthorizationAndHooks(ctx, currentService);
            const res = await currentService.cmdHandler(query.cmd, ctx);
            await this.afterHooks(currentService, res, ctx);
            return res;
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    @Get('many')
    async _find(@Query() query: CrudQuery, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('GET', query, query.query, null, 'crud', ctx);
        try {
            return await this.subFind(query, ctx, this.NON_ADMIN_LIMIT_QUERY, this.ADMIN_LIMIT_QUERY, currentService);
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    @Get('ids')
    async _findIds(@Query() query: CrudQuery, @Context() ctx: CrudContext) {
        query.options = query.options || {};
        query.options.fields = [this.crudConfig.id_field as any];
        const currentService = await this.assignContext('GET', query, query.query, null, 'crud', ctx);
        try {
            return await this.subFind(query, ctx, this.NON_ADMIN_LIMIT_QUERY_IDS, this.ADMIN_LIMIT_QUERY_IDS);
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    async subFind(query: CrudQuery, ctx: CrudContext, NON_ADMIN_LIMIT_QUERY, ADMIN_LIMIT_QUERY, currentService = undefined) {
        this.limitQuery(ctx, query, NON_ADMIN_LIMIT_QUERY, ADMIN_LIMIT_QUERY);
        await this.performValidationAuthorizationAndHooks(ctx, currentService);
        const res = await currentService.find(ctx.query, ctx);
        await this.afterHooks(currentService, res, ctx);
        return res;
    }



    @Get('in')
    async _findIn(@Query() query: CrudQuery, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('GET', query, query.query, null, 'crud', ctx);
        try{
            this.limitQuery(ctx, query, this.NON_ADMIN_LIMIT_QUERY, this.ADMIN_LIMIT_QUERY);
            const ids = query.query?.[this.crudConfig.id_field];
            if(!ids || !ids.length || ids.length > this.MAX_GET_IN){
                throw new BadRequestException(CrudErrors.IN_REQUIRED_LENGTH.str(this.MAX_GET_IN));
            }
            delete query.query[this.crudConfig.id_field];
            await this.performValidationAuthorizationAndHooks(ctx, currentService);
            const res = await currentService.findInMongo(ids, ctx.query, ctx);
            await this.afterHooks(currentService, res, ctx);
        }catch(e){
            await this.errorHooks(currentService, e, ctx);
        }

    }

    @Get('one')
    async _findOne(@Query() query: CrudQuery, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('GET', query, query.query, null, 'crud', ctx);
        try {
            await this.performValidationAuthorizationAndHooks(ctx, currentService);
            const res = await currentService.findOne(ctx.query, ctx);
            await this.afterHooks(currentService, res, ctx);
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    @Delete('one')
    async _delete(@Query() query: CrudQuery, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('DELETE', query, query.query, null, 'crud', ctx);
        try {
            await this.performValidationAuthorizationAndHooks(ctx, currentService);
            const res = await currentService.removeOne(ctx.query[this.crudConfig.id_field], ctx);
            await this.afterHooks(currentService, res, ctx);
            this.addCountToDataMap(ctx, -1);
            return res;
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    @Delete('many')
    async _deleteMany(@Query() query: CrudQuery, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('DELETE', query, query.query, null, 'crud', ctx);
        try {
            await this.performValidationAuthorizationAndHooks(ctx, currentService);
            const res = await currentService.remove(ctx.query, ctx);
            await this.afterHooks(currentService, res, ctx);
            this.addCountToDataMap(ctx, -res);
            return res;
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    @Patch('one')
    async _patchOne(@Query() query: CrudQuery, @Body() data, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('PATCH', query, query, data, 'crud', ctx);
        try {
            return await this.subPatchOne(query, query.query, data, ctx, currentService);
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    async subPatchOne(crudQuery: CrudQuery, query: T, data: T, ctx: CrudContext, service = undefined) {
        const currentService = service || await this.assignContext('PATCH', crudQuery, query, data, 'crud', ctx);
        await this.performValidationAuthorizationAndHooks(ctx, currentService);
        const res = await currentService.patchOne(ctx.query[this.crudConfig.id_field], ctx.data, ctx);
        await this.afterHooks(currentService, res, ctx);
        return res;
    }

    @Patch('in')
    async _patchIn(@Query() query: CrudQuery, @Body() data, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('PATCH', query, query.query, data, 'crud', ctx);
        try {
            this.limitQuery(ctx, query, this.NON_ADMIN_LIMIT_QUERY, this.ADMIN_LIMIT_QUERY);
            const ids = query.query?.[this.crudConfig.id_field];
            if (!ids || !ids.length || ids.length > this.MAX_GET_IN) {
                throw new BadRequestException(CrudErrors.IN_REQUIRED_LENGTH.str(this.MAX_GET_IN));
            }
            delete query.query[this.crudConfig.id_field];
            await this.performValidationAuthorizationAndHooks(ctx, currentService);
            const res = await currentService.patchInMongo(ids, ctx.query, ctx.data, ctx);
            await this.afterHooks(currentService, res, ctx);
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    @Patch('batch')
    async _batchPatch(@Query() query: CrudQuery, @Body() newEntities: T[], @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('PATCH', query, null, null, 'crud', ctx);
        ctx.isBatch = true;
        try {
            await this.crudAuthorization.authorizeBatch(ctx, query.query.length);
            ctx.noFlush = true;
            const results = [];
            for (let i = 0; i < query.query.length; i++) {
                results.push(await this.subPatchOne(query, query.query[0], newEntities[0], ctx));
            }
            ctx.noFlush = false;
            await ctx.em.flush();
            return results;
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }


    @Put('one')
    async _putOne(@Query() query: CrudQuery, @Body() data, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('PUT', query, query.query, data, 'crud', ctx);
        try {
            await this.subPutOne(query, query.query, data, ctx, currentService);
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    @Put('batch')
    async _batchPut(@Query() query: CrudQuery, @Body() newEntities: T[], @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('PUT', query, null, null, 'crud', ctx);
        ctx.isBatch = true;
        try {
            await this.crudAuthorization.authorizeBatch(ctx, query.query.length);
            ctx.noFlush = true;
            const results = [];
            for (let i = 0; i < query.query.length; i++) {
                results.push(await this.subPutOne(query, query.query[0], newEntities[0], ctx));
            }
            ctx.noFlush = false;
            await ctx.em.flush();
            return results;
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    async subPutOne(crudQuery: CrudQuery, query: T, data: T, ctx: CrudContext, service = undefined) {
        const currentService = service || await this.assignContext('PUT', crudQuery, query, data, 'crud', ctx);
        await this.performValidationAuthorizationAndHooks(ctx, currentService);
        const res = await currentService.putOne(data, ctx);
        await this.afterHooks(currentService, res, ctx);
        return res;
    }

    @Get('auth')
    async getConnectedUser(@Context() ctx: CrudContext) {
        return ctx.user;
    }

    @Post('auth')
    async login(@Query() query: CrudQuery, @Body() data, @Context() ctx: CrudContext) {
        data = this.plainToInstanceNoDefaultValues(data, LoginDto);
        await this.validateOrReject(data, false, 'Data:');

        if (data.password?.length > this.crudConfig.authenticationOptions.PASSWORD_MAX_LENGTH) {
            throw new UnauthorizedException(CrudErrors.PASSWORD_TOO_LONG.str());
        }

        return this.crudAuthService.signIn(data.email, data.password, data.twoFA_code);
    }

    async performValidationAuthorizationAndHooks(ctx: any, currentService: any) {
        await this.validate(ctx, currentService);
        await this.crudAuthorization.authorize(ctx);
        await this.beforeHooks(currentService, ctx);
    }

    async validate(ctx: CrudContext, currentService: CrudService<any>) {
        let queryClass = null;
        let dataClass = null;
        let dataDefaultValues = false;
        if (ctx.origin == 'crud') {
            if (ctx.method == 'POST') {
                dataClass = currentService.entity;
                dataDefaultValues = true;
            } else if (ctx.method == 'PUT') {
                dataClass = currentService.entity;
                queryClass = currentService.entity;
                dataDefaultValues = true;
            } else if (ctx.method == 'PATCH') {
                dataClass = currentService.entity;
                queryClass = currentService.entity;
            } else if (ctx.method == 'GET' || ctx.method == 'DELETE') {
                queryClass = currentService.entity;
            }
        } else if (ctx.origin == 'cmd') {
            const cmdSecurity: CmdSecurity = ctx.security?.cmdSecurityMap?.[ctx.cmdName];
            queryClass = null;
            if (cmdSecurity?.dto) {
                dataClass = cmdSecurity.dto;
            }
        }
        if (queryClass) {
            const obj = this.plainToInstanceNoDefaultValues(ctx.query, queryClass);
            await this.validateOrReject(obj, true, 'Query:');
        }
        if (dataClass) {
            ctx.data = dataDefaultValues ? this.plainToInstanceWithDefaultValues(ctx.data, dataClass) : this.plainToInstanceNoDefaultValues(ctx.data, dataClass);
            await this.validateOrReject(ctx.data, !dataDefaultValues, 'Data:');
        }

    }

    async validateOrReject(obj, skipMissingProperties, label) {
        try {
            await validateOrReject(obj, { skipMissingProperties: skipMissingProperties });
        } catch (errors) {
            const msg = label + ' ' + errors.toString();
            throw new BadRequestException(CrudErrors.VALIDATION_ERROR.str(msg));
        }
    }

    addCountToDataMap(ctx: CrudContext, ct: number) {
        if (this.crudConfig.userService.notGuest(ctx?.user)) {
            const count = ctx?.user.crudUserDataMap[ctx.serviceName].itemsCreated || 0;
            ctx.user.crudUserDataMap[ctx.serviceName].itemsCreated = count + ct;
            this.crudConfig.userService.unsecure_fastPatchOne(ctx?.user[this.crudConfig.id_field], { crudUserDataMap: ctx.user.crudUserDataMap }, ctx);
            if (!ctx.noFlush) {
                this.crudConfig.userService.setCached(ctx.user);
            }
        }
    }

    limitQuery(ctx: CrudContext, query: CrudQuery, nonAdmin, admin) {
        const isAdmin = this.crudAuthorization.getCtxUserRole(ctx)?.isAdminRole;
        const MAX_LIMIT_FIND = isAdmin ? admin : nonAdmin;
        if (!query.options?.limit || query.options?.limit > MAX_LIMIT_FIND) {
            query.options = query.options || {};
            query.options.limit = MAX_LIMIT_FIND;
        }
    }

    plainToInstanceNoDefaultValues(plain: any, cls) {
        //https://github.com/typestack/class-transformer/issues/1429
        const executor = new TransformOperationExecutor(TransformationType.PLAIN_TO_CLASS, {
            ...defaultOptions,
            ... { exposeDefaultValues: false },
        });
        return executor.transform({}, plain, cls, undefined, undefined, undefined);
    }

    plainToInstanceWithDefaultValues(plain: any, cls) {
        return dontuseme(cls, plain, { exposeDefaultValues: true });
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
