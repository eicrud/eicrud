import { EntityManager } from '@mikro-orm/core';
import { CrudOptions } from '../../crud/model/CrudOptions';
import { CrudUser } from '../../config/model/CrudUser';
import { CrudSecurity } from '../../config/model/CrudSecurity';
import { CrudConfigService } from '../../config/crud.config.service';
import { CrudService } from '../crud.service';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthType, CrudToken, JwtPayload } from '../../authentication';
import { FindOptions } from '@mikro-orm/core';

export interface CrudOptionsType<T = any>
  extends CrudOptions<T>,
    Omit<FindOptions<any>, keyof CrudOptions> {}

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
  queryOptions?: CrudOptionsType<T>;
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

  /**
   * Like store, but is also propagated back to the caller in ms-links;
   * @UsageNotes If you need to propagate data back to the original controller, regardless of the current MS.
   */
  store_bidirectional?: Record<string, any>;

  /**
   * Also bidirectional, use to set cookie in the caller HTTP response
   */
  setCookies?: Record<string, CookieToSet>;
  getCurrentService?: () => CrudService<any>;
  getHttpRequest?: () => FastifyRequest;
  getHttpResponse?: () => FastifyReply;
  authToken?: CrudToken;
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
