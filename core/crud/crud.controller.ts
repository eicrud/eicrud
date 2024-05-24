import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, HttpException, HttpStatus, Inject, Patch, Post, Put, Query, UnauthorizedException, forwardRef } from '@nestjs/common';
import { CrudEntity } from './model/CrudEntity';
import { CrudService } from './crud.service';
import { CrudContext } from './model/CrudContext';
import { Context } from '../authentification/auth.utils';
import { BackdoorQuery, CrudQuery } from '../../shared/CrudQuery';
import { CrudAuthorizationService } from './crud.authorization.service';
import { setImmediate } from "timers/promises";

import { CRUD_CONFIG_KEY, CrudConfigService, MicroServicesOptions } from './crud.config.service';
import { CmdSecurity } from './model/CrudSecurity';
import { CrudErrors } from '../../shared/CrudErrors';
import { CrudAuthService } from '../authentification/auth.service';
import { CrudOptions } from '../../shared/CrudOptions';
import { ModuleRef } from '@nestjs/core';
import { ICrudRightsFieldInfo, ICrudRightsInfo, LoginDto, LoginResponseDto } from '../../shared/dtos';
import { ObjectId } from '@mikro-orm/mongodb';
import { LRUCache } from 'mnemonist';
import { _utils } from '../utils';
import { CrudTransformer, IFieldMetadata } from './transform/CrudTransformer';
import { CrudValidationPipe } from './transform/CrudValidationPipe';
import { FindResponseDto } from '../../shared/FindResponseDto';
import { CrudRole } from './model/CrudRole';

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

    public crudConfig: CrudConfigService;
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
        this.checkServiceNotFound(currentService, crudQuery);
        ctx.method = method
        ctx.serviceName = crudQuery.service
        ctx.query = query;
        ctx.data = data;
        ctx.options = crudQuery.options;
        ctx.origin = type;

        if (ctx.origin == 'cmd') {
            ctx.cmdName = crudQuery.cmd;
        }
        return currentService;
    }



    async beforeHooks(service: CrudService<any>, ctx: CrudContext) {
        //await service.beforeControllerHook(ctx);
        await this.crudConfig.beforeCrudHook(ctx);
    }

    async afterHooks(service: CrudService<any>, res, ctx: CrudContext) {
        //await service.afterControllerHook(res, ctx);
        await this.crudConfig.afterCrudHook(ctx, res);
    }
    async errorHooks(service: CrudService<any>, e: Error | any, ctx: CrudContext) {
        //await service.errorControllerHook(e, ctx);
        await this.crudConfig.errorCrudHook(e, ctx);
        const notGuest = this.crudConfig.userService.notGuest(ctx?.user);
        if (notGuest) {
            let patch;
            if (e instanceof ForbiddenException || e.status == HttpStatus.FORBIDDEN) {
                patch = { incidentCount: ctx.user.incidentCount + 1 };
                const inc = { incidentCount: 1 };
                this.crudConfig.userService.$unsecure_incPatch({ query: { [this.crudConfig.id_field]: ctx.user[this.crudConfig.id_field] }, increments: inc }, ctx);
            } else {
                patch = { errorCount: ctx.user.errorCount + 1 };
                const inc = { errorCount: 1 };
                this.crudConfig.userService.$unsecure_incPatch({ query: { [this.crudConfig.id_field]: ctx.user[this.crudConfig.id_field] }, increments: inc }, ctx);
            }
            ctx.user = {
                ...ctx.user,
                ...patch
            };
            this.crudConfig.userService.$setCached(ctx.user, ctx);
        }
        throw e;
    }

    checkServiceNotFound(currentService, crudQuery: CrudQuery) {
        if (!currentService) {
            throw new BadRequestException("Service not found: " + crudQuery.service);
        }
    }

    @Post('one')
    async _create(@Query(new CrudValidationPipe()) query: CrudQuery, @Body() newEntity: any, @Context() ctx: CrudContext) {
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
    async _batchCreate(@Query(new CrudValidationPipe()) query: CrudQuery, @Body() newEntities: any[], @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('POST', query, null, newEntities, 'crud', ctx);
        ctx.isBatch = true;
        try {
            await this.crudAuthorization.authorizeBatch(ctx, newEntities?.length, currentService.security);

            for (let i = 0; i < newEntities.length; i++) {
                await this.assignContext('POST', query, newEntities[i], newEntities[i], 'crud', ctx);
                await this.performValidationAuthorizationAndHooks(ctx, currentService, true);
                if(i % this.crudConfig.validationOptions.BATCH_VALIDATION_YIELD_RATE === 0){
                    await setImmediate(); // allow other requests to be processed
                }
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
    async _secureCMD(@Query(new CrudValidationPipe()) query: CrudQuery, @Body() data, @Context() ctx: CrudContext) {
        return this.subCMD(query, data, ctx, 'POST');
    }

    @Patch('cmd')
    async _unsecureCMD(@Query(new CrudValidationPipe()) query: CrudQuery, @Body() data, @Context() ctx: CrudContext) {
        return this.subCMD(query, data, ctx, 'PATCH');
    }


    async subCMD(query: CrudQuery,data, ctx: CrudContext, METHOD: string) {
            const currentService = await this.assignContext(METHOD, query, data, data, 'cmd', ctx);
            try {
                const cmdSecurity: CmdSecurity = currentService.security?.cmdSecurityMap?.[ctx.cmdName];
                this.limitQuery(ctx, cmdSecurity?.NON_ADMIN_LIMIT_QUERY || this.crudConfig.limitOptions.NON_ADMIN_LIMIT_QUERY, cmdSecurity?.ADMIN_LIMIT_QUERY || this.crudConfig.limitOptions.ADMIN_LIMIT_QUERY);
                await this.performValidationAuthorizationAndHooks(ctx, currentService);
                const res = await currentService.$cmdHandler(query.cmd, ctx);
                this.addCountToCmdMap(ctx, 1);
                await this.afterHooks(currentService, res, ctx);
                return res;
            } catch (e) {
                await this.errorHooks(currentService, e, ctx);
            }
    }

    @Get('many')
    async _find(@Query(new CrudValidationPipe()) query: CrudQuery, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('GET', query, query.query, null, 'crud', ctx);
        try {
            return await this.subFind(query, ctx, this.crudConfig.limitOptions.NON_ADMIN_LIMIT_QUERY, this.crudConfig.limitOptions.ADMIN_LIMIT_QUERY, currentService);
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    @Get('ids')
    async _findIds(@Query(new CrudValidationPipe()) query: CrudQuery, @Context() ctx: CrudContext) {
        query.options = query.options || {};
        query.options.fields = [this.crudConfig.id_field as any];
        const currentService = await this.assignContext('GET', query, query.query, null, 'crud', ctx);
        try {
            const res: FindResponseDto<any> = await this.subFind(query, ctx, this.crudConfig.limitOptions.NON_ADMIN_LIMIT_QUERY_IDS, this.crudConfig.limitOptions.ADMIN_LIMIT_QUERY_IDS, currentService);
            res.data = res.data.map(d => d[this.crudConfig.id_field]);
            return res;
        } catch (e) {
            await this.errorHooks(currentService, e, ctx);
        }
    }

    async subFind(query: CrudQuery, ctx: CrudContext, NON_ADMIN_LIMIT_QUERY, ADMIN_LIMIT_QUERY, currentService: CrudService<any> = undefined) {
        this.limitQuery(ctx, NON_ADMIN_LIMIT_QUERY, ADMIN_LIMIT_QUERY);
        await this.performValidationAuthorizationAndHooks(ctx, currentService);
        const res = await currentService.$find(ctx.query, ctx);
        await this.afterHooks(currentService, res, ctx);
        return res;
    }



    @Get('in')
    async _findIn(@Query(new CrudValidationPipe()) query: CrudQuery, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('GET', query, query.query, null, 'crud', ctx);
        try {
            this.limitQuery(ctx, this.crudConfig.limitOptions.NON_ADMIN_LIMIT_QUERY, this.crudConfig.limitOptions.ADMIN_LIMIT_QUERY);
            const ids = ctx.query?.[this.crudConfig.id_field];
            if (!ids || !ids.length || ids.length > this.crudConfig.limitOptions.MAX_GET_IN) {
                throw new BadRequestException(CrudErrors.IN_REQUIRED_LENGTH.str({ maxBatchSize: this.crudConfig.limitOptions.MAX_GET_IN, idsLength: ids.length}));
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
    async _findOne(@Query(new CrudValidationPipe()) query: CrudQuery, @Context() ctx: CrudContext) {
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
    async _delete(@Query(new CrudValidationPipe()) query: CrudQuery, @Context() ctx: CrudContext) {
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
    async _deleteMany(@Query(new CrudValidationPipe()) query: CrudQuery, @Context() ctx: CrudContext) {
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
    async _deleteIn(@Query(new CrudValidationPipe()) query: CrudQuery, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('DELETE', query, query.query, null, 'crud', ctx);
        try {
            const ids = ctx.query?.[this.crudConfig.id_field];
            if (!ids || !ids.length || ids.length > this.crudConfig.limitOptions.MAX_GET_IN) {
                throw new BadRequestException(CrudErrors.IN_REQUIRED_LENGTH.str({ maxBatchSize: this.crudConfig.limitOptions.MAX_GET_IN, idsLength: ids.length}));
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
    async _patchOne(@Query(new CrudValidationPipe()) query: CrudQuery, @Body() data, @Context() ctx: CrudContext) {
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
    async _patchIn(@Query(new CrudValidationPipe()) query: CrudQuery, @Body() data, @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('PATCH', query, query.query, data, 'crud', ctx);
        try {
            const ids = ctx.query?.[this.crudConfig.id_field];
            if (!ids || !ids.length || ids.length > this.crudConfig.limitOptions.MAX_GET_IN) {
                throw new BadRequestException(CrudErrors.IN_REQUIRED_LENGTH.str({ maxBatchSize: this.crudConfig.limitOptions.MAX_GET_IN, idsLength: ids.length}));
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
    async _patchMany(@Query(new CrudValidationPipe()) query: CrudQuery, @Body() data, @Context() ctx: CrudContext) {
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
    async _batchPatch(@Query(new CrudValidationPipe()) query: CrudQuery, @Body() data: any[], @Context() ctx: CrudContext) {
        const currentService = await this.assignContext('PATCH', query, null, null, 'crud', ctx);
        ctx.isBatch = true;
        try {
            await this.crudAuthorization.authorizeBatch(ctx, data?.length, currentService.security);

            for (let i = 0; i < data.length; i++) {
                await this.assignContext('PATCH', query, data[i].query, data[i].data, 'crud', ctx);
                await this.performValidationAuthorizationAndHooks(ctx, currentService, true);
                if(i % this.crudConfig.validationOptions.BATCH_VALIDATION_YIELD_RATE === 0){
                    await setImmediate(); // allow other requests to be processed
                }
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
        const userId = ctx.user[this.crudConfig.id_field];
        if(!userId){
            throw new UnauthorizedException("User not found.");
        }
        const ret: LoginResponseDto = { userId };
        const userRole = this.crudAuthorization.getUserRole(ctx.user);
        if(this.crudConfig.authenticationOptions.renewJwt && !userRole.noTokenRefresh && !ctx?.user?.noTokenRefresh){
            const totalSec = (ctx.jwtPayload.exp - ctx.jwtPayload.iat);
            const elapsedMs = new Date().getTime() - (ctx.jwtPayload.iat * 1000);
            const thresholdMs = (totalSec * 1000 * this.reciprocal20percent); // 20% of total time
            if(elapsedMs >= thresholdMs){
                const newToken = await this.crudAuthService.signTokenForUser(ctx.user, totalSec);
                ret.accessToken = newToken;
                ret.refreshTokenSec = totalSec;
            }
        }
        return ret as LoginResponseDto;
    }


    @Post('auth')
    async login(@Body(new CrudValidationPipe()) data: LoginDto, @Context() ctx: CrudContext) {

        const lastLogingAttempt: Date = this.userLastLoginAttemptMap.get(data.email);
        const now = new Date();
        if (lastLogingAttempt && _utils.diffBetweenDatesMs(now, lastLogingAttempt) < this.crudConfig.authenticationOptions.minTimeBetweenLoginAttempsMs) {
            throw new HttpException({
                statusCode: 425,
                error: 'Too early',
                message: CrudErrors.TOO_MANY_LOGIN_ATTEMPTS.str(),
            }, 425);
        }

        this.userLastLoginAttemptMap.set(data.email, now);

        const ALLOWED_JWT_EXPIRES_IN =this.crudConfig.authenticationOptions.ALLOWED_JWT_EXPIRES_IN;
        if (data.expiresIn && !ALLOWED_JWT_EXPIRES_IN.includes(data.expiresIn)) {
            throw new BadRequestException("Invalid expiresIn: " + data.expiresIn + " allowed: " + ALLOWED_JWT_EXPIRES_IN.join(', '));
        }

        if (data.password?.length > this.crudConfig.authenticationOptions.PASSWORD_MAX_LENGTH) {
            throw new UnauthorizedException(CrudErrors.PASSWORD_TOO_LONG.str());
        }

        return this.crudConfig.userService.$signIn(ctx, data.email, data.password, data.expiresIn, data.twoFA_code);
    }

    async performValidationAuthorizationAndHooks(ctx: CrudContext, currentService: CrudService<any>, skipBeforeHooks = false) {
        await this.validate(ctx, currentService);
        await this.crudAuthorization.authorize(ctx, currentService.security);
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
            } else if (ctx.method == 'PATCH') {
                dataClass = currentService.entity;
                queryClass = currentService.entity;
            } else if (ctx.method == 'GET' || ctx.method == 'DELETE') {
                queryClass = currentService.entity;
            }
        } else if (ctx.origin == 'cmd') {
            const cmdSecurity: CmdSecurity = currentService.security?.cmdSecurityMap?.[ctx.cmdName];
            queryClass = null;
            if(!cmdSecurity?.dto){
                throw new Error("dto missing for cmd: " + ctx.cmdName);
            }
            dataClass = cmdSecurity.dto;
        }
        const crudTransformer = new CrudTransformer(this, ctx);
        if (queryClass) {
            await crudTransformer.transform(ctx.query, queryClass);
            const newObj = { ...ctx.query };
            await crudTransformer.transformTypes(newObj, queryClass);
            Object.setPrototypeOf(newObj, queryClass.prototype);
            await crudTransformer.validateOrReject(newObj, true, 'Query:');
        }
        if (dataClass) {
            await crudTransformer.transform(ctx.data, dataClass);
            const newObj = { ...ctx.data };
            await crudTransformer.transformTypes(newObj, dataClass);
            Object.setPrototypeOf(newObj, dataClass.prototype);
            await crudTransformer.validateOrReject(newObj, !dataDefaultValues, 'Data:');
        }

    }



    addCountToCmdMap(ctx: CrudContext, ct) {
        if (this.crudConfig.userService.notGuest(ctx?.user)) {
            const increments = {['cmdUserCountMap.' + ctx.serviceName + '_' + ctx.cmdName]: ct}
            const query = { [this.crudConfig.id_field]: ctx.user[this.crudConfig.id_field] };
            this.crudConfig.userService.$unsecure_incPatch({ query, increments }, ctx);
        }
    }

    addCountToDataMap(ctx: CrudContext, ct: number) {
        if (this.crudConfig.userService.notGuest(ctx?.user)) {

            const increments = {['crudUserCountMap.' + ctx.serviceName]: ct}
            const query = { [this.crudConfig.id_field]: ctx.user[this.crudConfig.id_field] };
            this.crudConfig.userService.$unsecure_incPatch({ query, increments }, ctx);

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

    @Patch('backdoor')
    async backdoor(@Query(new CrudValidationPipe({skipValidation: true})) query: BackdoorQuery, @Body() data, @Context() backdoorCtx: CrudContext) {
        if(!backdoorCtx.backdoorGuarded){
            throw new UnauthorizedException("Backdoor not guarded : (something is wrong with your auth guard.)");
        }
        for(const i of query.undefinedArgs || []){
            data.args[i] = undefined;
        }
        const ctx: CrudContext = query.ctxPos ? (data.args[query.ctxPos] || {}) : {};
        const inheritance = query.inheritancePos ? data.args[query.inheritancePos] : null;
        ctx.currentMs = MicroServicesOptions.getCurrentService();
        try {
            const currentService = this.crudConfig.servicesMap[query.service];
            if(!currentService[query.methodName]){
                throw new BadRequestException("Backdoor method not found: " + query.methodName);
            }
            await this.crudConfig.beforeBackdoorHook(ctx);
            const res = await currentService[query.methodName](...data.args);
            await this.crudConfig.afterBackdoorHook(res, ctx);
            return res
        } catch (e) {
            await this.crudConfig.errorBackdoorHook(e, ctx);
            throw e;
        }
    }

    @Get('rdy')
    async ready() {
        return true;
    }


}
