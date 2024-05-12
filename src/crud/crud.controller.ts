import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, HttpException, HttpStatus, Inject, Patch, Post, Put, Query, UnauthorizedException, ValidationPipe, forwardRef } from '@nestjs/common';
import { CrudEntity } from './model/CrudEntity';
import { CrudService } from './crud.service';
import { CrudContext } from './model/CrudContext';
import { Context } from '../authentification/auth.utils';
import { CrudQuery } from './model/CrudQuery';
import { CrudAuthorizationService } from './crud.authorization.service';
import { TransformOperationExecutor } from 'class-transformer/cjs/TransformOperationExecutor';
import { defaultOptions } from 'class-transformer/cjs/constants/default-options.constant';
import { IsEmail, IsOptional, IsString, MaxLength, validateOrReject } from 'class-validator';
import { CRUD_CONFIG_KEY, CrudConfigService } from './crud.config.service';
import { CmdSecurity } from './model/CrudSecurity';
import { CrudErrors } from './model/CrudErrors';
import { CrudAuthService } from '../authentification/auth.service';
import { CrudOptions } from './model/CrudOptions';
import { ModuleRef } from '@nestjs/core';
import { ICrudRightsFieldInfo, ICrudRightsInfo, LoginDto, LoginResponseDto } from './model/dtos';
import { ObjectId } from '@mikro-orm/mongodb';
import { LRUCache } from 'mnemonist';
import { _utils } from '../utils';
import { CrudTransformer, IFieldMetadata } from './transform/CrudTransformer';

export class LimitOptions {
    NON_ADMIN_LIMIT_QUERY = 40;
    ADMIN_LIMIT_QUERY = 400;

    NON_ADMIN_LIMIT_QUERY_IDS = 4000;
    ADMIN_LIMIT_QUERY_IDS = 8000;

    MAX_GET_IN = 250;
}

@Controller({
    path: "crud",
    version: "1"
})
export class CrudController {

    userLastLoginAttemptMap: LRUCache<string, Date>;

    protected crudConfig: CrudConfigService;
    constructor(
        private crudAuthService: CrudAuthService,
        public crudAuthorization: CrudAuthorizationService,
        protected moduleRef: ModuleRef,
    ) {

    }

    onModuleInit() {
        this.crudConfig = this.moduleRef.get(CRUD_CONFIG_KEY, { strict: false })

        this.userLastLoginAttemptMap = new LRUCache(this.crudConfig.watchTrafficOptions.MAX_TRACKED_USERS / 2);
    }

    assignContext(method: string, crudQuery: CrudQuery, query: any, data: any, type, ctx: CrudContext): CrudService<any> {

        // if(method === 'PATCH' && type === 'crud'){
        //     if(!query && data?.[this.crudConfig.id_field]){
        //         query = { [this.crudConfig.id_field]: data[this.crudConfig.id_field] };
        //     }
        //     delete data?.[this.crudConfig.id_field];
        // }

        const currentService: CrudService<any> = this.crudConfig.servicesMap[crudQuery?.service];
        this.checkServiceNotFound(currentService, query);
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
        //await service.beforeControllerHook(ctx);
        await this.crudConfig.beforeAllHook(ctx);
    }

    async afterHooks(service: CrudService<any>, res, ctx: CrudContext) {
        //await service.afterControllerHook(res, ctx);
        await this.crudConfig.afterAllHook(ctx, res);
    }
    async errorHooks(service: CrudService<any>, e: Error, ctx: CrudContext) {
        //await service.errorControllerHook(e, ctx);
        await this.crudConfig.errorAllHook(e, ctx);
        const notGuest = this.crudConfig.userService.notGuest(ctx?.user);
        if (notGuest) {
            let patch;
            if (e instanceof ForbiddenException) {
                patch = { incidentCount: ctx.user.incidentCount + 1 };
                this.crudConfig.userService.$unsecure_fastPatchOne(ctx.user[this.crudConfig.id_field], patch, ctx);
            } else {
                patch = { errorCount: ctx.user.errorCount + 1 };
                this.crudConfig.userService.$unsecure_fastPatchOne(ctx.user[this.crudConfig.id_field], patch, ctx);
            }
            ctx.user = {
                ...ctx.user,
                ...patch
            };
            this.crudConfig.userService.$setCached(ctx.user, ctx);
        }
        throw e;
    }

