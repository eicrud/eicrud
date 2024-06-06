import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
let wildcard = require('wildcard');

import { CrudContext } from '../crud/model/CrudContext';

import { CrudUser } from '../config/model/CrudUser';

import { Cron, CronExpression } from '@nestjs/schedule';
import {
  CRUD_CONFIG_KEY,
  CrudConfigService,
  MicroServicesOptions,
} from '../config/crud.config.service';
import { LogType } from '../log/entities/log';
import { CrudErrors } from '@eicrud/shared/CrudErrors';
import { CrudOptions } from '../crud/model/CrudOptions';
import { CrudRole } from '../config/model/CrudRole';
import { CrudAuthService } from './auth.service';
import { ModuleRef } from '@nestjs/core';
import { LRUCache } from 'mnemonist';
import { Mutex } from 'async-mutex';
import { CrudAuthorizationService } from '../crud/crud.authorization.service';

export interface TrafficCache {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<any>;
  inc: (key: string, increment: number, currentValue: number) => Promise<any>;
  clear?: () => Promise<any>;
}

export class BasicTrafficCache implements TrafficCache {
  cache: LRUCache<string, number>;
  mutex = new Mutex();

  constructor(size = 10000) {
    this.cache = new LRUCache(size);
  }
  async inc(key: string, increment: number, currentValue: number) {
    const release = await this.mutex.acquire();
    let res;
    try {
      const current = (await this.get(key)) || 0;
      res = await this.cache.set(key, current + increment);
    } finally {
      release();
    }
    return res;
  }

  async get(key: string) {
    return this.cache.get(key);
  }

  async set(key: string, value: any) {
    const release = await this.mutex.acquire();
    let res;
    try {
      res = await this.cache.set(key, value);
    } finally {
      release();
    }
    return res;
  }

  async clear() {
    return this.cache.clear();
  }
}

export class WatchTrafficOptions {
  maxTrackedUsers: number = 10000;

  maxTrackedIPs: number = 10000;

  userRequestsThreshold: number = 350;

  ipRequestsThreshold: number = 700;

  totalTimeoutThreshold: number = 5;

  timeoutDurationMinutes: number = 15;

  useForwardedIp: boolean = false;
  ddosProtection: boolean = false;

  userTrafficProtection: boolean = true;

  userTrafficCache: TrafficCache = null;
  ipTrafficCache: TrafficCache = null;
  ipTimeoutCache: TrafficCache = null;
}

@Injectable()
export class CrudAuthGuard implements CanActivate {
  userTrafficCache: TrafficCache;
  ipTrafficCache: TrafficCache;
  ipTimeoutCache: TrafficCache;

  reciprocalRequestThreshold: number;

  protected crudConfig: CrudConfigService;
  authorizationService: CrudAuthorizationService;

  @Cron(CronExpression.EVERY_5_MINUTES)
  handleCron() {
    this.userTrafficCache.clear?.();
    this.ipTrafficCache.clear?.();
  }

  constructor(
    protected moduleRef: ModuleRef,
    protected authService: CrudAuthService,
  ) {
    this.authService._authGuard = this;
  }

  onModuleInit() {
    this.crudConfig = this.moduleRef.get(CRUD_CONFIG_KEY, { strict: false });
    const { watchTrafficOptions } = this.crudConfig;
    this.userTrafficCache =
      watchTrafficOptions.userTrafficCache ||
      new BasicTrafficCache(watchTrafficOptions.maxTrackedUsers);
    this.ipTrafficCache =
      watchTrafficOptions.ipTrafficCache ||
      new BasicTrafficCache(watchTrafficOptions.maxTrackedIPs);
    this.ipTimeoutCache =
      watchTrafficOptions.ipTimeoutCache ||
      new BasicTrafficCache(watchTrafficOptions.maxTrackedIPs);

    this.reciprocalRequestThreshold =
      1 / this.crudConfig.watchTrafficOptions.userRequestsThreshold;

    this.authorizationService = this.moduleRef.get(CrudAuthorizationService, {
      strict: false,
    });
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.crudConfig.isIsolated) {
      throw new BadRequestException('This instance is isolated.');
    }

