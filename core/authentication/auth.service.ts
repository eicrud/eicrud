import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { _utils } from '../utils';
import {
  CRUD_CONFIG_KEY,
  CrudConfigService,
} from '../config/crud.config.service';
import { ModuleRef } from '@nestjs/core';
import { CrudAuthGuard } from './auth.guard';
import { CrudContext, CrudEntity, CrudService } from '../crud';
import * as crypto from 'crypto';
import { CrudUser } from '../config';
import { getEntityId } from '@eicrud/shared/utils';

export interface CrudToken extends CrudEntity {
  user: CrudUser | string;
  token: string;
  expiresAt?: Date;
}

type TokenServiceLike = {
  $findOne(query: any, ctx: any): Promise<CrudToken>;
  // other essential CrudService methods you need
} & CrudService<any>;

export class AuthenticationOptions {
  saltRounds = 11;
  saltRoundsAdmin = 14;
  verificationEmailTimeoutHours = 24;
  twoFaEmailTimeoutMinutes = 15;
  passwordResetEmailTimeoutHours = 6;
  passwordMaxLength = 64;
  userFieldsInJwtPayload = ['rvkd'];
  fieldsThatResetRevokedCount = ['password', 'email'];
  username_field = 'email';
  renewJwt = false;
  minTimeBetweenLoginAttempsMs: number = 600;
  maxJwtexpiresInSec = 60 * 60 * 24 * 30;
  extractUserOnRoutes: string[] = [];
  resetTokenLength: number = 17;
  tokenService?: TokenServiceLike;
}

@Injectable()
export class CrudAuthService {
  protected JWT_SECRET: string;
  protected CSRF_SECRET: string;
  protected FIELDS_IN_PAYLOAD: string[] = ['rvkd'];
  protected username_field = 'email';
  protected crudConfig: CrudConfigService;
  protected tokenService?: CrudService<CrudToken>;

  _authGuard: CrudAuthGuard;

  constructor(
    protected jwtService: JwtService,
    protected moduleRef: ModuleRef,
  ) {}
  async onModuleInit() {
    this.crudConfig = this.moduleRef.get(CRUD_CONFIG_KEY, { strict: false });
    this.JWT_SECRET = await _utils.deriveSecretKey(
      this.crudConfig.JWT_SECRET,
      'eicrud-jwt',
    );
    this.CSRF_SECRET = await _utils.deriveSecretKey(
      this.JWT_SECRET,
      'eicrud-csrf',
    );
    this.FIELDS_IN_PAYLOAD =
      this.crudConfig.authenticationOptions.userFieldsInJwtPayload;
    this.FIELDS_IN_PAYLOAD.push(this.crudConfig.id_field);
    if (!this.FIELDS_IN_PAYLOAD.includes('rvkd')) {
      this.FIELDS_IN_PAYLOAD.push('rvkd');
    }
    this.username_field = this.crudConfig.authenticationOptions.username_field;
    if (
      !this.crudConfig.authenticationOptions.fieldsThatResetRevokedCount?.includes(
        this.username_field,
      )
    ) {
      this.crudConfig.authenticationOptions.fieldsThatResetRevokedCount.push(
        this.username_field,
      );
    }
    this.tokenService = this.crudConfig.authenticationOptions.tokenService;
    if (this.tokenService) {
      this.tokenService.cacheField = 'token';
    }
  }

  hmacCSRFToken(token) {
    return crypto
      .createHmac('sha256', this.CSRF_SECRET)
      .update(token)
      .digest('hex');
  }

  async signTokenForUser(
    ctx: CrudContext,
    user,
    expiresInSec?: number,
    addToPayload = {},
  ) {
    let payload = {};
    this.FIELDS_IN_PAYLOAD.forEach((field) => {
      payload[field] = user[field];
    });
    payload = { ...payload, ...addToPayload };
    let csrf;
    if (ctx && ctx.queryOptions?.jwtCookie) {
      csrf = await _utils.generateRandomString(16);
      payload['csrf'] = csrf;
    }
    const expiresIn = expiresInSec === -1 ? undefined : expiresInSec || 60 * 30;
    let token = await this.jwtService.signAsync(payload, {
      secret: this.JWT_SECRET,
      expiresIn,
    });
    if (ctx && ctx.queryOptions?.jwtCookie) {
      ctx.setCookies = ctx.setCookies || {};
      ctx.setCookies['eicrud-jwt'] = {
        value: token,
        httpOnly: true,
        secure: true,
        path: '/',
      };
      const csrf_token = this.hmacCSRFToken(csrf);
      ctx.setCookies['eicrud-csrf'] = {
        value: csrf_token,
        secure: true,
        path: '/',
      };
      if (expiresInSec) {
        ctx.setCookies['eicrud-jwt'].maxAge = expiresInSec;
        ctx.setCookies['eicrud-csrf'].maxAge = expiresInSec;
      }
      token = token + '#' + csrf; // append csrf to token returned
    }
    return token;
  }
  async extractUserFromToken(
    token: any,
    crudContext: CrudContext<any>,
    cachedUser: boolean,
  ): Promise<CrudUser> {
    if (!this.tokenService) {
      throw new Error('Token service not configured');
    }
    const dbToken = cachedUser
      ? await this.tokenService.$findOneCached({ token }, crudContext)
      : await this.tokenService.$findOne({ token }, crudContext);
    if (!dbToken) {
      throw new UnauthorizedException('Invalid token');
    }
    if (dbToken.expiresAt && new Date(dbToken.expiresAt) <= new Date()) {
      throw new UnauthorizedException('Token expired');
    }
    const userId = getEntityId(dbToken.user, this.crudConfig.id_field);
    const user = cachedUser
      ? await this.crudConfig.userService.$findOneCached(
          { [this.crudConfig.id_field]: userId },
          crudContext,
        )
      : await this.crudConfig.userService.$findOne(
          { [this.crudConfig.id_field]: userId },
          crudContext,
        );
    if (!user) {
      throw new UnauthorizedException('Token user not found');
    }
    crudContext.authToken = dbToken;
    return user;
  }

  async getJwtPayload(token: string) {
    try {
      const res = await this.jwtService.verifyAsync(token, {
        secret: this.JWT_SECRET,
      });
      return res;
    } catch (e) {
      throw new UnauthorizedException(e.message);
    }
  }
}
