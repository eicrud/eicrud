import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { CrudService } from '../crud/crud.service';
import { Log, LogType } from './entities/log';
import { NotificationsService } from '../notifications/notifications.service';
import { EntityManager, EntityName, wrap } from '@mikro-orm/core';
import { caching } from 'cache-manager';
import { CrudConfigService } from '../crud/crud.config.service';
import { CrudSecurity } from '../crud/model/CrudSecurity';
import { CrudContext } from '../crud/model/CrudContext';
import { ModuleRef } from '@nestjs/core';

export const logSecurity: CrudSecurity = {
    maxItemsInDb: 50000,
}
@Injectable()
export class LogService extends CrudService<Log> {

    protected crudConfig: CrudConfigService;
    
    constructor(
        protected moduleRef: ModuleRef,
        private readonly notificationService: NotificationsService,
        ){
        super(moduleRef.get('CRUD_CONFIG'), Log, logSecurity);
    }

    async log(type: LogType, message: string, ctx: CrudContext, level: number = 1){
        const log = new Log();
        log.type = type;
        log.message = message;
        log.serviceName = ctx.serviceName;
        log.userId = ctx.userId;
        log.cmdName = ctx.cmdName;
        log.level = level;
        try {
            await this.notificationService?.checkNotification(log);
        } catch (error) {
            log.failNotif = true;
        }
        return this.create(log, null);
    }

    override async create(newEntity: Log, context: CrudContext): Promise<any> {
 
        let res = newEntity;
        
        if(newEntity.type?.includes[LogType.CRITICAL, LogType.ERROR, LogType.SECURITY]) {
            res = await super.create(newEntity, context);
        }
        
        switch (newEntity.type) {
            case LogType.CRITICAL:
            case LogType.ERROR:
                console.error(newEntity.message);
                break;
            case LogType.SECURITY:
            case LogType.WARNING:
                console.warn(newEntity.message);
                break;
            case LogType.DEBUG:
                console.debug(newEntity.message);
                break;
            default:
            case LogType.INFO:
                console.log(newEntity.message);
                break;
        }
        
        return res;
    }


}
