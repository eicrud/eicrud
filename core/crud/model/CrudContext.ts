import { EntityManager } from '@mikro-orm/core';
import { CrudOptions } from '../../crud/model/CrudOptions';
import { CrudUser } from '../../config/model/CrudUser';
import { CrudSecurity } from '../../config/model/CrudSecurity';
import { CrudConfigService } from '../../config/crud.config.service';
import { CrudService } from '../crud.service';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthType, JwtPayload } from '../../authentication';
import { FindOptions } from '@mikro-orm/core';

type CrudOptionType<T = any> = CrudOptions<T> &
  Omit<FindOptions<any>, keyof CrudOptions>;

/**
 * A context assigned to every request.
 */
export interface CrudContext<T = any> {
  isBatch?: boolean;
  serviceName?: string;
  user?: CrudUser;
  userId?: string;
  userTrust?: number;
  method?: 'POST' | 'GET' | 'PATCH' | 'DELETE';
  authType?: AuthType;
  query?: any;
  data?: any;
  origin?: 'crud' | 'cmd' | 'webhook' | string;
  options?: CrudOptionType<T>;
  cmdName?: string;
  ids?: string[];
  ip?: string;
  jwtPayload?: JwtPayload;
  url?: string;
  currentMs?: string;
  msLinkGuarded?: boolean;
  /**
   * Temp object that will not be serialized to ms-links, set to {} for every request
   * @UsageNotes You can use it to cache data during authorization process (useful for batch operations)
   * @type {Record<string, any>}
   */
  _temp?: Record<string, any>;

  /**
   * Store for your application logic, set to {} for every request
   * @UsageNotes You can use it to cache data between hooks, it will be serialized to ms-links,
   * best practice is to use a unique key to store your data
   */
  store?: Record<string, any>;

  setCookies?: Record<string, CookieToSet>;
  getCurrentService?: () => CrudService<any>;
  getHttpRequest?: () => FastifyRequest;
  getHttpResponse?: () => FastifyReply;
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