    checkServiceNotFound(currentService, crudQuery) {
        if (!currentService) {
            throw new BadRequestException("Service not found: " + crudQuery.service);
        }
    }

    @Post('one')
    async _create(@Query(new ValidationPipe({ transform: true })) query: CrudQuery, @Body() newEntity: any, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('POST', query, newEntity, newEntity, 'crud', ctx);
        try {

            await this.performValidationAuthorizationAndHooks(ctx, currentService);

            const res = await currentService.$create(newEntity, ctx);

            await this.afterHooks(currentService, res, ctx);

            this.addCountToDataMap(ctx, 1);

            return res;
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    @Post('batch')
    async _batchCreate(@Query(new ValidationPipe({ transform: true, expectedType: CrudQuery })) query: CrudQuery, @Body() newEntities: any[], @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('POST', query, null, newEntities, 'crud', ctx);
        ctx.isBatch = true;
        try {
            await this.crudAuthorization.authorizeBatch(ctx, newEntities?.length);

            for (const entity of newEntities) {
                await this.assignContext('POST', query, entity, entity, 'crud', ctx);
                await this.performValidationAuthorizationAndHooks(ctx, currentService, true);
            }

            await this.assignContext('POST', query, null, newEntities, 'crud', ctx);
            await this.beforeHooks(currentService, ctx);
            const results = await currentService.$createBatch(newEntities, ctx);
            await this.afterHooks(currentService, results, ctx);

            this.addCountToDataMap(ctx, newEntities.length);
            this.crudConfig.userService.$setCached(ctx.user, ctx);

            return results;

        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    @Post('cmd')
    async _secureCMD(@Query(new ValidationPipe({ transform: true })) query: CrudQuery, @Body() data, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('POST', query, data, data, 'cmd', ctx);
        try {
            await this.performValidationAuthorizationAndHooks(ctx, currentService);
            const res = await currentService.$cmdHandler(query.cmd, ctx);
            await this.afterHooks(currentService, res, ctx);
            return res;
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    @Patch('cmd')
    async _unsecureCMD(@Query(new ValidationPipe({ transform: true })) query: CrudQuery, @Body() data, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('PATCH', query, data, data, 'cmd', ctx);
        try {
            await this.performValidationAuthorizationAndHooks(ctx, currentService);
            const res = await currentService.$cmdHandler(query.cmd, ctx);
            await this.afterHooks(currentService, res, ctx);
            return res;
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    @Get('many')
    async _find(@Query(new ValidationPipe({ transform: true })) query: CrudQuery, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('GET', query, query.query, null, 'crud', ctx);
        try {
            return await this.subFind(query, ctx, this.crudConfig.limitOptions.NON_ADMIN_LIMIT_QUERY, this.crudConfig.limitOptions.ADMIN_LIMIT_QUERY, currentService);
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    @Get('ids')
    async _findIds(@Query(new ValidationPipe({ transform: true })) query: CrudQuery, @Context() ctx: CrudContext) {
        query.options = query.options || {};
        query.options.fields = [this.crudConfig.id_field as any];
        const currentService = await this.assignContext('GET', query, query.query, null, 'crud', ctx);
        try {
            return await this.subFind(query, ctx, this.crudConfig.limitOptions.NON_ADMIN_LIMIT_QUERY_IDS, this.crudConfig.limitOptions.ADMIN_LIMIT_QUERY_IDS);
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    async subFind(query: CrudQuery, ctx: CrudContext, NON_ADMIN_LIMIT_QUERY, ADMIN_LIMIT_QUERY, currentService = undefined) {
        this.limitQuery(ctx, NON_ADMIN_LIMIT_QUERY, ADMIN_LIMIT_QUERY);
        await this.performValidationAuthorizationAndHooks(ctx, currentService);
        const res = await currentService.find(ctx.query, ctx);
        await this.afterHooks(currentService, res, ctx);
        return res;
    }



    @Get('in')
    async _findIn(@Query(new ValidationPipe({ transform: true })) query: CrudQuery, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('GET', query, query.query, null, 'crud', ctx);
        try {
            this.limitQuery(ctx, this.crudConfig.limitOptions.NON_ADMIN_LIMIT_QUERY, this.crudConfig.limitOptions.ADMIN_LIMIT_QUERY);
            const ids = ctx.query?.[this.crudConfig.id_field];
            if (!ids || !ids.length || ids.length > this.crudConfig.limitOptions.MAX_GET_IN) {
                throw new BadRequestException(CrudErrors.IN_REQUIRED_LENGTH.str(this.crudConfig.limitOptions.MAX_GET_IN));
            }
            ctx.ids = ids;
            delete ctx.query[this.crudConfig.id_field];
            await this.performValidationAuthorizationAndHooks(ctx, currentService);
            const res = await currentService.$findIn(ids, ctx.query, ctx);
            await this.afterHooks(currentService, res, ctx);
            return res;
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }

    }

    @Get('one')
    async _findOne(@Query(new ValidationPipe({ transform: true })) query: CrudQuery, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('GET', query, query.query, null, 'crud', ctx);
        try {
            await this.performValidationAuthorizationAndHooks(ctx, currentService);
            const res = await currentService.$findOne(ctx.query, ctx);
            await this.afterHooks(currentService, res, ctx);
            return res;
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    @Delete('one')
    async _delete(@Query(new ValidationPipe({ transform: true })) query: CrudQuery, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('DELETE', query, query.query, null, 'crud', ctx);
        try {
            await this.performValidationAuthorizationAndHooks(ctx, currentService);
            await currentService.$removeOne(ctx.query, ctx);
            await this.afterHooks(currentService, 1, ctx);
            this.addCountToDataMap(ctx, -1);
            return 1;
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    @Delete('many')
    async _deleteMany(@Query(new ValidationPipe({ transform: true })) query: CrudQuery, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('DELETE', query, query.query, null, 'crud', ctx);
        try {
            await this.performValidationAuthorizationAndHooks(ctx, currentService);
            const res = await currentService.$remove(ctx.query, ctx);
            await this.afterHooks(currentService, res, ctx);
            this.addCountToDataMap(ctx, -res);
            return res;
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    @Delete('in')
    async _deleteIn(@Query(new ValidationPipe({ transform: true })) query: CrudQuery, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('DELETE', query, query.query, null, 'crud', ctx);
        try {
            this.limitQuery(ctx, this.crudConfig.limitOptions.NON_ADMIN_LIMIT_QUERY, this.crudConfig.limitOptions.ADMIN_LIMIT_QUERY);
            const ids = ctx.query?.[this.crudConfig.id_field];
            if (!ids || !ids.length || ids.length > this.crudConfig.limitOptions.MAX_GET_IN) {
                throw new BadRequestException(CrudErrors.IN_REQUIRED_LENGTH.str(this.crudConfig.limitOptions.MAX_GET_IN));
            }
            ctx.ids = ids;
            delete ctx.query[this.crudConfig.id_field];
            await this.performValidationAuthorizationAndHooks(ctx, currentService);
            const res = await currentService.$removeIn(ids, ctx.query, ctx);
            await this.afterHooks(currentService, res, ctx);
            this.addCountToDataMap(ctx, -res);
            return res;
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    @Patch('one')
    async _patchOne(@Query(new ValidationPipe({ transform: true })) query: CrudQuery, @Body() data, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('PATCH', query, query.query, data, 'crud', ctx);
        if(!query.query || !data){
            throw new BadRequestException("Query and data are required for PATCH one.");
        }
        try {
            await this.performValidationAuthorizationAndHooks(ctx, currentService);
            const res = await currentService.$patchOne(ctx.query, ctx.data, ctx);
            await this.afterHooks(currentService, res, ctx);
            return res;
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }



    @Patch('in')
    async _patchIn(@Query(new ValidationPipe({ transform: true })) query: CrudQuery, @Body() data, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('PATCH', query, query.query, data, 'crud', ctx);
        try {
            this.limitQuery(ctx, this.crudConfig.limitOptions.NON_ADMIN_LIMIT_QUERY, this.crudConfig.limitOptions.ADMIN_LIMIT_QUERY);
            const ids = ctx.query?.[this.crudConfig.id_field];
            if (!ids || !ids.length || ids.length > this.crudConfig.limitOptions.MAX_GET_IN) {
                throw new BadRequestException(CrudErrors.IN_REQUIRED_LENGTH.str(this.crudConfig.limitOptions.MAX_GET_IN));
            }
            ctx.ids = ids;
            delete ctx.query[this.crudConfig.id_field];
            await this.performValidationAuthorizationAndHooks(ctx, currentService);
            const res = await currentService.$patchIn(ids, ctx.query, ctx.data, ctx);
            await this.afterHooks(currentService, res, ctx);
            return res;
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    @Patch('many')
    async _patchMany(@Query(new ValidationPipe({ transform: true })) query: CrudQuery, @Body() data, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('PATCH', query, query.query, data, 'crud', ctx);
        try {
            await this.performValidationAuthorizationAndHooks(ctx, currentService);
            const res = await currentService.$patch(ctx.query, ctx.data, ctx);
            await this.afterHooks(currentService, res, ctx);
            return res;
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    @Patch('batch')
    async _batchPatch(@Query(new ValidationPipe({ transform: true })) query: CrudQuery, @Body() data: any[], @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('PATCH', query, null, null, 'crud', ctx);
        ctx.isBatch = true;
        try {
            await this.crudAuthorization.authorizeBatch(ctx, data?.length);

            for (const d of data) {
                await this.assignContext('PATCH', query, d.query, d.data, 'crud', ctx);
                await this.performValidationAuthorizationAndHooks(ctx, currentService, true);
            }

            await this.assignContext('PATCH', query, null, data, 'crud', ctx);
            await this.beforeHooks(currentService, ctx);
            const results = await currentService.$patchBatch(data, ctx);
            await this.afterHooks(currentService, results, ctx);

            return results;
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    reciprocal20percent = 1/20;

    @Get('auth')
    async getConnectedUser(@Context() ctx: CrudContext) {
        const ret: any = { userId: ctx.user[this.crudConfig.id_field] };
        if(this.crudConfig.authenticationOptions.renewJwt){
            const totalSec = (ctx.jwtPayload.exp - ctx.jwtPayload.iat);
            const elapsedMs = new Date().getTime() - (ctx.jwtPayload.iat * 1000);
            const thresholdMs = (totalSec * 1000 * this.reciprocal20percent); // 20% of total time
            if(elapsedMs >= thresholdMs){
                const newToken = await this.crudAuthService.signTokenForUser(ctx.user, totalSec);
                ret.accessToken = newToken;
            }
        }
        return ret as LoginResponseDto;
    }

    ALLOWED_EXPIRES_IN = ['15m', '30m', '1h', '2h', '6h', '12h', '1d', '2d', '4d', '5d', '6d', '7d', '14d', '30d'];

    @Post('auth')
    async login(@Body(new ValidationPipe({ transform: true })) data: LoginDto, @Context() ctx: CrudContext) {

        const lastLogingAttempt: Date = this.userLastLoginAttemptMap.get(data.email);
        const now = new Date();
        if (lastLogingAttempt && _utils.diffBetweenDatesMs(now, lastLogingAttempt) < 600) {
            throw new HttpException({
                statusCode: 425,
                error: 'Too early',
                message: CrudErrors.TOO_MANY_LOGIN_ATTEMPTS.str(),
            }, 425);
        }

        this.userLastLoginAttemptMap.set(data.email, now);

        if (data.expiresIn && !this.ALLOWED_EXPIRES_IN.includes(data.expiresIn)) {
            throw new BadRequestException("Invalid expiresIn: " + data.expiresIn + " allowed: " + this.ALLOWED_EXPIRES_IN.join(', '));
        }

        if (data.password?.length > this.crudConfig.authenticationOptions.PASSWORD_MAX_LENGTH) {
            throw new UnauthorizedException(CrudErrors.PASSWORD_TOO_LONG.str());
        }

        return this.crudAuthService.signIn(ctx, data.email, data.password, data.expiresIn, data.twoFA_code);
    }

    @Get('rights')
    async getRights(@Query(new ValidationPipe({ transform: true })) query: CrudQuery, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('GET', query, null, null, 'crud', ctx);
        let trust = await this.crudConfig.userService.$getOrComputeTrust(ctx.user, ctx);
        if (trust < 0) {
            trust = 0;
        }
        if (!currentService) {
            throw new BadRequestException("Service not found: " + query.service);
        }
        const ret: ICrudRightsInfo = {
            maxItemsPerUser: await this.crudAuthorization.computeMaxItemsPerUser(ctx),
            usersItemsInDb: ctx.user?.crudUserDataMap?.[ctx.serviceName]?.itemsCreated || 0,
            fields: {}
        }
        const cls = currentService.entity;
        ret.fields = await this.recursiveGetRightsType(cls, {}, trust);

        return ret;
    }

    async recursiveGetRightsType(cls: any, ret: Record<string, ICrudRightsFieldInfo>, trust: number) {
        const classKey = CrudTransformer.subGetClassKey(cls);
        const metadata = CrudTransformer.getCrudMetadataMap()[classKey];
        if (!metadata) return ret;

        for (const key in metadata) {
            const field_metadata = metadata[key];
            const subRet: ICrudRightsFieldInfo = {};
            const subType = field_metadata?.type;
            if (subType) {
                if (Array.isArray(subType)) {
                    subRet.maxLength = field_metadata?.maxLength || this.crudConfig.validationOptions.DEFAULT_MAX_LENGTH;
                    if (field_metadata?.addMaxLengthPerTrustPoint) {
                        subRet.maxLength += trust * field_metadata.addMaxLengthPerTrustPoint;
                    }
                }
                const subCls = subType.class;
                subRet.type = await this.recursiveGetRightsType(subCls, {}, trust);
            }else{
                subRet.maxSize = field_metadata?.maxSize || this.crudConfig.validationOptions.DEFAULT_MAX_SIZE;
                if (field_metadata?.addMaxSizePerTrustPoint) {
                    subRet.maxSize += trust * field_metadata.addMaxSizePerTrustPoint;
                }
            }
            ret[key] = subRet;
        }

        return ret;
    }

    async performValidationAuthorizationAndHooks(ctx: CrudContext, currentService: any, skipBeforeHooks = false) {
        await this.validate(ctx, currentService);
        await this.crudAuthorization.authorize(ctx);
        if (!skipBeforeHooks) {
            await this.beforeHooks(currentService, ctx);
        }
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
            if(!cmdSecurity?.dto){
                throw new Error("dto missing for cmd: " + ctx.cmdName);
            }
            dataClass = cmdSecurity.dto;
        }
        const crudTransformer = new CrudTransformer(this.crudConfig, ctx);
        if (queryClass) {
            await crudTransformer.transform(this.crudConfig, ctx.query, queryClass);
            const newObj = { ...ctx.query };
            await crudTransformer.transformTypes(this.crudConfig, newObj, queryClass);
            Object.setPrototypeOf(newObj, queryClass.prototype);
            await this.validateOrReject(newObj, true, 'Query:');
        }
        if (dataClass) {
            await crudTransformer.transform(ctx.data, dataClass, false, true);
            const newObj = { ...ctx.data };
            await crudTransformer.transformTypes(newObj, dataClass);
            Object.setPrototypeOf(newObj, dataClass.prototype);
            await this.validateOrReject(newObj, !dataDefaultValues, 'Data:');
        }

    }

    async validateOrReject(obj, skipMissingProperties, label) {
        try {
            await validateOrReject(obj, {
                stopAtFirstError: true,
                skipMissingProperties,
            });
        } catch (errors) {
            const msg = label + ' ' + errors.toString();
            throw new BadRequestException("Validation error " + msg);
        }
    }

    addCountToDataMap(ctx: CrudContext, ct: number) {
        if (this.crudConfig.userService.notGuest(ctx?.user)) {
            ctx.user.crudUserDataMap[ctx.serviceName] = ctx?.user.crudUserDataMap[ctx.serviceName] || {} as any;
            const count = ctx.user.crudUserDataMap[ctx.serviceName].itemsCreated || 0;
            ctx.user.crudUserDataMap[ctx.serviceName].itemsCreated = count + ct;
            this.crudConfig.userService.$unsecure_fastPatchOne(ctx?.user[this.crudConfig.id_field], { crudUserDataMap: ctx.user.crudUserDataMap }, ctx);
            if (!ctx.noFlush) {
                this.crudConfig.userService.$setCached(ctx.user, ctx);
            }
        }
    }

    limitQuery(ctx: CrudContext, nonAdmin, admin) {
        const isAdmin = this.crudAuthorization.getCtxUserRole(ctx)?.isAdminRole;
        const MAX_LIMIT_FIND = isAdmin ? admin : nonAdmin;
        if (!ctx.options?.limit || ctx.options?.limit > MAX_LIMIT_FIND) {
            ctx.options = ctx.options || {};
            ctx.options.limit = MAX_LIMIT_FIND;
        }
    }


}
