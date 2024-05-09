import { Injectable } from '@nestjs/common';
import { Log, LogType } from '../log/entities/log';


//Min level for the log to be sent as a notification
export const LogNotificationMap = {
    [LogType.INFO] : 3,
    [LogType.WARNING]: 2,
    [LogType.ERROR]: 2,
    [LogType.DEBUG]: 99,
    [LogType.SECURITY]: 2,
    [LogType.CRITICAL]: 1,
}

@Injectable()
export class NotificationsService {
    checkNotification(newEntity: Log) {
        if(newEntity.level >= LogNotificationMap[newEntity.type]) {
            return this.sendNotification(newEntity);
        }
    }
    sendNotification(newEntity: Log) {
        throw new Error('Method not implemented.');
    }
}
