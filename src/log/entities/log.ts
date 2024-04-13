import { CrudEntity } from "../../crud/model/CrudEntity";

export enum LogType {
    INFO = "INFO",
    WARNING = "WARNING",
    ERROR = "ERROR",
    DEBUG = "DEBUG",
}

export class Log extends CrudEntity {

    level: number = 1;
    type: LogType = LogType.INFO;
    message: string;
    data: string;
    serviceName: string;
    userId: string;
    userEmail: string;
    failNotif = false;

}