    const request = ctx.switchToHttp().getRequest();
    const url = request.url;

    const ip = this.crudConfig.watchTrafficOptions.useForwardedIp
      ? request.headers['x-forwarded-for']
      : request.socket.remoteAddress;

    const msOptions = this.crudConfig.microServicesOptions;
    const currentMs = MicroServicesOptions.getCurrentService();

    const currentMsConfig = msOptions.microServices[currentMs];

    function getRequest() {
      return request;
    }

    const crudContext: CrudContext = { ip, url, currentMs, getRequest };

    if (url.includes('/crud/backdoor')) {
      if (!currentMsConfig) {
        throw new UnauthorizedException('Microservice not found.');
      } else if (currentMsConfig && !currentMsConfig.openBackDoor) {
        throw new UnauthorizedException('Backdoor is closed.');
      }
      const requiredUsername = currentMsConfig.username || msOptions.username;
      const requiredPassword = currentMsConfig.password || msOptions.password;
      const basicAuth = request.headers.authorization?.split(' ')[1];
      if (!basicAuth) {
        throw new UnauthorizedException(
          'No credentials provided for backdoor access.',
        );
      }
      const [username, password] = Buffer.from(basicAuth, 'base64')
        .toString()
        .split(':');
      if (username != requiredUsername || password != requiredPassword) {
        throw new UnauthorizedException('Invalid backdoor credentials.');
      }
      crudContext.backdoorGuarded = true;
      request['crudContext'] = crudContext;
      return true;
    } else if (url.includes('/crud')) {
      if (url.includes('/crud/rdy')) {
        return true;
      }
      if (currentMsConfig && !currentMsConfig.openController) {
        throw new UnauthorizedException('Controller is closed.');
      }
    }

