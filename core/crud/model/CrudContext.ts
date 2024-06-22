import { EntityManager } from '@mikro-orm/core';
import { CrudOptions } from '../../crud/model/CrudOptions';
import { CrudUser } from '../../config/model/CrudUser';
import { CrudSecurity } from '../../config/model/CrudSecurity';
import { CrudConfigService } from '../../config/crud.config.service';
import { CrudService } from '../crud.service';

/**
 * A context assigned to every request.
 */
export interface CrudContext {
  isBatch?: boolean;
  serviceName?: string;
  user?: CrudUser;
  userId?: string;
  userTrust?: number;
  method?: string;
  query?: any;
  data?: any;
  origin?: 'crud' | 'cmd' | 'webhook' | string;
  options?: CrudOptions;
  cmdName?: string;
  ids?: string[];
  ip?: string;
  jwtPayload?: any;
  url?: string;
  currentMs?: string;
  backdoorGuarded?: boolean;
  /**
   * Temp object that will not be serialized to backdoors, set to {} for every request
   * @UsageNotes You can use it to cache data during authorization process (useful for batch operations)
   * @type {object}
   */
  _temp?: object;

  setCookies?: Record<string, CookieToSet>;
  getCurrentService?: () => CrudService<any>;
  getHttpRequest?: () => any;
  getHttpResponse?: () => any;
}

export interface CookieToSet {
  value: string;
  httpOnly?: boolean;
  secure?: boolean;
  signed?: boolean;
  maxAge?: number;
  path?: string;
  // any other cookie options
  [key: string]: any;
}
