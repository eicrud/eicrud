import { Injectable } from '@nestjs/common';
import { CrudService } from '../crud/crud.service';
import { Log, LogType } from './entities/log';
import { NotificationsService } from '../notifications/notifications.service';
import { EntityManager, EntityName, wrap } from '@mikro-orm/core';
import { caching } from 'cache-manager';
import { CrudContext } from '../auth/auth.utils';


@Injectable()
export class LogService extends CrudService<Log> {
    
    constructor(private readonly notificationService: NotificationsService,
        protected readonly entityManager: EntityManager,
        ){
        super(Log, entityManager, caching );
    }

    log(type: LogType, serviceName: string,  message: string){
        const log = new Log();
        log.type = type;
        log.message = message;
        log.level = 1;
        log.serviceName = serviceName;
        return this.create(log, null);
    }

    override async create(newEntity: Log, context: CrudContext): Promise<any> {
        try {
            await this.notificationService.checkNotification(newEntity);
        } catch (error) {
            newEntity.failNotif = true;
        }
        let res = newEntity;
        
        if(newEntity.type != LogType.DEBUG) {
            res = await super.create(newEntity, context);
        }
        
        switch (newEntity.type) {
            case LogType.ERROR:
                console.error(newEntity.message);
                break;
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
