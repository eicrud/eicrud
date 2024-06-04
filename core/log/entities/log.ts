import { CrudEntity } from '../../crud/model/CrudEntity';

export enum LogType {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  SECURITY = 'SECURITY',
  CRITICAL = 'CRITICAL',
}

export class Log implements CrudEntity {
  type: LogType = LogType.INFO;
  message: string;
  data: string;
  query: string;
  serviceName: string;
  cmdName?: string;
  userId: string;
  failNotif = false;

  createdAt: Date;
  updatedAt: Date;
  level: number;
}