    if (this.crudConfig.watchTrafficOptions.ddosProtection) {
      let timeout = await this.ipTimeoutCache.get(ip);
      if (timeout != undefined) {
        if (timeout > Date.now()) {
          this.addTrafficToIpTrafficMap(ip, true);
          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              error: 'Too Many Requests',
              message: `Your IP (${ip}) is timed out.`,
            },
            429,
          );
        }
      }
      this.addTrafficToIpTrafficMap(ip);
    }

    const token = this.extractTokenFromHeader(request);
    let user: Partial<CrudUser> = { role: this.crudConfig.guest_role };
    let userId;
    const options: CrudOptions = request.query?.query?.options || {};
    if (token && this.extractUserCheck(url)) {
      const payload = await this.authService.getJwtPayload(token);
      crudContext.jwtPayload = payload;
      const query = {
        [this.crudConfig.id_field]: payload[this.crudConfig.id_field],
      };
      if (request.method == 'POST') {
        user = (await this.crudConfig.userService.$findOne(
          query,
          crudContext,
        )) as any;
      } else {
        user = await this.crudConfig.userService.$findOneCached(
          query,
          crudContext,
        );
      }

      if (!user) {
        throw new UnauthorizedException(CrudErrors.USER_NOT_FOUND.str());
      }
      let timeout = user?.timeout ? new Date(user.timeout) : null;
      if (timeout && timeout > new Date()) {
        throw new UnauthorizedException(
          CrudErrors.TIMED_OUT.str(timeout.toISOString()),
        );
      }

      const role: CrudRole = this.crudConfig?.rolesMap[user?.role];

      if (user?.rvkd != payload.rvkd) {
        throw new UnauthorizedException(CrudErrors.TOKEN_MISMATCH.str());
      }

      if (
        user?.captchaRequested &&
        !user?.didCaptcha &&
        this.crudConfig.captchaService &&
        !url.includes('/crud/s/' + this.crudConfig.captchaService)
      ) {
        throw new UnauthorizedException(CrudErrors.CAPTCHA_REQUIRED.str());
      }

      userId = user?.[this.crudConfig.id_field]?.toString();

      if (options.mockRole && typeof options.mockRole == 'string' && role) {
        const parents = this.crudConfig
          .getParentRolesRecurs(role)
          .map((role) => role.name);
        parents.push(role.name);
        if (!parents.includes(options.mockRole)) {
          throw new UnauthorizedException(
            `Role ${role.name} is not allowed to mock as ${options.mockRole}`,
          );
        }
        user.role = options.mockRole;
      }

      if (this.crudConfig.watchTrafficOptions.userTrafficProtection) {
        this.addTrafficToUserTrafficMap(userId, user, ip, crudContext);
      }
    }

    crudContext.user = user as any;
    crudContext.userId = userId;
    if (!token) {
      crudContext.userTrust = 0;
    }
    request['crudContext'] = crudContext;
    return true;
  }
  extractUserCheck(url: any) {
    if (url.includes('/crud')) {
      return true;
    }
    for (const routeWildCard of this.crudConfig.authenticationOptions
      .extractUserOnRoutes) {
      if (wildcard(routeWildCard, url)) {
        return true;
      }
    }
    return false;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  async addTrafficToIpTrafficMap(ip: string, silent = false) {
    let traffic = await this.ipTrafficCache.get(ip);
    if (traffic === undefined) {
      traffic = 0;
    }
    if (traffic > this.crudConfig.watchTrafficOptions.ipRequestsThreshold) {
      if (!silent) {
        this.crudConfig.logService?.log(
          LogType.SECURITY,
          `High traffic event for ip with ${traffic} requests.`,
          { ip } as CrudContext,
        );
      }
      const timeout_end =
        Date.now() +
        this.crudConfig.watchTrafficOptions.timeoutDurationMinutes * 60 * 1000;
      this.ipTimeoutCache.set(ip, timeout_end);
      return true;
    }
    this.ipTrafficCache.inc(ip, 1, traffic);
    return false;
  }

  async addTrafficToUserTrafficMap(
    userId,
    user: Partial<CrudUser>,
    ip,
    ctx: CrudContext,
  ) {
    let traffic = await this.userTrafficCache.get(userId);
    if (traffic === undefined) {
      traffic = 0;
    }
    const userRole = this.authorizationService.getUserRole(user as any);
    const multiplier = userRole?.allowedTrafficMultiplier || 1;
    if (
      traffic >=
      this.crudConfig.watchTrafficOptions.userRequestsThreshold * multiplier
    ) {
      const query: any = { [this.crudConfig.id_field]: userId };

      if (ctx.method != 'POST') {
        user = await this.crudConfig.userService.$findOne(query, ctx);
      }

      user.highTrafficCount = user.highTrafficCount || 0;
      let count;
      if (multiplier > 1) {
        count =
          traffic /
          (this.crudConfig.watchTrafficOptions.userRequestsThreshold *
            multiplier);
      } else {
        count = traffic * this.reciprocalRequestThreshold;
      }
      const increment = Math.round(count);

      let addPatch: any = {};
      if (
        user.highTrafficCount >=
        this.crudConfig.watchTrafficOptions.totalTimeoutThreshold
      ) {
        this.crudConfig.userService.addTimeoutToUser(
          user as CrudUser,
          this.crudConfig.watchTrafficOptions.timeoutDurationMinutes,
        );
        addPatch.timeout = user.timeout;
        addPatch.timeoutCount = user.timeoutCount;
      }
      user.captchaRequested = true;
      addPatch.captchaRequested = true;
      user.highTrafficCount = user.highTrafficCount + increment;
      const increments = { highTrafficCount: increment };

      this.crudConfig.userService.$unsecure_incPatch(
        { query, increments, addPatch },
        ctx,
      );

      this.crudConfig.userService.$setCached(user, ctx);
      this.crudConfig.logService?.log(
        LogType.SECURITY,
        `High traffic event for user ${userId} with ${traffic} requests.`,
        { userId, user, ip } as CrudContext,
      );
      this.crudConfig.onHighTrafficEvent(traffic, user, ctx);
      traffic = 0;
      this.userTrafficCache.set(userId, 0);
    } else {
      this.userTrafficCache.inc(userId, 1, traffic);
    }
  }
}
